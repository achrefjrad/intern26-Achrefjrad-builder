import json
import re
from unittest.mock import patch

import requests
from django.test import TestCase

from .ai_service import (
    normalize_order_state,
    apply_order_message,
    get_next_missing_field,
    build_order_details,
    handle_chat_message,
    build_reply_action,
    reply_requires_catalog,
)
from .models import Order, OrderLine, Project, Category, Product
from api.prompts import CHATBOT_SYSTEM_PROMPT
from api.services.chatbot.intent import INTENT_SYSTEM_PROMPT, detect_intent, _parse_intent_response
from api.services.chatbot.language import (
    LANGUAGE_SYSTEM_PROMPT,
    DEFAULT_LANGUAGE,
    detect_language,
    _parse_language_response,
    is_data_only_message,
    is_language_bearing_message,
    pick_language_source_message,
)
from api.services.chatbot.handler import build_reply_style_examples, _REPLY_STYLE_EXAMPLES, _CATALOG_AUTHORITY
from api.services.llm.huggingface import call_huggingface
from api.services.site_generation import generate_config

CATALOG = [
    {
        "name": "Légumes",
        "products": [
            {"name": "Champignons", "price": "3.50 €", "stock": 10},
            {"name": "Tomates", "price": "2.00 €", "stock": 5},
        ],
    }
]


def _language_result(**overrides):
    base = {"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False}
    base.update(overrides)
    return json.dumps(base)


def _chat_llm_factory(*, intent=None, language=None, reply=None, default_product="Champignons"):
    """Mock du LLM qui répond selon le type de prompt (intention / langue / reply)."""
    def factory(messages, **_kwargs):
        system = messages[0]["content"]
        if system == INTENT_SYSTEM_PROMPT:
            if intent is not None:
                return intent
            return json.dumps({"intent": "start_order", "product_name": default_product, "quantity": 1})
        if "détecteur de langue" in system:
            return language if language is not None else _language_result()
        return reply if reply is not None else json.dumps(
            {"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False
        )
    return factory


def _reply_call(calls):
    """Retourne l'appel de génération de réponse (prompt 'assistant de vente virtuel')."""
    for messages in calls:
        if "assistant de vente virtuel" in messages[0]["content"]:
            return messages
    return None


class OrderStateMachineTests(TestCase):
    def test_product_first(self):
        state = apply_order_message({}, "Bonjour, je souhaite commander Champignons", CATALOG)
        self.assertEqual(state.get("product_name"), "Champignons")
        self.assertEqual(get_next_missing_field(state)[0], "name")

    def test_single_word_name(self):
        state = apply_order_message({"product_name": "Champignons"}, "Ali", CATALOG)
        self.assertEqual(state.get("name"), "Ali")

    def test_two_word_name(self):
        state = apply_order_message({"product_name": "Champignons"}, "aded djja", CATALOG)
        self.assertEqual(state.get("name"), "aded djja")
        self.assertEqual(get_next_missing_field(state)[0], "phone")

    def test_accented_name(self):
        state = apply_order_message({"product_name": "Champignons"}, "Dédé Djja", CATALOG)
        self.assertEqual(state.get("name"), "Dédé Djja")

    def test_name_then_phone_then_address(self):
        state = apply_order_message({"product_name": "Champignons", "name": "aded djja"}, "22123456", CATALOG)
        self.assertEqual(state.get("phone"), "22123456")
        self.assertEqual(get_next_missing_field(state)[0], "address")
        state = apply_order_message(state, "12 rue de Tunis, Sfax", CATALOG)
        self.assertEqual(state.get("address"), "12 rue de Tunis, Sfax")
        self.assertEqual(get_next_missing_field(state)[0], "email")

    def test_multiple_info_one_message(self):
        state = apply_order_message({"product_name": "Champignons"}, "aded djja 22123456", CATALOG)
        self.assertEqual(state.get("name"), "aded djja")
        self.assertEqual(state.get("phone"), "22123456")

    def test_name_correction(self):
        state = apply_order_message({"product_name": "Champignons", "name": "aded djja"}, "non c'est Aded Ben Djja", CATALOG)
        self.assertEqual(state.get("name"), "Aded Ben Djja")

    def test_quantity_change_not_assigned_to_phone(self):
        state = apply_order_message({"product_name": "Champignons", "name": "aded djja"}, "finalement je veux 2 champignons", CATALOG)
        self.assertEqual(state.get("quantity"), 2)
        self.assertFalse(state.get("phone"))
        self.assertEqual(get_next_missing_field(state)[0], "phone")

    def test_product_change(self):
        state = apply_order_message({"product_name": "Champignons", "name": "aded djja"}, "finalement je veux des tomates", CATALOG)
        self.assertEqual(state.get("product_name"), "Tomates")

    def test_unrelated_sentence_while_waiting_phone(self):
        state = apply_order_message({"product_name": "Champignons", "name": "aded djja"}, "il fait beau aujourd'hui", CATALOG)
        self.assertFalse(state.get("phone"))
        self.assertEqual(get_next_missing_field(state)[0], "phone")

    def test_full_order_ready(self):
        state = apply_order_message({"product_name": "Champignons"}, "aded djja", CATALOG)
        state = apply_order_message(state, "22123456", CATALOG)
        state = apply_order_message(state, "12 rue de Tunis", CATALOG)
        state = apply_order_message(state, "ade@exemple.com", CATALOG)
        self.assertIsNone(get_next_missing_field(state)[0])

    def test_legacy_first_last_normalized(self):
        state = normalize_order_state(
            {"product_name": "Champignons", "first_name": "Aded", "last_name": "Djja"}
        )
        self.assertEqual(state.get("name"), "Aded Djja")

    def test_build_details_canonical_name_and_quantity(self):
        details = build_order_details(
            {
                "product_name": "Champignons",
                "name": "Aded Ben Djja",
                "phone": "22123456",
                "address": "12 rue de Tunis",
                "email": "ade@exemple.com",
                "quantity": 2,
            }
        )
        self.assertEqual(details.get("name"), "Aded Ben Djja")
        self.assertNotIn("first_name", details)
        self.assertEqual(details.get("quantity"), 2)


class HandleChatMessageDeterministicTests(TestCase):
    _FAKE_CONTENT = json.dumps(
        {
            "reply": "Merci ! Quel est votre numéro de téléphone ?",
            "order_ready": False,
            "order_details": {"name": "FAUX-NOM-LLM"},
        },
        ensure_ascii=False,
    )

    @patch("api.services.chatbot.handler._call_chatbot_llm")
    def test_state_is_authoritative_over_llm(self, mock_llm):
        mock_llm.return_value = self._FAKE_CONTENT
        result = handle_chat_message(
            "proj", CATALOG, [], "aded djja", {"product_name": "Champignons"}
        )
        # L'état déterministe écrase les order_details du LLM.
        self.assertEqual(result["order_details"].get("name"), "aded djja")
        self.assertEqual(result["order_details"].get("product_name"), "Champignons")
        self.assertIs(result["order_ready"], False)

    @patch("api.services.chatbot.handler._call_chatbot_llm")
    def test_order_ready_deterministic(self, mock_llm):
        mock_llm.return_value = self._FAKE_CONTENT
        result = handle_chat_message(
            "proj",
            CATALOG,
            [],
            "ade@exemple.com",
            {
                "product_name": "Champignons",
                "name": "aded djja",
                "phone": "22123456",
                "address": "12 rue de Tunis",
            },
        )
        self.assertIs(result["order_ready"], True)
        self.assertEqual(result["order_details"].get("email"), "ade@exemple.com")


class IntentParseTests(TestCase):
    def test_valid_intent(self):
        result = _parse_intent_response(
            '{"intent": "start_order", "product_name": "Toyota Corolla", "quantity": 2}'
        )
        self.assertEqual(result["intent"], "start_order")
        self.assertEqual(result["product_name"], "Toyota Corolla")
        self.assertEqual(result["quantity"], 2)

    def test_invalid_json_falls_back_to_other(self):
        result = _parse_intent_response("ceci n'est pas du json")
        self.assertEqual(result["intent"], "other")
        self.assertEqual(result["product_name"], "")
        self.assertIsNone(result["quantity"])

    def test_unknown_intent_falls_back_to_other(self):
        result = _parse_intent_response('{"intent": "flying_car", "product_name": "x"}')
        self.assertEqual(result["intent"], "other")

    def test_bad_quantity_ignored(self):
        result = _parse_intent_response('{"intent": "start_order", "quantity": "abc"}')
        self.assertIsNone(result["quantity"])

    def test_zero_quantity_ignored(self):
        result = _parse_intent_response('{"intent": "start_order", "quantity": 0}')
        self.assertIsNone(result["quantity"])

    def test_fenced_json_accepted(self):
        result = _parse_intent_response(
            '```json\n{"intent": "greeting", "product_name": "", "quantity": null}\n```'
        )
        self.assertEqual(result["intent"], "greeting")

    def test_dict_input_accepted(self):
        result = _parse_intent_response(
            {"intent": "cancel_order", "product_name": "", "quantity": None}
        )
        self.assertEqual(result["intent"], "cancel_order")


class MultilingualIntentTests(TestCase):
    # Messages de test : français, arabe (MSA), darija tunisien, arabizi et mélange.
    # Aucune phrase n'est codée en dur dans la logique : elles servent uniquement
    # à vérifier que le message brut est transmis au LLM et que le routage fonctionne.
    SAMPLES = [
        ("je voudrais passer une commande", "start_order"),
        ("نحب نعدي كوموند", "start_order"),
        ("قلبنا نشتري طماطم", "start_order"),
        ("n7eb n3adi commande", "start_order"),
        ("n7eb nechri Toyota Corolla", "start_order"),
        ("bonsoir", "greeting"),
        ("chkoun ya3ref wino l fromage", "product_search"),
        ("wesh alay l prix mte3 l tomates", "product_inquiry"),
    ]

    def test_detect_intent_uses_multilingual_prompt_and_raw_message(self):
        with patch("api.services.chatbot.handler._call_chatbot_llm") as mock_llm:
            mock_llm.return_value = '{"intent": "start_order", "product_name": "", "quantity": null}'
            for raw_message, _intent in self.SAMPLES:
                detect_intent(raw_message, mock_llm)
        calls = [call.args[0] for call in mock_llm.call_args_list]
        sent_messages = {messages[-1]["content"] for messages in calls}
        self.assertEqual(sent_messages, {msg for msg, _ in self.SAMPLES})
        for messages in calls:
            self.assertEqual(messages[0]["content"], INTENT_SYSTEM_PROMPT)

    def test_handle_chat_message_start_order_routing(self):
        intent_json = json.dumps(
            {"intent": "start_order", "product_name": "Toyota Corolla", "quantity": 2}
        )
        reply_json = json.dumps(
            {
                "reply": "Tayeb ! Shno ismek el kamel, 3aychek ?",
                "order_ready": False,
                "order_details": {},
            },
            ensure_ascii=False,
        )
        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=_chat_llm_factory(
            intent=intent_json,
            reply=reply_json,
        )):
            result = handle_chat_message("proj", CATALOG, [], "n7eb nechri Toyota Corolla", {})
        self.assertEqual(result["order_details"]["product_name"], "Toyota Corolla")
        self.assertEqual(result["order_details"]["quantity"], 2)
        self.assertIs(result["order_ready"], False)
        self.assertNotEqual(result["reply"], "")

    def test_start_order_without_product_keeps_flow_open(self):
        intent_json = json.dumps(
            {"intent": "start_order", "product_name": "", "quantity": None}
        )
        reply_json = json.dumps(
            {
                "reply": "Bien sûr ! Quel produit souhaitez-vous commander ?",
                "order_ready": False,
                "order_details": {},
            },
            ensure_ascii=False,
        )
        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=_chat_llm_factory(
            intent=intent_json,
            reply=reply_json,
        )):
            result = handle_chat_message("proj", CATALOG, [], "نحب نعدي كوموند", {})
        self.assertEqual(result["order_details"].get("product_name", ""), "")
        self.assertIs(result["order_ready"], False)

    def test_non_start_order_does_not_touch_state(self):
        intent_json = json.dumps(
            {"intent": "greeting", "product_name": "", "quantity": None}
        )
        reply_json = json.dumps(
            {"reply": "Bonjour !", "order_ready": False, "order_details": {}},
            ensure_ascii=False,
        )
        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=_chat_llm_factory(
            intent=intent_json,
            reply=reply_json,
        )):
            result = handle_chat_message("proj", CATALOG, [], "bonsoir", {})
        self.assertEqual(result["order_details"].get("product_name", ""), "")
        self.assertEqual(result["order_details"].get("name", ""), "")

    def test_no_intent_call_mid_flow(self):
        reply_json = json.dumps(
            {
                "reply": "Merci ! Quel est votre numéro de téléphone ?",
                "order_ready": False,
                "order_details": {},
            },
            ensure_ascii=False,
        )
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            if "détecteur de langue" in messages[0]["content"]:
                return _language_result(is_language_question=False)
            return reply_json

        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            handle_chat_message("proj", CATALOG, [], "Ali", {"product_name": "Champignons"})
        # En plein flux : une seule détection de langue + le reply. Jamais d'intention.
        self.assertEqual(len(calls), 2)
        self.assertNotIn(INTENT_SYSTEM_PROMPT, [m[0]["content"] for m in calls])
        self.assertEqual(calls[-1][-1]["content"], "Ali")

    def test_intent_call_failure_does_not_crash(self):
        with patch("api.services.chatbot.handler._call_chatbot_llm") as mock_llm:
            mock_llm.side_effect = requests.exceptions.Timeout("boom")
            result = handle_chat_message("proj", CATALOG, [], "je veux commander", {})
        self.assertIn("reply", result)
        self.assertIs(result["order_ready"], False)

    def test_malformed_intent_json_falls_back_to_other(self):
        with patch("api.services.chatbot.handler._call_chatbot_llm") as mock_llm:
            mock_llm.side_effect = ["pas du json", "{}", "{}"]
            result = handle_chat_message("proj", CATALOG, [], "bonsoir", {})
        self.assertIs(result["order_ready"], False)
        self.assertEqual(result["order_details"].get("product_name", ""), "")


class StartOrderMessageNotStoredAsNameTests(TestCase):
    # BUG 1 : un message multilingue qui démarre une commande ne doit JAMAIS être
    # interprété comme le nom du client par la logique déterministe de saisie.
    CATALOG = [
        {"name": "Voitures", "products": [{"name": "Nissan Altima", "price": "15000 €", "stock": 1}]},
        {"name": "Boissons", "products": [{"name": "Espresso", "price": "2.50 €", "stock": 10}]},
        {"name": "Voitures", "products": [{"name": "BMW 5 Series", "price": "20000 €", "stock": 1}]},
    ]

    def _start(self, message, product, catalog):
        intent_json = json.dumps(
            {"intent": "start_order", "product_name": product, "quantity": 1}
        )
        reply_json = json.dumps(
            {"reply": "Bien sûr ! Quel est votre nom complet ?", "order_ready": False, "order_details": {}},
            ensure_ascii=False,
        )
        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=_chat_llm_factory(
            intent=intent_json,
            reply=reply_json,
        )):
            return handle_chat_message("proj", catalog, [], message, {})

    def test_arabic_order_message_not_stored_as_name(self):
        result = self._start("أريد تقديم طلب nissan altima", "nissan altima", self.CATALOG)
        self.assertEqual(result["order_details"].get("product_name"), "Nissan Altima")
        self.assertIs(result["order_ready"], False)
        name = result["order_details"].get("name", "")
        self.assertNotIn("أريد", name)
        self.assertNotIn("تقديم", name)

    def test_tunisian_darija_order_message_not_stored_as_name(self):
        result = self._start("نحب نعدي كوموند Espresso", "Espresso", self.CATALOG)
        self.assertEqual(result["order_details"].get("product_name"), "Espresso")
        self.assertIs(result["order_ready"], False)
        self.assertNotIn("نحب", result["order_details"].get("name", ""))

    def test_arabizi_order_message_not_stored_as_name(self):
        result = self._start("n7eb n3adi commande BMW 5 Series", "BMW 5 Series", self.CATALOG)
        self.assertEqual(result["order_details"].get("product_name"), "BMW 5 Series")
        self.assertIs(result["order_ready"], False)
        self.assertNotIn("n7eb", result["order_details"].get("name", ""))

    def test_french_order_message_not_stored_as_name(self):
        result = self._start("je voudrais commander des champignons", "Champignons", CATALOG)
        self.assertEqual(result["order_details"].get("product_name"), "Champignons")
        self.assertIs(result["order_ready"], False)
        self.assertNotIn("champignons", result["order_details"].get("name", "").lower())


class OrderPersistenceTransitionTests(TestCase):
    """BUG 2 : une commande complète ne doit être persistée qu'une seule fois."""

    CHAT_CATALOG = [
        {"name": "Boissons", "products": [{"name": "Espresso", "price": "2.50 €", "stock": 10}]}
    ]

    def setUp(self):
        self.project = Project.objects.create(name="boutique-test")
        self.category = Category.objects.create(project=self.project, name="Boissons")
        self.product = Product.objects.create(
            category=self.category,
            name="Espresso",
            price="2.50 €",
            stock=10,
        )

    @staticmethod
    def _fake_llm(messages, **_kwargs):
        system = messages[0]["content"]
        if "détecteur de langue" in system:
            return json.dumps({"language": "ar", "script": "arabic", "style": "tunisian_darija", "is_language_question": False})
        if "classificateur d'intentions" in system:
            return json.dumps({"intent": "start_order", "product_name": "Espresso", "quantity": 1})
        return json.dumps(
            {"reply": "D'accord.", "order_ready": False, "order_details": {}},
            ensure_ascii=False,
        )

    def _send(self, text, state):
        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=self._fake_llm):
            result = handle_chat_message("proj", self.CHAT_CATALOG, [], text, state)
        # Reproduit la fusion du frontend (orderStateRef).
        for key, value in (result.get("order_details") or {}).items():
            if key == "quantity":
                if isinstance(value, int) and value >= 1:
                    state[key] = value
            elif isinstance(value, str) and value.strip():
                state[key] = value
        return result

    def _create_order_like_frontend(self, details):
        name = (details.get("name") or "").strip()
        parts = name.split()
        if parts:
            first_name = parts[0]
            last_name = " ".join(parts[1:]) if len(parts) > 1 else parts[0]
        else:
            first_name = last_name = "-"
        return self.client.post(
            "/api/orders/",
            {
                "project_name": "boutique-test",
                "first_name": first_name,
                "last_name": last_name,
                "email": details.get("email") or "",
                "phone": details.get("phone") or "",
                "address": details.get("address") or "",
                "items": [
                    {
                        "product_name": details.get("product_name") or "",
                        "quantity": details.get("quantity") or 1,
                    }
                ],
            },
            content_type="application/json",
        )

    def test_completed_order_creates_exactly_one_db_order(self):
        state = {}
        r = self._send("نحب نعدي كوموند Espresso", state)
        self.assertIs(r["order_ready"], False)
        r = self._send("Ali", state)
        self.assertIs(r["order_ready"], False)
        r = self._send("23456789", state)
        self.assertIs(r["order_ready"], False)
        r = self._send("tunis", state)
        self.assertIs(r["order_ready"], False)
        r = self._send("email@gmail.com", state)
        self.assertIs(r["order_ready"], True)

        res = self._create_order_like_frontend(r["order_details"])
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderLine.objects.count(), 1)

        # Le frontend fixé remet l'état actif à vide après persistance : les
        # messages suivants ne doivent rien recréer.
        state = {}
        r = self._send("شكرا", state)
        self.assertIs(r["order_ready"], False)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderLine.objects.count(), 1)

        r = self._send("merci", state)
        self.assertIs(r["order_ready"], False)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderLine.objects.count(), 1)

    def test_stale_complete_state_does_not_retrigger_order(self):
        # Même sans remise à zéro du frontend (état encore complet), le backend ne
        # renvoie order_ready=true que sur la transition : "شكرا" ne recrée rien.
        state = {}
        self._send("نحب نعدي كوموند Espresso", state)
        self._send("Ali", state)
        self._send("23456789", state)
        self._send("tunis", state)
        r = self._send("email@gmail.com", state)
        self.assertIs(r["order_ready"], True)
        self.assertEqual(self._create_order_like_frontend(r["order_details"]).status_code, 201)
        self.assertEqual(Order.objects.count(), 1)

        r = self._send("شكرا", state)
        self.assertIs(r["order_ready"], False)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderLine.objects.count(), 1)


class LanguageMirroringTests(TestCase):
    """Le reply LLM doit recevoir le message ACTUEL du client + les instructions de
    miroir de langue. On teste les propriétés (prompt, passage du message, flux
    déterministe) plutôt que le texte exact généré par le modèle."""

    def test_system_prompt_instructs_language_mirroring(self):
        prompt = CHATBOT_SYSTEM_PROMPT
        self.assertIn("MIROIR DE LANGUE", prompt)
        self.assertIn("même langue", prompt)
        self.assertIn("arabizi", prompt)
        self.assertIn("darija", prompt)
        self.assertIn("message ACTUEL", prompt)
        self.assertIn("priorité", prompt)
        self.assertIn("Ne critique jamais", prompt)
        self.assertIn("Ne repasse pas au français", prompt)

    def test_system_prompt_has_no_hardcoded_example_phrases(self):
        prompt = CHATBOT_SYSTEM_PROMPT.lower()
        for phrase in (
            "نحب نعدي كوموند",
            "نحب نكمل الطلب",
            "n7eb n3adi commande",
            "أريد تقديم طلب",
            "bel tab3",
            "بالطبيعة",
            "toyota corolla",
        ):
            self.assertNotIn(phrase, prompt)

    def test_system_prompt_declares_deterministic_facts_authoritative(self):
        prompt = CHATBOT_SYSTEM_PROMPT
        self.assertIn("{reply_context}", prompt)
        self.assertIn("FAITS AUTORITATIFS", prompt)
        for token in ("INTENT", "PRODUCT", "QUANTITY", "NEXT_FIELD", "ORDER_STATE"):
            self.assertIn(token, prompt)
        self.assertIn("Ne les invente jamais", prompt)
        self.assertIn("ne prétends jamais qu'un produit indiqué dans PRODUCT est indisponible", prompt)

    def test_system_prompt_uses_dynamic_action_contract(self):
        prompt = CHATBOT_SYSTEM_PROMPT
        self.assertIn("{reply_action}", prompt)
        # Le catalogue est injecté dynamiquement (jamais dans le template) :
        # pendant le flux de commande, son absence évite les hallucinations
        # de disponibilité / stock sur le petit modèle reply.
        self.assertNotIn("{catalog}", prompt)
        self.assertNotIn("CATALOGUE DES PRODUITS", prompt)
        self.assertNotIn("TON ET STYLE", prompt)
        self.assertNotIn("CONSIGNES DE RÉPONSE", prompt)

    def test_system_prompt_has_no_long_french_reply_example(self):
        prompt = CHATBOT_SYSTEM_PROMPT
        self.assertNotIn("Excellent choix !", prompt)
        self.assertNotIn("Pour préparer votre commande", prompt)
        self.assertNotIn("pourrais-je avoir votre nom", prompt)
        # Le JSON de sortie reste le contrat exact.
        self.assertIn('"order_ready": false', prompt)
        self.assertIn('"name": ""', prompt)

    def test_reply_llm_receives_current_message_and_mirroring_prompt(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if system == INTENT_SYSTEM_PROMPT:
                return json.dumps({"intent": "start_order", "product_name": "Nissan Altima", "quantity": 1})
            if "détecteur de langue" in system:
                return _language_result(is_language_question=False)
            return json.dumps(
                {"reply": "بالتأكيد! ما اسمك الكامل؟", "order_ready": False, "order_details": {}},
                ensure_ascii=False,
            )

        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            result = handle_chat_message(
                "proj",
                [{"name": "Voitures", "products": [{"name": "Nissan Altima", "price": "15000 €", "stock": 1}]}],
                [
                    {"sender": "user", "text": "Bonjour, je veux passer une commande."},
                    {"sender": "bot", "text": "Bien sûr ! Quel produit souhaitez-vous commander ?"},
                ],
                "أريد تقديم طلب Nissan Altima",
                {},
            )

        reply_call = _reply_call(calls)
        self.assertIsNotNone(reply_call)
        self.assertEqual(reply_call[-1]["content"], "أريد تقديم طلب Nissan Altima")
        system = reply_call[0]["content"]
        self.assertIn("même langue", system)
        self.assertIn("arabizi", system)
        self.assertIn("darija", system)
        self.assertIn("message ACTUEL", system)
        self.assertIn("Language: Arabic", system)
        self.assertIn("Style: Modern Standard Arabic", system)

        # Le modèle voit aussi le message français précédent (le changement de
        # langue), mais la règle lui donne priorité au message actuel.
        history_texts = [m["content"] for m in reply_call[1:-1] if m["role"] == "user"]
        self.assertIn("Bonjour, je veux passer une commande.", history_texts)

        # Le flux déterministe n'est pas altéré.
        self.assertEqual(result["order_details"].get("product_name"), "Nissan Altima")
        self.assertIs(result["order_ready"], False)
        self.assertFalse(result["order_details"].get("name"))
        self.assertEqual(result["reply"], "بالتأكيد! ما اسمك الكامل؟")

    def test_current_message_prioritized_across_scripts(self):
        history = [
            {"sender": "user", "text": "Bonjour, je veux passer une commande."},
            {"sender": "bot", "text": "Bien sûr ! Quel produit souhaitez-vous commander ?"},
        ]
        for current in (
            "أريد تقديم طلب Nissan Altima",
            "نحب نعدي كوموند Espresso",
            "n7eb n3adi commande BMW 5 Series",
        ):
            calls = []

            def recorder(messages, **_kwargs):
                calls.append(messages)
                system = messages[0]["content"]
                if system == INTENT_SYSTEM_PROMPT:
                    return json.dumps({"intent": "start_order", "product_name": "x", "quantity": 1})
                if "détecteur de langue" in system:
                    return _language_result(is_language_question=False)
                return json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False)

            with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
                handle_chat_message("proj", CATALOG, history, current, {})
            reply_call = _reply_call(calls)
            self.assertIsNotNone(reply_call)
            self.assertEqual(reply_call[-1]["content"], current)

    def test_arabic_reply_passed_through_unchanged(self):
        arabic_reply = "بالتأكيد! ما اسمك الكامل؟"
        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=_chat_llm_factory(
            intent=json.dumps({"intent": "start_order", "product_name": "Nissan Altima", "quantity": 1}),
            language=_language_result(),
            reply=json.dumps({"reply": arabic_reply, "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )):
            result = handle_chat_message(
                "proj",
                [{"name": "Voitures", "products": [{"name": "Nissan Altima", "price": "15000 €", "stock": 1}]}],
                [],
                "أريد تقديم طلب Nissan Altima",
                {},
            )
        self.assertEqual(result["reply"], arabic_reply)
        self.assertEqual(result["order_details"].get("product_name"), "Nissan Altima")
        self.assertIs(result["order_ready"], False)
        self.assertFalse(result["order_details"].get("name"))


class LanguageDetectionTests(TestCase):
    """Couche de détection langue/style : le reply LLM reçoit le message ACTUEL +
    un bloc de métadonnées Language / Script / Style, et une question sur la langue
    ne perturbe jamais l'état déterministe de la commande."""

    CATALOG = [
        {"name": "Voitures", "products": [{"name": "Nissan Altima", "price": "15000 €", "stock": 1}]},
        {"name": "Boissons", "products": [{"name": "Espresso", "price": "2.50 €", "stock": 10}]},
        {"name": "Voitures", "products": [{"name": "BMW 5 Series", "price": "20000 €", "stock": 1}]},
    ]

    def test_parse_valid_language_output(self):
        result = _parse_language_response(
            '{"language": "ar", "script": "arabic", "style": "tunisian_darija", "is_language_question": true}'
        )
        self.assertEqual(result["language"], "ar")
        self.assertEqual(result["script"], "arabic")
        self.assertEqual(result["style"], "tunisian_darija")
        self.assertTrue(result["is_language_question"])

    def test_parse_invalid_language_output_falls_back(self):
        result = _parse_language_response("pas du json")
        self.assertEqual(result, DEFAULT_LANGUAGE)

    def test_parse_unknown_values_fall_back(self):
        result = _parse_language_response('{"language": "klingon", "script": "runes", "style": "weird"}')
        self.assertEqual(result["language"], "mixed")
        self.assertEqual(result["script"], "mixed")
        self.assertEqual(result["style"], "mixed")
        self.assertFalse(result["is_language_question"])

    def test_detect_language_uses_raw_message_and_language_prompt(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            return _language_result()

        result = detect_language("أريد تقديم طلب", recorder)
        self.assertEqual(result["language"], "ar")
        self.assertEqual(calls[0][0]["content"], LANGUAGE_SYSTEM_PROMPT)
        self.assertEqual(calls[0][-1]["content"], "أريد تقديم طلب")

    def test_detect_language_timeout_falls_back(self):
        def boom(messages, **kwargs):
            raise requests.exceptions.Timeout("boom")

        result = detect_language("bonjour", boom)
        self.assertEqual(result, DEFAULT_LANGUAGE)

    def test_detect_language_never_translates(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            return _language_result(language="fr", script="latin", style="french")

        detect_language("je veux commander", recorder)
        self.assertEqual(calls[0][-1]["content"], "je veux commander")

    def _run_and_capture(self, user_message, order_state, history, language_json, intent_json, reply_json, catalog=None):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if system == INTENT_SYSTEM_PROMPT:
                return intent_json
            if "détecteur de langue" in system:
                return language_json
            return reply_json

        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            result = handle_chat_message("proj", catalog or self.CATALOG, history, user_message, order_state)
        return result, calls

    def test_arabic_reply_context_has_arabic_metadata(self):
        r, calls = self._run_and_capture(
            "أريد تقديم طلب Nissan Altima", {},
            [],
            json.dumps({"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False}),
            json.dumps({"intent": "start_order", "product_name": "Nissan Altima", "quantity": 1}),
            json.dumps({"reply": "بالتأكيد! ما اسمك الكامل؟", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        rc = _reply_call(calls)
        self.assertIsNotNone(rc)
        self.assertIn("Language: Arabic", rc[0]["content"])
        self.assertIn("Script: Arabic", rc[0]["content"])
        self.assertIn("Style: Modern Standard Arabic", rc[0]["content"])
        self.assertEqual(r["order_details"].get("product_name"), "Nissan Altima")
        self.assertIs(r["order_ready"], False)
        self.assertFalse(r["order_details"].get("name"))

    def test_darija_reply_context_has_darija_metadata(self):
        r, calls = self._run_and_capture(
            "نحب نعدي كوموند Espresso", {},
            [],
            json.dumps({"language": "ar", "script": "arabic", "style": "tunisian_darija", "is_language_question": False}),
            json.dumps({"intent": "start_order", "product_name": "Espresso", "quantity": 1}),
            json.dumps({"reply": "بالطبيعة! شنوّة المنتج اللي تحب تطلبو؟", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        rc = _reply_call(calls)
        self.assertIsNotNone(rc)
        self.assertIn("Language: Arabic", rc[0]["content"])
        self.assertIn("Style: Tunisian Darija", rc[0]["content"])
        self.assertEqual(r["order_details"].get("product_name"), "Espresso")
        self.assertIs(r["order_ready"], False)

    def test_arabizi_reply_context_has_arabizi_metadata(self):
        r, calls = self._run_and_capture(
            "n7eb n3adi commande BMW 5 Series", {},
            [],
            json.dumps({"language": "ar", "script": "latin", "style": "arabizi", "is_language_question": False}),
            json.dumps({"intent": "start_order", "product_name": "BMW 5 Series", "quantity": 1}),
            json.dumps({"reply": "Bel tab3! Chnowa t7eb tcommandi?", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        rc = _reply_call(calls)
        self.assertIsNotNone(rc)
        self.assertIn("Language: Arabic", rc[0]["content"])
        self.assertIn("Script: Latin", rc[0]["content"])
        self.assertIn("Style: Tunisian Arabizi", rc[0]["content"])
        self.assertEqual(r["order_details"].get("product_name"), "BMW 5 Series")
        self.assertIs(r["order_ready"], False)

    def _merge_like_frontend(self, result, state):
        for key, value in (result.get("order_details") or {}).items():
            if key == "quantity":
                if isinstance(value, int) and value >= 1:
                    state[key] = value
            elif isinstance(value, str) and value.strip():
                state[key] = value

    def test_language_question_preserves_order_state(self):
        state = {}
        r1, _ = self._run_and_capture(
            "أريد تقديم طلب Nissan Altima", state, [],
            json.dumps({"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False}),
            json.dumps({"intent": "start_order", "product_name": "Nissan Altima", "quantity": 1}),
            json.dumps({"reply": "بالتأكيد! ما اسمك الكامل؟", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self._merge_like_frontend(r1, state)
        self.assertEqual(state.get("product_name"), "Nissan Altima")
        self.assertIsNone(state.get("name"))

        # Question de langue pendant la commande : état conservé, réponse en arabe.
        r2, calls = self._run_and_capture(
            "هل يمكنك التحدث باللغة العربية؟", state, [],
            json.dumps({"language": "ar", "script": "arabic", "style": "msa", "is_language_question": True}),
            json.dumps({"intent": "other", "product_name": "", "quantity": None}),
            json.dumps({"reply": "نعم، بالتأكيد. ما اسمك الكامل؟", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self.assertEqual(state.get("product_name"), "Nissan Altima")
        self.assertIsNone(state.get("name"))
        self.assertIs(r2["order_ready"], False)
        rc = _reply_call(calls)
        self.assertIsNotNone(rc)
        self.assertIn("Language: Arabic", rc[0]["content"])

        # Le nom suivant est bien enregistré et le flux continue.
        r3, _ = self._run_and_capture(
            "أمين", state, [],
            json.dumps({"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False}),
            json.dumps({"intent": "other", "product_name": "", "quantity": None}),
            json.dumps({"reply": "شكراً، ما هو رقم هاتفك؟", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self._merge_like_frontend(r3, state)
        self.assertEqual(state.get("name"), "أمين")
        self.assertIs(r3["order_ready"], False)

    def test_language_question_in_french_preserves_order_state(self):
        state = {}
        r1, _ = self._run_and_capture(
            "je veux commander des champignons", state, [],
            json.dumps({"language": "fr", "script": "latin", "style": "french", "is_language_question": False}),
            json.dumps({"intent": "start_order", "product_name": "Champignons", "quantity": 1}),
            json.dumps({"reply": "Bien sûr ! Quel est votre nom ?", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self._merge_like_frontend(r1, state)
        self.assertEqual(state.get("product_name"), "Champignons")

        r2, calls = self._run_and_capture(
            "Tu peux parler français ?", state, [],
            json.dumps({"language": "fr", "script": "latin", "style": "french", "is_language_question": True}),
            json.dumps({"intent": "other", "product_name": "", "quantity": None}),
            json.dumps({"reply": "Bien sûr ! Quel est votre nom ?", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self.assertEqual(state.get("product_name"), "Champignons")
        self.assertIsNone(state.get("name"))
        self.assertIs(r2["order_ready"], False)
        rc = _reply_call(calls)
        self.assertIsNotNone(rc)
        self.assertIn("Language: French", rc[0]["content"])
        self.assertIn("Style: French", rc[0]["content"])

    def test_mixed_message_does_not_crash(self):
        r, _ = self._run_and_capture(
            "نحب commander BMW", {},
            [],
            json.dumps({"language": "mixed", "script": "mixed", "style": "mixed", "is_language_question": False}),
            json.dumps({"intent": "start_order", "product_name": "BMW", "quantity": 1}),
            json.dumps({"reply": "Bel tab3!", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self.assertIs(r["order_ready"], False)
        self.assertEqual(r["order_details"].get("product_name"), "BMW 5 Series")

    def test_malformed_detector_output_uses_fallback(self):
        r, _ = self._run_and_capture(
            "أريد تقديم طلب Nissan Altima", {},
            [],
            "pas du json",
            json.dumps({"intent": "start_order", "product_name": "Nissan Altima", "quantity": 1}),
            json.dumps({"reply": "بالتأكيد! ما اسمك الكامل؟", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self.assertIs(r["order_ready"], False)
        self.assertEqual(r["order_details"].get("product_name"), "Nissan Altima")

    def test_detector_timeout_uses_fallback(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if "détecteur de langue" in system:
                raise requests.exceptions.Timeout("boom")
            if system == INTENT_SYSTEM_PROMPT:
                return json.dumps({"intent": "start_order", "product_name": "Nissan Altima", "quantity": 1})
            return json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False)

        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            result = handle_chat_message("proj", self.CATALOG, [], "أريد تقديم طلب Nissan Altima", {})
        self.assertIs(result["order_ready"], False)
        self.assertEqual(result["order_details"].get("product_name"), "Nissan Altima")


class ReplyContextTests(TestCase):
    """Phase 1 : le reply LLM reçoit un bloc de faits déterministes compacts
    (INTENT, RESPONSE_LANGUAGE, RESPONSE_SCRIPT, PRODUCT, QUANTITY, NEXT_FIELD,
    ORDER_STATE, CURRENT_USER_MESSAGE) au lieu de devoir redéduire lui-même
    l'intention, le produit ou la prochaine information demandée."""

    CATALOG = [
        {"name": "Voitures", "products": [{"name": "Nissan Altima", "price": "15000 €", "stock": 1}]},
        {"name": "Boissons", "products": [{"name": "Espresso", "price": "2.50 €", "stock": 10}]},
    ]

    def _run(self, user_message, order_state, history, language_json, intent_json, reply_json, catalog=None):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if system == INTENT_SYSTEM_PROMPT:
                return intent_json
            if "détecteur de langue" in system:
                return language_json
            return reply_json

        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            result = handle_chat_message("proj", catalog or self.CATALOG, history, user_message, order_state)
        return result, calls

    def _reply_system(self, calls):
        reply_call = _reply_call(calls)
        self.assertIsNotNone(reply_call)
        return reply_call[0]["content"]

    def test_arabic_reply_context(self):
        r, calls = self._run(
            "أريد تقديم طلب nissan altima", {}, [],
            json.dumps({"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False}),
            json.dumps({"intent": "start_order", "product_name": "Nissan Altima", "quantity": None}),
            json.dumps({"reply": "بالتأكيد! ما اسمك الكامل؟", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        system = self._reply_system(calls)
        self.assertIn("INTENT: start_order", system)
        self.assertIn("PRODUCT: Nissan Altima", system)
        self.assertIn("NEXT_FIELD: name", system)
        self.assertIn("RESPONSE_LANGUAGE: Arabic", system)
        self.assertIn("RESPONSE_SCRIPT: Arabic", system)
        self.assertIn("CURRENT_USER_MESSAGE: أريد تقديم طلب nissan altima", system)
        self.assertEqual(r["order_details"].get("product_name"), "Nissan Altima")
        self.assertIs(r["order_ready"], False)

    def test_french_reply_context(self):
        r, calls = self._run(
            "je veux commander une Nissan Altima", {}, [],
            json.dumps({"language": "fr", "script": "latin", "style": "french", "is_language_question": False}),
            json.dumps({"intent": "start_order", "product_name": "Nissan Altima", "quantity": None}),
            json.dumps({"reply": "Bien sûr ! Quel est votre nom complet ?", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        system = self._reply_system(calls)
        self.assertIn("INTENT: start_order", system)
        self.assertIn("PRODUCT: Nissan Altima", system)
        self.assertIn("NEXT_FIELD: name", system)
        self.assertIn("RESPONSE_LANGUAGE: French", system)
        self.assertIn("RESPONSE_SCRIPT: Latin", system)
        self.assertEqual(r["order_details"].get("product_name"), "Nissan Altima")
        self.assertIs(r["order_ready"], False)

    def test_darija_detector_result_passed_through(self):
        _, calls = self._run(
            "نحب نعدي كوموند BMW 5 Series", {}, [],
            json.dumps({"language": "ar", "script": "arabic", "style": "tunisian_darija", "is_language_question": False}),
            json.dumps({"intent": "start_order", "product_name": "BMW 5 Series", "quantity": None}),
            json.dumps({"reply": "بالطبيعة! شنو اسمك الكامل؟", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        system = self._reply_system(calls)
        self.assertIn("RESPONSE_LANGUAGE: Arabic", system)
        self.assertIn("RESPONSE_SCRIPT: Arabic", system)
        self.assertIn("RESPONSE_STYLE: Tunisian Darija", system)

    def test_arabizi_detector_result_passed_through(self):
        _, calls = self._run(
            "n7eb n3adi commande BMW 5 Series", {}, [],
            json.dumps({"language": "ar", "script": "latin", "style": "arabizi", "is_language_question": False}),
            json.dumps({"intent": "start_order", "product_name": "BMW 5 Series", "quantity": None}),
            json.dumps({"reply": "Bel tab3! Chnowa t7eb tcommandi?", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        system = self._reply_system(calls)
        self.assertIn("RESPONSE_LANGUAGE: Arabic", system)
        self.assertIn("RESPONSE_SCRIPT: Latin", system)
        self.assertIn("RESPONSE_STYLE: Tunisian Arabizi", system)

    def test_mid_order_reply_context_and_no_intent_call(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if "détecteur de langue" in system:
                return json.dumps({"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False})
            return json.dumps(
                {"reply": "شكراً، ما هو رقم هاتفك؟", "order_ready": False, "order_details": {}},
                ensure_ascii=False,
            )

        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            result = handle_chat_message("proj", self.CATALOG, [], "Ali", {"product_name": "Nissan Altima"})

        reply_call = _reply_call(calls)
        self.assertIsNotNone(reply_call)
        system = reply_call[0]["content"]
        self.assertIn("PRODUCT: Nissan Altima", system)
        self.assertIn("NEXT_FIELD: phone", system)
        self.assertIn("RESPONSE_LANGUAGE: Arabic", system)
        self.assertIn("ORDER_STATE:", system)
        self.assertIn("Nom=Ali", system)
        # En plein flux : jamais d'appel d'intention supplémentaire.
        self.assertNotIn(INTENT_SYSTEM_PROMPT, [m[0]["content"] for m in calls])
        # L'état déterministe et la transition restent inchangés.
        self.assertEqual(result["order_details"].get("name"), "Ali")
        self.assertEqual(result["order_details"].get("product_name"), "Nissan Altima")
        self.assertIs(result["order_ready"], False)

    def test_bot_history_sent_as_plain_text_not_fake_json(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if system == INTENT_SYSTEM_PROMPT:
                return json.dumps({"intent": "start_order", "product_name": "Nissan Altima", "quantity": None})
            if "détecteur de langue" in system:
                return json.dumps({"language": "fr", "script": "latin", "style": "french", "is_language_question": False})
            return json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False)

        history = [
            {"sender": "bot", "text": "Bonjour ! Je suis l'assistant de votre boutique."},
            {"sender": "user", "text": "أريد تقديم طلب Nissan Altima"},
        ]
        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            handle_chat_message("proj", self.CATALOG, history, "oui", {})
        reply_call = _reply_call(calls)
        self.assertIsNotNone(reply_call)
        assistant_msgs = [m for m in reply_call[1:-1] if m["role"] == "assistant"]
        self.assertEqual(
            [m["content"] for m in assistant_msgs],
            ["Bonjour ! Je suis l'assistant de votre boutique."],
        )


class ReplyActionTests(TestCase):
    """Phase 2 : le reply LLM reçoit une ACTION dynamique qui ne décrit que le
    comportement du tour ACTUEL (le champ à demander, ou la confirmation, ou une
    réponse naturelle), placée juste avant la spécification JSON. Le catalogue
    n'est injecté que pour les réponses naturelles."""

    def test_start_order_asks_only_name_and_forbids_other_fields(self):
        action = build_reply_action(
            {"intent": "start_order", "product_name": "Nissan Altima", "quantity": 1},
            {"product_name": "Nissan Altima"},
            "name",
        )
        self.assertIn("La seule information à demander est le nom complet du client", action)
        self.assertIn("Pose UNE SEULE question courte et naturelle", action)
        self.assertIn("INTERDIT : ne demande jamais les autres champs de la commande", action)
        self.assertIn("Ne parle jamais de disponibilité, de stock", action)
        self.assertNotIn("téléphone", action)
        self.assertNotIn("adresse", action)

    def test_start_order_without_product_asks_product(self):
        action = build_reply_action({"intent": "start_order"}, {"product_name": ""}, "product_name")
        self.assertIn("aucun produit n'est encore choisi", action)
        self.assertIn("quel produit il souhaite commander", action)
        self.assertIn("Ne parle jamais de disponibilité", action)

    def test_mid_order_asks_only_the_missing_field(self):
        action = build_reply_action(
            {"intent": "other"},
            {"product_name": "Nissan Altima", "name": "Amin", "phone": "45454343"},
            "address",
        )
        self.assertIn("la seule information à demander est l'adresse de livraison du client", action)
        self.assertIn("INTERDIT : ne demande jamais Nom ni Téléphone ni Email", action)
        self.assertNotIn("numéro de téléphone", action)

    def test_completed_order_recaps_and_confirms(self):
        action = build_reply_action(
            {"intent": "other"},
            {"product_name": "Nissan Altima", "name": "Amin", "phone": "45454343", "address": "Tunis", "email": "a@b.com"},
            None,
        )
        self.assertIn("toutes les informations de la commande sont déjà collectées", action)
        self.assertIn("Récapitule la commande et remercie le client", action)
        self.assertIn("sans redemander d'information", action)

    def test_product_inquiry_answers_naturally(self):
        action = build_reply_action({"intent": "product_inquiry"}, {}, None)
        self.assertIn("réponds naturellement", action)
        self.assertIn("CATALOGUE", action)

    def test_language_question_answers_naturally_and_keeps_state(self):
        action = build_reply_action(
            {"intent": "other"}, {"product_name": "Nissan Altima"}, "name", is_language_question=True
        )
        self.assertIn("question sur la langue", action)
        self.assertIn("sans modifier la commande en cours", action)
        self.assertNotIn("la seule information à demander", action)

    def test_reply_requires_catalog_only_for_natural_replies(self):
        self.assertTrue(reply_requires_catalog({"intent": "product_inquiry"}, None))
        self.assertTrue(reply_requires_catalog({"intent": "greeting"}, None))
        self.assertTrue(reply_requires_catalog({"intent": "greeting"}, "product_name"))
        self.assertFalse(reply_requires_catalog({"intent": "start_order"}, "name"))
        self.assertFalse(reply_requires_catalog({"intent": "other"}, "phone"))
        self.assertFalse(reply_requires_catalog({"intent": "other"}, None))  # commande terminée
        self.assertFalse(reply_requires_catalog({"intent": "other"}, "name", is_language_question=True))

    def test_catalog_injected_only_for_natural_turns(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if system == INTENT_SYSTEM_PROMPT:
                intent = "start_order" if "commander" in messages[-1]["content"] else "greeting"
                return json.dumps(
                    {"intent": intent, "product_name": "Nissan Altima" if intent == "start_order" else "", "quantity": None}
                )
            if "détecteur de langue" in system:
                return json.dumps({"language": "fr", "script": "latin", "style": "french", "is_language_question": False})
            return json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False)

        catalog = [
            {"name": "Voitures", "products": [{"name": "Nissan Altima", "price": "15000 €", "stock": 1}]},
        ]
        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            handle_chat_message("proj", catalog, [], "je veux commander une Nissan Altima", {})
        reply_system = _reply_call(calls)[0]["content"]
        self.assertIn("ACTION :", reply_system)
        self.assertNotIn("CATALOGUE DES PRODUITS", reply_system)

        calls.clear()
        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            handle_chat_message("proj", catalog, [], "bonjour", {})
        reply_system = _reply_call(calls)[0]["content"]
        self.assertIn("CATALOGUE DES PRODUITS", reply_system)
        self.assertIn("Nissan Altima", reply_system)


class OrderCreationTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="boutique-test")
        self.category = Category.objects.create(project=self.project, name="Légumes")
        self.product = Product.objects.create(
            category=self.category,
            name="Champignons",
            price="3.50 €",
            stock=10,
        )

    def _payload(self, item, name="Jean Dupont"):
        return {
            "project_name": "boutique-test",
            "name": name,
            "email": "jean@exemple.com",
            "phone": "22123456",
            "address": "12 rue de Tunis",
            "items": [item],
        }

    def test_order_by_product_name(self):
        res = self.client.post(
            "/api/orders/",
            self._payload({"product_name": "Champignons", "quantity": 2}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        order = Order.objects.get(id=res.json()["order_id"])
        self.assertEqual(order.project, self.project)
        line = order.lines.get()
        self.assertEqual(line.product, self.product)
        self.assertEqual(line.quantity, 2)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)

    def test_order_by_product_id_still_works(self):
        res = self.client.post(
            "/api/orders/",
            self._payload({"product_id": self.product.id, "quantity": 1}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 9)

    def test_order_by_product_name_not_found(self):
        res = self.client.post(
            "/api/orders/",
            self._payload({"product_name": "Inconnu", "quantity": 1}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Inconnu", res.json()["error"])

    def test_order_by_product_name_ambiguous(self):
        other = Product.objects.create(
            category=self.category,
            name="Champignons",
            price="4.00 €",
            stock=1,
        )
        res = self.client.post(
            "/api/orders/",
            self._payload({"product_name": "Champignons", "quantity": 1}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("ambigu", res.json()["error"])

    def test_order_by_product_name_wrong_project(self):
        other_project = Project.objects.create(name="autre")
        other_cat = Category.objects.create(project=other_project, name="Autre")
        Product.objects.create(
            category=other_cat,
            name="Tomates",
            price="5.00 €",
            stock=1,
        )
        res = self.client.post(
            "/api/orders/",
            self._payload({"product_name": "Tomates", "quantity": 1}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("not found", res.json()["error"])

    def test_order_item_without_identifier(self):
        res = self.client.post(
            "/api/orders/",
            self._payload({"quantity": 1}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)


VALID_WEBSITE_CONFIG = {
    "theme": {
        "primary_color": "#4f46e5",
        "secondary_color": "#06b6d4",
        "background_color": "#ffffff",
        "font_family": "sans-serif",
        "border_radius": "lg",
    },
    "sections": [
        {"id": "navbar_1", "type": "navbar", "brand_name": "Test", "links": [{"label": "A", "href": "#"}], "cta_text": "Contact"},
        {"id": "footer_1", "type": "footer", "brand_name": "Test", "description": "d", "copyright": "c", "links": [], "social_links": ["Instagram"]},
    ],
    "catalog": [
        {"name": "Chiens", "products": [{"name": "Croquettes", "price": "24.99 €", "image_keyword": "dog food", "description": "Bonne.", "stock": 25}]}
    ],
}


def _hf_result(content):
    return (
        {"text": "", "files": []},
        [
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": content},
        ],
    )


class HuggingFaceProviderTests(TestCase):
    def test_call_huggingface_extracts_assistant_content(self):
        with patch.dict("os.environ", {"HF_TOKEN": "hf_fake_token_123"}, clear=False), \
             patch("gradio_client.Client") as mock_client_cls:
            mock_client_cls.return_value.predict.return_value = _hf_result(json.dumps(VALID_WEBSITE_CONFIG))
            content = call_huggingface("un site de test")
        self.assertEqual(json.loads(content), VALID_WEBSITE_CONFIG)
        mock_client_cls.assert_called_once_with("developer0hye/Qwen3-VL-8B-Instruct", token="hf_fake_token_123")
        self.assertEqual(mock_client_cls.return_value.predict.call_args.kwargs["message"], {"text": "un site de test", "files": []})
        self.assertEqual(mock_client_cls.return_value.predict.call_args.kwargs["history"], [])
        self.assertEqual(mock_client_cls.return_value.predict.call_args.kwargs["api_name"], "/chat_fn")

    def test_call_huggingface_malformed_structure_raises(self):
        with patch.dict("os.environ", {"HF_TOKEN": "hf_fake_token_123"}, clear=False), \
             patch("gradio_client.Client") as mock_client_cls:
            mock_client_cls.return_value.predict.return_value = ({"text": "", "files": []}, [])
            with self.assertRaises(Exception):
                call_huggingface("un site de test")

    def test_call_huggingface_error_does_not_leak_token(self):
        with patch.dict("os.environ", {"HF_TOKEN": "hf_super_secret_token"}, clear=False), \
             patch("gradio_client.Client", side_effect=Exception("boom")):
            with self.assertRaises(Exception) as ctx:
                call_huggingface("un site de test")
        self.assertNotIn("hf_super_secret_token", str(ctx.exception))

    def test_generate_config_huggingface_success(self):
        with patch("api.services.site_generation.generator.AI_PROVIDER", "huggingface"), \
             patch("gradio_client.Client") as mock_client_cls, \
             patch("api.image_service.get_stock_image_url", return_value="https://fake/800/800") as _img, patch("api.services.site_generation.normalizer.get_stock_image_url", return_value="https://fake/800/800") as _img2, patch("api.fallbacks.get_stock_image_url", return_value="https://fake/800/800") as _img3:
            mock_client_cls.return_value.predict.return_value = _hf_result(json.dumps(VALID_WEBSITE_CONFIG))
            result = generate_config("un site de test")
        self.assertEqual(result["theme"]["primary_color"], "#4f46e5")
        self.assertEqual(result["sections"][0]["type"], "navbar")
        self.assertEqual(result["catalog"][0]["products"][0]["stock"], 25)

    def test_generate_config_huggingface_invalid_json_falls_back(self):
        with patch("api.services.site_generation.generator.AI_PROVIDER", "huggingface"), \
             patch("gradio_client.Client") as mock_client_cls, \
             patch("api.image_service.get_stock_image_url", return_value="https://fake/800/800") as _img, patch("api.services.site_generation.normalizer.get_stock_image_url", return_value="https://fake/800/800") as _img2, patch("api.fallbacks.get_stock_image_url", return_value="https://fake/800/800") as _img3:
            mock_client_cls.return_value.predict.return_value = _hf_result("pas du json")
            result = generate_config("un site de test")
        self.assertIn("theme", result)
        self.assertIn("sections", result)
        self.assertIn("catalog", result)

    def test_generate_config_huggingface_request_error_falls_back(self):
        with patch("api.services.site_generation.generator.AI_PROVIDER", "huggingface"), \
             patch("gradio_client.Client", side_effect=Exception("boom")), \
             patch("api.image_service.get_stock_image_url", return_value="https://fake/800/800") as _img, patch("api.services.site_generation.normalizer.get_stock_image_url", return_value="https://fake/800/800") as _img2, patch("api.fallbacks.get_stock_image_url", return_value="https://fake/800/800") as _img3:
            result = generate_config("un site de test")
        self.assertIn("theme", result)
        self.assertIn("sections", result)
        self.assertIn("catalog", result)

    def test_chatbot_huggingface_success(self):
        content = json.dumps(
            {
                "reply": "Merci ! Quel est votre numéro de téléphone ?",
                "order_ready": False,
                "order_details": {"name": "FAUX-NOM-LLM"},
            },
            ensure_ascii=False,
        )
        with patch("api.services.chatbot.handler.AI_PROVIDER", "huggingface"), \
             patch("gradio_client.Client") as mock_client_cls:
            mock_client_cls.return_value.predict.return_value = _hf_result(content)
            result = handle_chat_message(
                "proj", CATALOG, [], "aded djja", {"product_name": "Champignons"}
            )
        self.assertEqual(result["order_details"].get("name"), "aded djja")
        self.assertIs(result["order_ready"], False)
        self.assertIn("téléphone", result["reply"])

    def test_chatbot_huggingface_request_error_timeout_payload(self):
        with patch("api.services.chatbot.handler.AI_PROVIDER", "huggingface"), \
             patch("gradio_client.Client", side_effect=Exception("boom")):
            result = handle_chat_message(
                "proj", CATALOG, [], "aded djja", {"product_name": "Champignons"}
            )
        self.assertIn("Désolé", result["reply"])
        self.assertIs(result["order_ready"], False)


class LanguagePromptContractTests(TestCase):
    """Phase 3C : contrat déterministe du prompt de détection de langue et du filet
    de sécurité script."""

    def test_prompt_analyzes_whole_message(self):
        self.assertIn("en entier", LANGUAGE_SYSTEM_PROMPT)
        self.assertIn("ne te fie pas à un seul mot", LANGUAGE_SYSTEM_PROMPT)

    def test_prompt_narrows_language_question(self):
        self.assertIn("UNIQUEMENT", LANGUAGE_SYSTEM_PROMPT)
        self.assertIn("JAMAIS des questions de langue", LANGUAGE_SYSTEM_PROMPT)
        self.assertIn("do you speak arabic", LANGUAGE_SYSTEM_PROMPT)

    def test_prompt_distinguishes_darija_and_arabizi(self):
        self.assertIn("tunisian_darija", LANGUAGE_SYSTEM_PROMPT)
        self.assertIn("arabizi", LANGUAGE_SYSTEM_PROMPT)
        self.assertIn("n7eb n3adi commande", LANGUAGE_SYSTEM_PROMPT)

    def test_script_consistency_arabic_message_overrides_latin(self):
        result = detect_language(
            "أريد شراء سيارة",
            lambda messages: json.dumps(
                {"language": "fr", "script": "latin", "style": "french", "is_language_question": False}
            ),
        )
        self.assertEqual(result["script"], "arabic")
        self.assertEqual(result["language"], "ar")
        self.assertEqual(result["style"], "msa")

    def test_script_consistency_preserves_arabizi(self):
        result = detect_language(
            "n7eb n3adi commande",
            lambda messages: json.dumps(
                {"language": "ar", "script": "latin", "style": "arabizi", "is_language_question": False}
            ),
        )
        self.assertEqual(result["script"], "latin")
        self.assertEqual(result["style"], "arabizi")

    def test_script_consistency_preserves_french(self):
        result = detect_language(
            "bonjour",
            lambda messages: json.dumps(
                {"language": "fr", "script": "latin", "style": "french", "is_language_question": False}
            ),
        )
        self.assertEqual(result["script"], "latin")
        self.assertEqual(result["style"], "french")

    def test_timeout_fallback_not_overridden_by_script_consistency(self):
        def boom(messages, **kwargs):
            raise requests.exceptions.Timeout("boom")

        result = detect_language("أريد شراء سيارة", boom)
        self.assertEqual(result, DEFAULT_LANGUAGE)
        self.assertEqual(result["script"], "mixed")


class DataOnlyLanguageContinuityTests(TestCase):
    """Phase 3C : reconnaissance des messages data-only et source de langue pour
    conserver le style de la conversation."""

    def test_data_only_phone(self):
        self.assertTrue(is_data_only_message("23456789"))
        self.assertTrue(is_data_only_message("22123456"))

    def test_data_only_email(self):
        self.assertTrue(is_data_only_message("achref@gmail.com"))

    def test_data_only_single_word(self):
        self.assertTrue(is_data_only_message("أشرف"))
        self.assertTrue(is_data_only_message("tunis"))
        self.assertTrue(is_data_only_message("Achref"))

    def test_not_data_only_sentence(self):
        self.assertFalse(is_data_only_message("شنوما السعر متاع BMW 5 Series؟"))
        self.assertFalse(is_data_only_message("mon nom est Achref"))
        self.assertFalse(is_data_only_message("أريد تقديم طلب BMW"))

    def test_data_only_empty(self):
        self.assertTrue(is_data_only_message(""))
        self.assertTrue(is_data_only_message("   "))

    def test_pick_source_uses_last_language_bearing_user_message(self):
        history = [
            {"sender": "user", "text": "أريد تقديم طلب Nissan Altima"},
            {"sender": "bot", "text": "بالتأكيد! ما هو اسمك الكامل؟"},
            {"sender": "user", "text": "أمين"},
        ]
        self.assertEqual(pick_language_source_message(history, "tunis"), "أريد تقديم طلب Nissan Altima")

    def test_pick_source_falls_back_when_all_history_data_only(self):
        history = [
            {"sender": "user", "text": "أمين"},
            {"sender": "bot", "text": "شكراً!"},
            {"sender": "user", "text": "23456789"},
        ]
        self.assertEqual(pick_language_source_message(history, "tunis"), "tunis")

    def test_pick_source_uses_current_when_no_history(self):
        self.assertEqual(pick_language_source_message([], "23456789"), "23456789")

    def test_pick_source_uses_current_when_language_bearing(self):
        self.assertEqual(pick_language_source_message([], "شنوما السعر؟"), "شنوما السعر؟")


class IntentPromptContractTests(TestCase):
    """Phase 3C : contrat déterministe du prompt d'intention (blended)."""

    def test_prompt_keeps_start_order_broad_rule(self):
        self.assertIn("dans n'importe quelle langue ou écriture", INTENT_SYSTEM_PROMPT)

    def test_prompt_price_question_is_inquiry(self):
        self.assertIn("product_inquiry, PAS start_order", INTENT_SYSTEM_PROMPT)
        self.assertIn("wesh alay l prix", INTENT_SYSTEM_PROMPT)

    def test_prompt_search_is_not_order(self):
        self.assertIn("product_search, PAS start_order", INTENT_SYSTEM_PROMPT)
        self.assertIn("chkoun ya3ref wino l fromage", INTENT_SYSTEM_PROMPT)

    def test_prompt_complete_order_not_cancel(self):
        self.assertIn("نحب نكمل الطلب", INTENT_SYSTEM_PROMPT)
        self.assertIn("PAS cancel_order", INTENT_SYSTEM_PROMPT)

    def test_prompt_generic_nouns_not_product(self):
        self.assertIn("سيارة", INTENT_SYSTEM_PROMPT)
        self.assertIn("sayara", INTENT_SYSTEM_PROMPT)
        self.assertIn("laissés vides", INTENT_SYSTEM_PROMPT)

    def test_prompt_keeps_json_contract(self):
        self.assertIn('{"intent": "start_order", "product_name": "", "quantity": null}', INTENT_SYSTEM_PROMPT)

    def test_prompt_availability_question_is_not_order(self):
        self.assertIn("3andkom pizza", INTENT_SYSTEM_PROMPT)
        self.assertIn("عندكم", INTENT_SYSTEM_PROMPT)
        self.assertIn("Mentionner un produit ne suffit jamais", INTENT_SYSTEM_PROMPT)

    def test_prompt_start_order_requires_explicit_intent(self):
        self.assertIn("start_order exige une intention explicite d'achat ou de commande", INTENT_SYSTEM_PROMPT)


class RoutingGateTests(TestCase):
    """Phase 3C : le flux de commande ne démarre que sur start_order."""

    CATALOG = [
        {"name": "Voitures", "products": [{"name": "BMW 5 Series", "price": "20000 €", "stock": 2}]},
        {"name": "Voitures", "products": [{"name": "Nissan Altima", "price": "15000 €", "stock": 3}]},
    ]

    def _run(self, message, intent_json, language_json, reply_json, state=None, catalog=None):
        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=_chat_llm_factory(
            intent=intent_json,
            language=language_json,
            reply=reply_json,
        )):
            return handle_chat_message("proj", catalog or self.CATALOG, [], message, state or {})

    def test_price_inquiry_does_not_start_order(self):
        result = self._run(
            "شنوما السعر متاع BMW 5 Series؟",
            json.dumps({"intent": "product_inquiry", "product_name": "", "quantity": None}),
            json.dumps({"language": "ar", "script": "arabic", "style": "tunisian_darija", "is_language_question": False}),
            json.dumps({"reply": "السعر موجود في الكتالوج.", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self.assertEqual(result["order_details"].get("product_name", ""), "")
        self.assertEqual(result["order_details"].get("name", ""), "")
        self.assertIs(result["order_ready"], False)

    def test_price_inquiry_with_mentioned_product_does_not_start_order(self):
        result = self._run(
            "شنوما السعر متاع BMW 5 Series؟",
            json.dumps({"intent": "product_inquiry", "product_name": "BMW 5 Series", "quantity": None}),
            json.dumps({"language": "ar", "script": "arabic", "style": "tunisian_darija", "is_language_question": False}),
            json.dumps({"reply": "السعر موجود في الكتالوج.", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self.assertEqual(result["order_details"].get("product_name", ""), "")

    def test_start_order_populates_product(self):
        result = self._run(
            "أريد تقديم طلب BMW 5 Series",
            json.dumps({"intent": "start_order", "product_name": "BMW 5 Series", "quantity": 1}),
            json.dumps({"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False}),
            json.dumps({"reply": "بالتأكيد! ما هو اسمك الكامل؟", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self.assertEqual(result["order_details"].get("product_name"), "BMW 5 Series")
        self.assertIs(result["order_ready"], False)

    def test_interrogative_start_order_does_not_inject_product(self):
        # Phase 4 : une question de disponibilité ("3andkom pizza?") ne doit jamais
        # injecter un produit dans la commande, même si le classificateur la classe
        # start_order par erreur.
        result = self._run(
            "3andkom pizza?",
            json.dumps({"intent": "start_order", "product_name": "pizza", "quantity": None}),
            json.dumps({"language": "fr", "script": "latin", "style": "french", "is_language_question": False}),
            json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self.assertEqual(result["order_details"].get("product_name", ""), "")
        self.assertEqual(result["order_details"].get("quantity", 1), 1)

    def test_interrogative_arabic_start_order_does_not_inject_product(self):
        result = self._run(
            "عندكم فرجيني؟",
            json.dumps({"intent": "start_order", "product_name": "فرجيني", "quantity": None}),
            json.dumps({"language": "ar", "script": "arabic", "style": "tunisian_darija", "is_language_question": False}),
            json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False),
        )
        self.assertEqual(result["order_details"].get("product_name", ""), "")
        self.assertIs(result["order_ready"], False)

    def test_mid_order_collection_still_works(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if "détecteur de langue" in system:
                return json.dumps({"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False})
            return json.dumps(
                {"reply": "شكراً! ما هو رقم هاتفك؟", "order_ready": False, "order_details": {}},
                ensure_ascii=False,
            )

        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            result = handle_chat_message("proj", self.CATALOG, [], "أمين", {"product_name": "BMW 5 Series"})
        self.assertEqual(result["order_details"].get("name"), "أمين")
        self.assertEqual(result["order_details"].get("product_name"), "BMW 5 Series")
        self.assertIs(result["order_ready"], False)
        self.assertNotIn(INTENT_SYSTEM_PROMPT, [m[0]["content"] for m in calls])


class ReplyStyleExampleTests(TestCase):
    """Phase 3C : sélection déterministe des exemples de style par tour."""

    def test_french_ask_name_examples(self):
        block = build_reply_style_examples(
            {"intent": "start_order"},
            {"product_name": "Nissan Altima"},
            "name",
            {"language": "fr", "script": "latin", "style": "french", "is_language_question": False},
        )
        self.assertIn("Quel est votre nom complet", block)

    def test_msa_ask_name_examples(self):
        block = build_reply_style_examples(
            {"intent": "start_order"},
            {"product_name": "Nissan Altima"},
            "name",
            {"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False},
        )
        self.assertIn("ما هو اسمك الكامل", block)

    def test_darija_ask_phone_examples(self):
        block = build_reply_style_examples(
            {"intent": "other"},
            {"product_name": "Nissan Altima", "name": "أمين"},
            "phone",
            {"language": "ar", "script": "arabic", "style": "tunisian_darija", "is_language_question": False},
        )
        self.assertIn("شنو رقم هاتفك", block)

    def test_arabizi_ask_address_examples(self):
        block = build_reply_style_examples(
            {"intent": "other"},
            {"product_name": "Nissan Altima", "name": "Amin", "phone": "22123456"},
            "address",
            {"language": "ar", "script": "latin", "style": "arabizi", "is_language_question": False},
        )
        self.assertIn("Win t7eb", block)

    def test_language_question_examples(self):
        block = build_reply_style_examples(
            {"intent": "other"},
            {"product_name": "Nissan Altima"},
            "name",
            {"language": "ar", "script": "arabic", "style": "msa", "is_language_question": True},
            True,
        )
        self.assertIn("التحدث بالعربية", block)

    def test_natural_examples_for_inquiry(self):
        block = build_reply_style_examples(
            {"intent": "product_inquiry"},
            {},
            None,
            {"language": "fr", "script": "latin", "style": "french", "is_language_question": False},
        )
        self.assertIn("Comment puis-je vous aider", block)

    def test_recap_examples_for_completed_order(self):
        block = build_reply_style_examples(
            {"intent": "other"},
            {"product_name": "Nissan Altima", "name": "Amin", "phone": "22123456", "address": "tunis", "email": "a@b.com"},
            None,
            {"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False},
        )
        self.assertIn("تم تسجيل طلبك", block)

    def test_style_block_injected_in_reply_prompt(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if system == INTENT_SYSTEM_PROMPT:
                return json.dumps({"intent": "start_order", "product_name": "Nissan Altima", "quantity": 1})
            if "détecteur de langue" in system:
                return json.dumps({"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False})
            return json.dumps(
                {"reply": "بالتأكيد! ما هو اسمك الكامل؟", "order_ready": False, "order_details": {}},
                ensure_ascii=False,
            )

        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            handle_chat_message(
                "proj",
                [{"name": "Voitures", "products": [{"name": "Nissan Altima", "price": "15000 €", "stock": 1}]}],
                [],
                "أود شراء سيارة",
                {},
            )
        reply_system = _reply_call(calls)[0]["content"]
        self.assertIn("EXEMPLES DE RÉPONSES DANS LE STYLE DU CLIENT", reply_system)
        self.assertIn("ما هو اسمك الكامل", reply_system)

    def test_examples_avoid_forbidden_phrases(self):
        forbidden = (
            "نحب نعدي كوموند",
            "نحب نكمل الطلب",
            "n7eb n3adi commande",
            "أريد تقديم طلب",
            "bel tab3",
            "بالطبيعة",
            "toyota corolla",
            "Excellent choix !",
            "Pour préparer votre commande",
            "pourrais-je avoir votre nom",
        )
        blob = json.dumps(_REPLY_STYLE_EXAMPLES, ensure_ascii=False).lower()
        for phrase in forbidden:
            self.assertNotIn(phrase.lower(), blob)


class LanguageAnchorSourceTests(TestCase):
    """Phase 4 : un message qui porte de la langue ancre (ou change) la langue de
    la conversation ; une simple valeur (produit nu, téléphone, email, mot court,
    bruit) ne peut jamais la remplacer."""

    CATALOG = [
        {"name": "Voitures", "products": [
            {"name": "Toyota Corolla", "price": "12000 €", "stock": 4},
            {"name": "BMW 5 Series", "price": "20000 €", "stock": 2},
        ]},
    ]

    def test_is_language_bearing_false_for_data_values(self):
        for msg in ("675849848", "achref@gmail.com", "اشرف", "tunis", "`'(é-è_ç", "", "   "):
            self.assertFalse(is_language_bearing_message(msg, self.CATALOG))

    def test_is_language_bearing_false_for_bare_catalog_product(self):
        self.assertFalse(is_language_bearing_message("Toyota Corolla", self.CATALOG))
        self.assertFalse(is_language_bearing_message("BMW 5 Series", self.CATALOG))
        self.assertFalse(is_language_bearing_message("Toyota Corolla !", self.CATALOG))

    def test_is_language_bearing_true_for_sentences(self):
        for msg in ("نحب نعدي كوموند", "شنوما الأسعار؟", "Je voudrais modifier mon adresse",
                    "Can you help me?", "ما نحبش هذا المنتج"):
            self.assertTrue(is_language_bearing_message(msg, self.CATALOG))

    def test_sentence_containing_product_is_language_bearing(self):
        for msg in ("نحب Toyota Corolla", "Je veux Toyota Corolla", "n7eb Toyota Corolla"):
            self.assertTrue(is_language_bearing_message(msg, self.CATALOG))

    def test_bare_product_never_establishes_anchor(self):
        history = [
            {"sender": "user", "text": "نحب نعدي كوموند"},
            {"sender": "bot", "text": "حاضر! شنو تحب تطلب؟"},
        ]
        self.assertEqual(
            pick_language_source_message(history, "Toyota Corolla", self.CATALOG), "نحب نعدي كوموند"
        )
        self.assertEqual(
            pick_language_source_message(history, "BMW 5 Series", self.CATALOG), "نحب نعدي كوموند"
        )

    def test_sentence_with_product_is_its_own_source(self):
        history = [{"sender": "user", "text": "نحب نعدي كوموند"}, {"sender": "bot", "text": "حاضر!"}]
        for msg in ("نحب Toyota Corolla", "Je veux Toyota Corolla", "n7eb Toyota Corolla"):
            self.assertEqual(pick_language_source_message(history, msg, self.CATALOG), msg)

    def test_data_values_preserve_anchor(self):
        history = [{"sender": "user", "text": "نحب نعدي كوموند"}, {"sender": "bot", "text": "حاضر!"}]
        for msg in ("اشرف", "675849848", "mahdia", "achref@gmail.com", "`'(é-è_ç"):
            self.assertEqual(pick_language_source_message(history, msg, self.CATALOG), "نحب نعدي كوموند")

    def test_genuine_switch_updates_anchor(self):
        history = [
            {"sender": "user", "text": "نحب نعدي كوموند"},
            {"sender": "bot", "text": "حاضر!"},
            {"sender": "user", "text": "Je veux changer l'adresse"},
            {"sender": "bot", "text": "Bien sûr !"},
        ]
        # Un numéro après le message français conserve la langue française.
        self.assertEqual(
            pick_language_source_message(history, "675849848", self.CATALOG),
            "Je veux changer l'adresse",
        )
        # Et on peut rebasculer en arabe/darija.
        history.append({"sender": "user", "text": "ما نعرفش"})
        history.append({"sender": "bot", "text": "علاش؟"})
        self.assertEqual(
            pick_language_source_message(history, "achref@gmail.com", self.CATALOG), "ما نعرفش"
        )

    def test_most_recent_language_bearing_message_wins(self):
        history = [
            {"sender": "user", "text": "Je veux commander"},
            {"sender": "bot", "text": "OK"},
            {"sender": "user", "text": "نحب نعدي كوموند"},
            {"sender": "bot", "text": "حاضر!"},
            {"sender": "user", "text": "Toyota Corolla"},
        ]
        self.assertEqual(pick_language_source_message(history, "اشرف", self.CATALOG), "نحب نعدي كوموند")

    def test_fallback_current_when_no_history(self):
        self.assertEqual(pick_language_source_message([], "Toyota Corolla", self.CATALOG), "Toyota Corolla")
        self.assertEqual(pick_language_source_message([], "675849848", self.CATALOG), "675849848")


class ConversationLanguageContinuityTests(TestCase):
    """Phase 4 : la langue de la conversation reste stable pendant une commande
    quand l'utilisateur fournit uniquement des données (produit nu, nom, téléphone,
    adresse, email). Le bug historique : "Toyota Corolla" classé français par le
    détecteur faisait basculer toute la suite en français."""

    CATALOG = [
        {"name": "Voitures", "products": [
            {"name": "Toyota Corolla", "price": "12000 €", "stock": 4},
            {"name": "BMW 5 Series", "price": "20000 €", "stock": 2},
        ]},
    ]

    def _assert_stable_flow(self, seed, default_lang, expect_lang, expect_style):
        state = {}
        history = []
        detected_sources = []
        metas = []
        order_ready = None
        for msg in (seed, "Toyota Corolla", "اشرف", "675849848", "mahdia", "achref@gmail.com"):
            calls = []

            def recorder(messages, **_kwargs):
                calls.append(messages)
                system = messages[0]["content"]
                if system == INTENT_SYSTEM_PROMPT:
                    current = messages[-1]["content"]
                    if current == seed:
                        return json.dumps({"intent": "start_order", "product_name": "", "quantity": None})
                    return json.dumps({"intent": "start_order", "product_name": "Toyota Corolla", "quantity": 1})
                if "détecteur de langue" in system:
                    src = messages[-1]["content"]
                    detected_sources.append(src)
                    # Simule le bug historique : le détecteur classerait le produit
                    # nu en français s'il lui était soumis.
                    if src == "Toyota Corolla":
                        return json.dumps({"language": "fr", "script": "latin", "style": "french",
                                           "is_language_question": False})
                    return json.dumps(default_lang)
                return json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False)

            with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
                result = handle_chat_message("proj", self.CATALOG, history, msg, state)
            for key, value in (result.get("order_details") or {}).items():
                if key == "quantity":
                    if isinstance(value, int) and value >= 1:
                        state[key] = value
                elif isinstance(value, str) and value.strip():
                    state[key] = value
            rc = _reply_call(calls)
            lang = re.search(r"RESPONSE_LANGUAGE: ([^\n]+)", rc[0]["content"]).group(1)
            style = re.search(r"RESPONSE_STYLE: ([^\n]+)", rc[0]["content"]).group(1)
            metas.append((lang, style))
            order_ready = result.get("order_ready")
            history.append({"sender": "user", "text": msg})
            history.append({"sender": "bot", "text": result.get("reply", "")})
        return detected_sources, metas, state, order_ready

    def _assert_language_preserved(self, seed, default_lang, expect_lang, expect_style):
        detected, metas, state, ready = self._assert_stable_flow(seed, default_lang, expect_lang, expect_style)
        self.assertNotIn("Toyota Corolla", detected)
        self.assertTrue(all(lang == expect_lang for lang, _ in metas), metas)
        self.assertTrue(all(style == expect_style for _, style in metas), metas)
        self.assertEqual(state.get("product_name"), "Toyota Corolla")
        self.assertEqual(state.get("name"), "اشرف")
        self.assertEqual(state.get("phone"), "675849848")
        self.assertEqual(state.get("address"), "mahdia")
        self.assertEqual(state.get("email"), "achref@gmail.com")
        self.assertIs(ready, True)

    def test_darija_flow_preserves_darija(self):
        self._assert_language_preserved(
            "نحب نعدي كوموند",
            {"language": "ar", "script": "arabic", "style": "tunisian_darija", "is_language_question": False},
            "Arabic", "Tunisian Darija",
        )

    def test_arabic_flow_preserves_msa(self):
        self._assert_language_preserved(
            "أريد تقديم طلب سيارة",
            {"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False},
            "Arabic", "Modern Standard Arabic",
        )

    def test_french_flow_preserves_french(self):
        self._assert_language_preserved(
            "Je veux commander une voiture",
            {"language": "fr", "script": "latin", "style": "french", "is_language_question": False},
            "French", "French",
        )

    def test_arabizi_flow_preserves_arabizi(self):
        self._assert_language_preserved(
            "n7eb n3adi commande",
            {"language": "ar", "script": "latin", "style": "arabizi", "is_language_question": False},
            "Arabic", "Tunisian Arabizi",
        )

    def test_genuine_switch_mid_order(self):
        state = {"product_name": "Toyota Corolla"}
        history = [
            {"sender": "user", "text": "نحب نعدي كوموند"},
            {"sender": "bot", "text": "حاضر!"},
        ]
        sources = []

        def lang_for(src):
            if src == "نحب نعدي كوموند":
                return {"language": "ar", "script": "arabic", "style": "tunisian_darija",
                        "is_language_question": False}
            if src == "Je veux changer l'adresse":
                return {"language": "fr", "script": "latin", "style": "french", "is_language_question": False}
            return {"language": "ar", "script": "arabic", "style": "msa", "is_language_question": False}

        metas = []
        for msg in ("Je veux changer l'adresse", "675849848"):
            calls = []

            def recorder(messages, **_kwargs):
                calls.append(messages)
                if "détecteur de langue" in messages[0]["content"]:
                    src = messages[-1]["content"]
                    sources.append(src)
                    return json.dumps(lang_for(src))
                return json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False)

            with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
                handle_chat_message("proj", self.CATALOG, history, msg, state)
            rc = _reply_call(calls)
            metas.append(re.search(r"RESPONSE_LANGUAGE: ([^\n]+)", rc[0]["content"]).group(1))
            history.append({"sender": "user", "text": msg})
            history.append({"sender": "bot", "text": "ok"})
        # Le message français change l'ancre, puis le numéro conserve le français.
        self.assertEqual(metas, ["French", "French"])
        self.assertEqual(sources, ["Je veux changer l'adresse", "Je veux changer l'adresse"])


class CatalogAuthorityTests(TestCase):
    """Phase 4 : le catalogue est la source de vérité des prix/stocks. Le reply ne
    doit jamais être autorisé à inventer un prix, un stock ou un produit absent."""

    def test_catalog_authority_rule_requires_catalog_facts(self):
        block = _CATALOG_AUTHORITY.lower()
        self.assertIn("catalogue", block)
        self.assertIn("prix", block)
        self.assertIn("stock", block)
        self.assertIn("n'invente", block)
        self.assertIn("ne le trouves pas", block)

    def test_catalog_authority_block_appended_when_catalog_injected(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if system == INTENT_SYSTEM_PROMPT:
                return json.dumps({"intent": "greeting", "product_name": "", "quantity": None})
            if "détecteur de langue" in system:
                return json.dumps({"language": "fr", "script": "latin", "style": "french", "is_language_question": False})
            return json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False)

        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            handle_chat_message("proj", CATALOG, [], "bonjour", {})
        rc = _reply_call(calls)
        self.assertIn("CATALOGUE DES PRODUITS", rc[0]["content"])
        self.assertIn("RÈGLE ANTI-HALLUCINATION", rc[0]["content"])
    def test_catalog_authority_absent_during_order_flow(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if "détecteur de langue" in system:
                return json.dumps({"language": "fr", "script": "latin", "style": "french", "is_language_question": False})
            return json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False)

        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            handle_chat_message("proj", CATALOG, [], "Amin", {"product_name": "Champignons"})
        rc = _reply_call(calls)
        self.assertNotIn("CATALOGUE DES PRODUITS", rc[0]["content"])
        self.assertNotIn("RÈGLE ANTI-HALLUCINATION", rc[0]["content"])

    def test_not_in_catalog_fact_appended_for_unknown_inquiry(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if system == INTENT_SYSTEM_PROMPT:
                return json.dumps({"intent": "product_inquiry", "product_name": "riz", "quantity": None})
            if "détecteur de langue" in system:
                return json.dumps({"language": "fr", "script": "latin", "style": "french", "is_language_question": False})
            return json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False)

        with patch("api.services.chatbot.handler._call_chatbot_llm", side_effect=recorder):
            handle_chat_message("proj", CATALOG, [], "combien coûte le riz ?", {})
        rc = _reply_call(calls)
        self.assertIn("aucun produit du CATALOGUE", rc[0]["content"])

    def test_no_not_in_catalog_fact_when_catalog_product_mentioned(self):
        calls = []

        def recorder(messages, **_kwargs):
            calls.append(messages)
            system = messages[0]["content"]
            if system == INTENT_SYSTEM_PROMPT:
                return json.dumps({"intent": "product_inquiry", "product_name": "Champignons", "quantity": None})
            if "détecteur de langue" in system:
                return json.dumps({"language": "fr", "script": "latin", "style": "french", "is_language_question": False})
            return json.dumps({"reply": "ok", "order_ready": False, "order_details": {}}, ensure_ascii=False)


class WebsiteGenerationCacheTests(TestCase):
    def setUp(self):
        from api.services.site_generation import clear_generation_cache
        clear_generation_cache()

    def tearDown(self):
        from api.services.site_generation import clear_generation_cache
        clear_generation_cache()

    def test_category_detection_french_and_english_variations(self):
        from api.services.site_generation import detect_category

        # Coffee shop variations
        self.assertEqual(detect_category("un site web pour un cafe shop"), "coffee_shop")
        self.assertEqual(detect_category("créez un site web pour mon cafe"), "coffee_shop")
        self.assertEqual(detect_category("je veux un site pour un café"), "coffee_shop")
        self.assertEqual(detect_category("create a coffee shop website"), "coffee_shop")
        self.assertEqual(detect_category("créez un site pour mon café avec un style moderne"), "coffee_shop")
        self.assertEqual(detect_category("barista coffee house"), "coffee_shop")

        # Bakery variations
        self.assertEqual(detect_category("un site pour une boulangerie"), "bakery")
        self.assertEqual(detect_category("boulangerie artisanale et pâtisserie"), "bakery")
        self.assertEqual(detect_category("create a bakery website"), "bakery")
        self.assertEqual(detect_category("site pour ma patisserie"), "bakery")

        # Restaurant variations
        self.assertEqual(detect_category("un site web pour un restaurant"), "restaurant")
        self.assertEqual(detect_category("créer un site pour mon resto"), "restaurant")
        self.assertEqual(detect_category("une pizzeria napolitaine"), "restaurant")

        # Pet shop variations
        self.assertEqual(detect_category("une animalerie en ligne"), "pet_shop")
        self.assertEqual(detect_category("boutique pour animaux et chiens"), "pet_shop")
        self.assertEqual(detect_category("create a pet shop website"), "pet_shop")

        # Lawyer variations
        self.assertEqual(detect_category("cabinet d'avocat et conseil juridique"), "lawyer")
        self.assertEqual(detect_category("law firm and attorney website"), "lawyer")

        # Grocery variations
        self.assertEqual(detect_category("vente de fruits et légumes"), "grocery")
        self.assertEqual(detect_category("primeur et légumes bio"), "grocery")

        # Unrecognized / generic
        self.assertIsNone(detect_category("un site pour une navette spatiale"))
        self.assertIsNone(detect_category(""))

    def test_first_request_generates_and_caches(self):
        from rest_framework.test import APIClient
        from api.services.site_generation import get_cached_generation

        client = APIClient()
        mock_hp = {
            "theme": {"primary_color": "#123456", "font_family": "serif"},
            "sections": [{"id": "navbar_1", "type": "navbar", "brand_name": "Mon Café"}],
        }
        mock_cat = [
            {"name": "Boissons", "products": [{"name": "Espresso", "price": "2.50 €", "stock": 10}]}
        ]

        with patch("api.views.generate_homepage_config", return_value=mock_hp) as mock_hp_call, \
             patch("api.views.generate_catalog_config", return_value=mock_cat) as mock_cat_call:
            response = client.post("/api/generate/", {"prompt": "un site web pour un cafe shop"}, format="json")

        self.assertEqual(response.status_code, 200)
        mock_hp_call.assert_called_once()
        mock_cat_call.assert_called_once()

        data = response.json()
        self.assertEqual(data["theme"]["primary_color"], "#123456")
        self.assertEqual(data["sections"][0]["brand_name"], "Mon Café")
        self.assertEqual(data["catalog"][0]["name"], "Boissons")
        self.assertEqual(data["original_prompt"], "un site web pour un cafe shop")

        # Cache should be populated (keyed by normalized prompt, not category)
        from api.services.site_generation.cache import normalize_text
        cached = get_cached_generation("un site web pour un cafe shop")
        self.assertIsNotNone(cached)
        self.assertEqual(cached["theme"]["primary_color"], "#123456")

    def test_second_request_uses_cache_and_skips_llm(self):
        from rest_framework.test import APIClient
        from api.views import DEFAULT_DRAFT_PROJECT_NAME

        client = APIClient()
        mock_hp = {
            "theme": {"primary_color": "#78350f", "font_family": "serif"},
            "sections": [{"id": "navbar_1", "type": "navbar", "brand_name": "Café de Paris"}],
        }
        mock_cat = [
            {"name": "Cafés", "products": [{"name": "Cappuccino", "price": "3.50 €", "stock": 15}]}
        ]

        prompt = "créez un site web pour mon cafe"

        # First request (cache miss -> calls LLM)
        with patch("api.views.generate_homepage_config", return_value=mock_hp) as mock_hp_call, \
             patch("api.views.generate_catalog_config", return_value=mock_cat) as mock_cat_call:
            res1 = client.post("/api/generate/", {"prompt": prompt}, format="json")

        self.assertEqual(res1.status_code, 200)
        self.assertEqual(mock_hp_call.call_count, 1)
        self.assertEqual(mock_cat_call.call_count, 1)

        # Second request with the SAME prompt (cache hit -> skips LLM)
        with patch("api.views.generate_homepage_config") as mock_hp_call2, \
             patch("api.views.generate_catalog_config") as mock_cat_call2:
            res2 = client.post("/api/generate/", {"prompt": prompt}, format="json")

        self.assertEqual(res2.status_code, 200)
        # LLM generators must NOT have been called
        mock_hp_call2.assert_not_called()
        mock_cat_call2.assert_not_called()

        data2 = res2.json()
        self.assertEqual(data2["theme"]["primary_color"], "#78350f")
        self.assertEqual(data2["sections"][0]["brand_name"], "Café de Paris")
        self.assertEqual(data2["catalog"][0]["name"], "Cafés")
        self.assertEqual(data2["original_prompt"], prompt)

        # Draft project should reflect the prompt
        draft = Project.objects.get(name=DEFAULT_DRAFT_PROJECT_NAME)
        self.assertEqual(draft.original_prompt, prompt)

    def test_different_categories_do_not_reuse_each_other(self):
        """Two distinct prompts each generate and cache their own record separately."""
        from rest_framework.test import APIClient
        from api.services.site_generation.cache import normalize_text
        from api.models import GeneratedSiteCache

        client = APIClient()
        bakery_hp = {"theme": {"primary_color": "#b45309"}, "sections": [{"id": "1", "type": "navbar", "brand_name": "La Boulangerie"}]}
        bakery_cat = [{"name": "Pains", "products": [{"name": "Baguette", "price": "1.30 €", "stock": 10}]}]
        pet_hp = {"theme": {"primary_color": "#047857"}, "sections": [{"id": "1", "type": "navbar", "brand_name": "Animal Kingdom"}]}
        pet_cat = [{"name": "Chiens", "products": [{"name": "Croquettes", "price": "20.00 €", "stock": 5}]}]

        bakery_prompt = "un site pour une boulangerie"
        pet_prompt = "un site pour une animalerie"

        # Generate bakery
        with patch("api.views.generate_homepage_config", return_value=bakery_hp), \
             patch("api.views.generate_catalog_config", return_value=bakery_cat):
            res_bakery = client.post("/api/generate/", {"prompt": bakery_prompt}, format="json")

        # Generate pet shop
        with patch("api.views.generate_homepage_config", return_value=pet_hp), \
             patch("api.views.generate_catalog_config", return_value=pet_cat):
            res_pet = client.post("/api/generate/", {"prompt": pet_prompt}, format="json")

        self.assertEqual(res_bakery.json()["theme"]["primary_color"], "#b45309")
        self.assertEqual(res_pet.json()["theme"]["primary_color"], "#047857")

        # Verify each prompt's cached response is distinct
        with patch("api.views.generate_homepage_config") as mock_hp, \
             patch("api.views.generate_catalog_config") as mock_cat:
            res_bakery_cached = client.post("/api/generate/", {"prompt": bakery_prompt}, format="json")
            res_pet_cached = client.post("/api/generate/", {"prompt": pet_prompt}, format="json")

        mock_hp.assert_not_called()
        mock_cat.assert_not_called()
        self.assertEqual(res_bakery_cached.json()["theme"]["primary_color"], "#b45309")
        self.assertEqual(res_pet_cached.json()["theme"]["primary_color"], "#047857")

    def test_cache_mutation_safety(self):
        from api.services.site_generation import get_cached_generation, set_cached_generation

        prompt = "un site web pour un cafe shop"
        original_data = {
            "theme": {"primary_color": "#111111"},
            "sections": [{"id": "s1", "type": "hero", "title": "Original Title"}],
            "catalog": [{"name": "Cat1", "products": []}],
            "original_prompt": prompt,
        }
        set_cached_generation(prompt, original_data)

        retrieved1 = get_cached_generation(prompt)
        # Mutate retrieved1
        retrieved1["theme"]["primary_color"] = "#999999"
        retrieved1["sections"][0]["title"] = "Modified Title"

        # Subsequent retrieval must still have original values
        retrieved2 = get_cached_generation(prompt)
        self.assertEqual(retrieved2["theme"]["primary_color"], "#111111")
        self.assertEqual(retrieved2["sections"][0]["title"], "Original Title")

    def test_generate_homepage_endpoint(self):
        from rest_framework.test import APIClient
        client = APIClient()
        mock_hp = {
            "theme": {"primary_color": "#ff0000", "font_family": "sans-serif"},
            "sections": [{"id": "navbar_1", "type": "navbar", "brand_name": "Test Brand"}],
        }

        with patch("api.views.generate_homepage_config", return_value=mock_hp) as mock_hp_call:
            response = client.post("/api/generate-homepage/", {"prompt": "un site moderne"}, format="json")

        self.assertEqual(response.status_code, 200)
        mock_hp_call.assert_called_once()
        data = response.json()
        self.assertEqual(data["theme"]["primary_color"], "#ff0000")
        self.assertEqual(data["sections"][0]["brand_name"], "Test Brand")
        self.assertEqual(data["original_prompt"], "un site moderne")

    def test_generate_catalog_endpoint(self):
        from rest_framework.test import APIClient
        client = APIClient()
        mock_cat = [
            {"name": "Produits", "products": [{"name": "Article 1", "price": "10 €", "stock": 5}]}
        ]

        with patch("api.views.generate_catalog_config", return_value=mock_cat) as mock_cat_call:
            response = client.post(
                "/api/generate-catalog/",
                {"prompt": "un site moderne", "brand_name": "Test Brand", "homepage_context": "brand: Test Brand. "},
                format="json"
            )

        self.assertEqual(response.status_code, 200)
        mock_cat_call.assert_called_once()
        data = response.json()
        self.assertEqual(len(data["catalog"]), 1)
        self.assertEqual(data["catalog"][0]["name"], "Produits")
        self.assertEqual(data["catalog"][0]["products"][0]["name"], "Article 1")

    def test_sequential_generation_persists_to_db_only_after_catalog_completes(self):
        from rest_framework.test import APIClient
        from api.models import GeneratedSiteCache
        from api.services.site_generation.cache import normalize_text
        client = APIClient()
        GeneratedSiteCache.objects.all().delete()

        prompt = "boulangerie artisanale a Lyon"
        mock_hp = {
            "theme": {"primary_color": "#8b5cf6"},
            "sections": [{"id": "nav_1", "type": "navbar", "brand_name": "Bakery Test"}],
        }
        mock_cat = [
            {"name": "Viennoiseries", "products": [{"name": "Croissant", "price": "1.50 €", "stock": 5}]}
        ]

        # Stage 1: Generate homepage
        with patch("api.views.generate_homepage_config", return_value=mock_hp) as mock_hp_call:
            res1 = client.post("/api/generate-homepage/", {"prompt": prompt}, format="json")
        self.assertEqual(res1.status_code, 200)
        mock_hp_call.assert_called_once()

        # Reusable template must NOT be saved in DB yet (because catalog is not generated yet)
        self.assertFalse(GeneratedSiteCache.objects.filter(prompt_key=normalize_text(prompt)).exists())

        # Stage 2: Generate catalog
        with patch("api.views.generate_catalog_config", return_value=mock_cat) as mock_cat_call:
            res2 = client.post(
                "/api/generate-catalog/",
                {"prompt": prompt, "brand_name": "Bakery Test"},
                format="json"
            )
        self.assertEqual(res2.status_code, 200)
        mock_cat_call.assert_called_once()

        # Reusable template MUST NOW be saved in DB!
        cached_entry = GeneratedSiteCache.objects.filter(prompt_key=normalize_text(prompt)).first()
        self.assertIsNotNone(cached_entry)
        self.assertEqual(cached_entry.theme["primary_color"], "#8b5cf6")
        self.assertEqual(cached_entry.sections[0]["brand_name"], "Bakery Test")
        self.assertEqual(cached_entry.catalog[0]["name"], "Viennoiseries")

        # Now test that the SAME prompt reuses the DB cache
        with patch("api.views.generate_homepage_config") as mock_hp2, \
             patch("api.views.generate_catalog_config") as mock_cat2:
            res3_hp = client.post("/api/generate-homepage/", {"prompt": prompt}, format="json")
            res3_cat = client.post("/api/generate-catalog/", {"prompt": prompt}, format="json")

        self.assertEqual(res3_hp.status_code, 200)
        self.assertEqual(res3_cat.status_code, 200)
        mock_hp2.assert_not_called()
        mock_cat2.assert_not_called()
        self.assertEqual(res3_hp.json()["sections"][0]["brand_name"], "Bakery Test")
        self.assertEqual(res3_cat.json()["catalog"][0]["name"], "Viennoiseries")


# ---------------------------------------------------------------------------
# Prompt-Based Persistent Cache Tests
# ---------------------------------------------------------------------------

class PromptBasedCacheTests(TestCase):
    """Tests for prompt-keyed GeneratedSiteCache persistence.

    Verifies all 10 required scenarios:
      1.  First generation saves to DB.
      2.  Same prompt reuses saved website (no LLM call).
      3.  Uppercase variation reuses same website.
      4.  Leading/trailing space variation reuses same website.
      5.  Different prompt creates a different DB record.
      6.  Saved website persists in DB (not just in-memory).
      7.  Stage 1 alone does NOT create a complete DB record.
      8.  After Stage 2, complete record (theme+sections+catalog) is in DB.
      9.  Cache hit on /api/generate-homepage/ skips LLM.
      10. Cache hit on /api/generate-catalog/ skips LLM.
    """

    def setUp(self):
        from api.models import GeneratedSiteCache
        GeneratedSiteCache.objects.all().delete()
        self.client_api = __import__('rest_framework.test', fromlist=['APIClient']).APIClient()

        self.mock_hp = {
            "theme": {"primary_color": "#6366f1", "font_family": "Inter"},
            "sections": [{"id": "nav_1", "type": "navbar", "brand_name": "PC Store"}],
        }
        self.mock_cat = [
            {"name": "Gaming PCs", "products": [{"name": "RTX 4090 Build", "price": "2499 €", "stock": 3}]}
        ]

    # ------------------------------------------------------------------
    # 1. First generation saves to DB
    # ------------------------------------------------------------------
    def test_1_first_generation_via_generate_endpoint_saves_to_db(self):
        from api.models import GeneratedSiteCache
        from api.services.site_generation.cache import normalize_text

        prompt = "create a website for selling PCs"
        with patch("api.views.generate_homepage_config", return_value=self.mock_hp), \
             patch("api.views.generate_catalog_config", return_value=self.mock_cat):
            response = self.client_api.post("/api/generate/", {"prompt": prompt}, format="json")

        self.assertEqual(response.status_code, 200)
        key = normalize_text(prompt)
        entry = GeneratedSiteCache.objects.filter(prompt_key=key).first()
        self.assertIsNotNone(entry, "Complete website should be saved in DB after /api/generate/")
        self.assertEqual(entry.theme["primary_color"], "#6366f1")
        self.assertEqual(entry.sections[0]["brand_name"], "PC Store")
        self.assertEqual(entry.catalog[0]["name"], "Gaming PCs")

    # ------------------------------------------------------------------
    # 2. Same prompt reuses saved website (no LLM call)
    # ------------------------------------------------------------------
    def test_2_same_prompt_reuses_db_record_no_llm(self):
        from api.models import GeneratedSiteCache
        from api.services.site_generation.cache import normalize_text, set_cached_generation

        prompt = "create a website for selling PCs"
        set_cached_generation(prompt, {
            "theme": self.mock_hp["theme"],
            "sections": self.mock_hp["sections"],
            "catalog": self.mock_cat,
            "original_prompt": prompt,
        })

        with patch("api.views.generate_homepage_config") as mock_hp, \
             patch("api.views.generate_catalog_config") as mock_cat:
            response = self.client_api.post("/api/generate/", {"prompt": prompt}, format="json")

        self.assertEqual(response.status_code, 200)
        mock_hp.assert_not_called()
        mock_cat.assert_not_called()
        data = response.json()
        self.assertEqual(data["theme"]["primary_color"], "#6366f1")
        self.assertEqual(data["catalog"][0]["name"], "Gaming PCs")

    # ------------------------------------------------------------------
    # 3. Uppercase variation reuses same website
    # ------------------------------------------------------------------
    def test_3_uppercase_variation_reuses_same_record(self):
        from api.services.site_generation.cache import set_cached_generation, get_cached_generation

        original = "create a website for selling PCs"
        set_cached_generation(original, {
            "theme": self.mock_hp["theme"],
            "sections": self.mock_hp["sections"],
            "catalog": self.mock_cat,
            "original_prompt": original,
        })

        upper = "CREATE A WEBSITE FOR SELLING PCS"
        result = get_cached_generation(upper)
        self.assertIsNotNone(result, "Uppercase variation should hit the same DB record")
        self.assertEqual(result["catalog"][0]["name"], "Gaming PCs")

    # ------------------------------------------------------------------
    # 4. Leading/trailing space variation reuses same website
    # ------------------------------------------------------------------
    def test_4_whitespace_variation_reuses_same_record(self):
        from api.services.site_generation.cache import set_cached_generation, get_cached_generation

        original = "create a website for selling PCs"
        set_cached_generation(original, {
            "theme": self.mock_hp["theme"],
            "sections": self.mock_hp["sections"],
            "catalog": self.mock_cat,
            "original_prompt": original,
        })

        padded = "  create  a  website  for  selling  PCs  "
        result = get_cached_generation(padded)
        self.assertIsNotNone(result, "Extra-space variation should hit the same DB record")
        self.assertEqual(result["theme"]["primary_color"], "#6366f1")

    # ------------------------------------------------------------------
    # 5. Different prompt creates different DB record
    # ------------------------------------------------------------------
    def test_5_different_prompt_creates_different_record(self):
        from api.models import GeneratedSiteCache
        from api.services.site_generation.cache import normalize_text

        mock_hp2 = {"theme": {"primary_color": "#ec4899"}, "sections": [{"id": "n2", "type": "navbar", "brand_name": "Café Lumière"}]}
        mock_cat2 = [{"name": "Boissons", "products": [{"name": "Espresso", "price": "2.50 €", "stock": 50}]}]

        with patch("api.views.generate_homepage_config", return_value=self.mock_hp), \
             patch("api.views.generate_catalog_config", return_value=self.mock_cat):
            self.client_api.post("/api/generate/", {"prompt": "create a website for selling PCs"}, format="json")

        with patch("api.views.generate_homepage_config", return_value=mock_hp2), \
             patch("api.views.generate_catalog_config", return_value=mock_cat2):
            self.client_api.post("/api/generate/", {"prompt": "create a coffee shop website"}, format="json")

        self.assertEqual(GeneratedSiteCache.objects.count(), 2)
        pc_entry = GeneratedSiteCache.objects.get(prompt_key=normalize_text("create a website for selling PCs"))
        coffee_entry = GeneratedSiteCache.objects.get(prompt_key=normalize_text("create a coffee shop website"))
        self.assertEqual(pc_entry.sections[0]["brand_name"], "PC Store")
        self.assertEqual(coffee_entry.sections[0]["brand_name"], "Café Lumière")

    # ------------------------------------------------------------------
    # 6. Saved website persists in DB (not just in-memory)
    # ------------------------------------------------------------------
    def test_6_saved_website_persists_in_db(self):
        """After saving, retrieving directly from DB model (not cache module) returns the data."""
        from api.models import GeneratedSiteCache
        from api.services.site_generation.cache import set_cached_generation, normalize_text

        prompt = "online electronics shop"
        set_cached_generation(prompt, {
            "theme": {"primary_color": "#0ea5e9"},
            "sections": [{"id": "n3", "type": "navbar", "brand_name": "ElectroPro"}],
            "catalog": [{"name": "Laptops", "products": []}],
            "original_prompt": prompt,
        })

        # Retrieve directly from Django ORM (bypasses any in-memory state)
        entry = GeneratedSiteCache.objects.get(prompt_key=normalize_text(prompt))
        self.assertEqual(entry.theme["primary_color"], "#0ea5e9")
        self.assertEqual(entry.sections[0]["brand_name"], "ElectroPro")
        self.assertEqual(entry.catalog[0]["name"], "Laptops")

    # ------------------------------------------------------------------
    # 7. Stage 1 alone does NOT create a complete DB record
    # ------------------------------------------------------------------
    def test_7_stage1_only_does_not_save_to_db(self):
        from api.models import GeneratedSiteCache
        from api.services.site_generation.cache import normalize_text

        prompt = "create a website for a flower shop"
        with patch("api.views.generate_homepage_config", return_value=self.mock_hp):
            response = self.client_api.post("/api/generate-homepage/", {"prompt": prompt}, format="json")

        self.assertEqual(response.status_code, 200)
        key = normalize_text(prompt)
        self.assertFalse(
            GeneratedSiteCache.objects.filter(prompt_key=key).exists(),
            "Stage 1 (homepage only) must NOT persist an incomplete template to DB",
        )

    # ------------------------------------------------------------------
    # 8. After Stage 2, complete record is in DB
    # ------------------------------------------------------------------
    def test_8_stage2_saves_complete_record_to_db(self):
        from api.models import GeneratedSiteCache
        from api.services.site_generation.cache import normalize_text

        prompt = "create a website for a flower shop"

        # Stage 1
        with patch("api.views.generate_homepage_config", return_value=self.mock_hp):
            self.client_api.post("/api/generate-homepage/", {"prompt": prompt}, format="json")

        # Stage 2
        with patch("api.views.generate_catalog_config", return_value=self.mock_cat):
            response = self.client_api.post(
                "/api/generate-catalog/",
                {"prompt": prompt, "brand_name": "PC Store"},
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        key = normalize_text(prompt)
        entry = GeneratedSiteCache.objects.filter(prompt_key=key).first()
        self.assertIsNotNone(entry, "Complete record must exist after Stage 2")
        # Both homepage sections and catalog must be present
        self.assertTrue(len(entry.sections) > 0, "sections must be populated")
        self.assertTrue(len(entry.catalog) > 0, "catalog must be populated")
        self.assertEqual(entry.catalog[0]["name"], "Gaming PCs")

    # ------------------------------------------------------------------
    # 9. Cache hit on /api/generate-homepage/ skips LLM
    # ------------------------------------------------------------------
    def test_9_homepage_endpoint_cache_hit_skips_llm(self):
        from api.services.site_generation.cache import set_cached_generation

        prompt = "create a website for selling PCs"
        set_cached_generation(prompt, {
            "theme": self.mock_hp["theme"],
            "sections": self.mock_hp["sections"],
            "catalog": self.mock_cat,
            "original_prompt": prompt,
        })

        with patch("api.views.generate_homepage_config") as mock_hp_fn:
            response = self.client_api.post("/api/generate-homepage/", {"prompt": prompt}, format="json")

        self.assertEqual(response.status_code, 200)
        mock_hp_fn.assert_not_called()
        data = response.json()
        self.assertEqual(data["sections"][0]["brand_name"], "PC Store")

    # ------------------------------------------------------------------
    # 10. Cache hit on /api/generate-catalog/ skips LLM
    # ------------------------------------------------------------------
    def test_10_catalog_endpoint_cache_hit_skips_llm(self):
        from api.services.site_generation.cache import set_cached_generation

        prompt = "create a website for selling PCs"
        set_cached_generation(prompt, {
            "theme": self.mock_hp["theme"],
            "sections": self.mock_hp["sections"],
            "catalog": self.mock_cat,
            "original_prompt": prompt,
        })

        with patch("api.views.generate_catalog_config") as mock_cat_fn:
            response = self.client_api.post("/api/generate-catalog/", {"prompt": prompt}, format="json")

        self.assertEqual(response.status_code, 200)
        mock_cat_fn.assert_not_called()
        data = response.json()
        self.assertEqual(data["catalog"][0]["name"], "Gaming PCs")


# ---------------------------------------------------------------------------
# Smarter Website Cache Matching Tests (Conservative Scoring-Based Similarity)
# ---------------------------------------------------------------------------

class SmarterCacheMatchingTests(TestCase):
    """Tests for scoring-based prompt similarity matching in GeneratedSiteCache.

    Guarantees:
      1. Phrasing variations with same business concept reuse existing site (CACHE HIT).
      2. Different business domains NEVER reuse each other (CACHE MISS, score = 0.0).
      3. Categorized vs Uncategorized prompts NEVER collide (CACHE MISS, score = 0.0).
      4. Sub-domain conflicts within same category (e.g. sushi vs pizza) do NOT collide.
      5. Uncategorized distinct concepts (e.g. vélos vs voitures) do NOT collide.
      6. Generic stopword-only prompts do not false-positive match.
      7. API endpoints (/api/generate/, /api/generate-homepage/) reuse cached site on phrasing variations.
    """

    def setUp(self):
        from api.models import GeneratedSiteCache
        GeneratedSiteCache.objects.all().delete()
        self.client_api = __import__('rest_framework.test', fromlist=['APIClient']).APIClient()

        self.mock_hp = {
            "theme": {"primary_color": "#b91c1c", "font_family": "serif"},
            "sections": [{"id": "nav_1", "type": "navbar", "brand_name": "Le Gourmet"}],
        }
        self.mock_cat = [
            {"name": "Entrées", "products": [{"name": "Salade", "price": "8.50 €", "stock": 10}]}
        ]

    # --- Unit Tests for calculate_prompt_similarity ---

    def test_phrasing_variations_restaurant_high_score(self):
        from api.services.site_generation.cache import calculate_prompt_similarity, SIMILARITY_THRESHOLD

        p1 = "créez un site web pour un restaurant"
        p2 = "donner un site pour mon restaurant"
        p3 = "faire un site internet de restaurant"
        p4 = "je veux un site pour restaurant"
        p5 = "create a website for a restaurant"

        for other in [p2, p3, p4, p5]:
            score = calculate_prompt_similarity(p1, other)
            self.assertGreaterEqual(score, SIMILARITY_THRESHOLD, f"Failed for {other} with score {score}")

    def test_phrasing_variations_cafe_high_score(self):
        from api.services.site_generation.cache import calculate_prompt_similarity, SIMILARITY_THRESHOLD

        p1 = "un site web pour un cafe shop"
        p2 = "creer un site pour mon cafe"
        score = calculate_prompt_similarity(p1, p2)
        self.assertGreaterEqual(score, SIMILARITY_THRESHOLD, f"Score {score} was below threshold")

    def test_phrasing_variations_bakery_high_score(self):
        from api.services.site_generation.cache import calculate_prompt_similarity, SIMILARITY_THRESHOLD

        p1 = "site pour une boulangerie"
        p2 = "créer un site web pour ma boulangerie"
        score = calculate_prompt_similarity(p1, p2)
        self.assertGreaterEqual(score, SIMILARITY_THRESHOLD, f"Score {score} was below threshold")

    def test_false_positive_rejection_restaurant_vs_cafe(self):
        from api.services.site_generation.cache import calculate_prompt_similarity, SIMILARITY_THRESHOLD

        p_rest = "créez un site web pour un restaurant"
        p_cafe = "créez un site web pour un cafe"

        score = calculate_prompt_similarity(p_rest, p_cafe)
        self.assertEqual(score, 0.0, "Restaurant and Café must have score 0.0 (cross-domain rejection)")
        self.assertLess(score, SIMILARITY_THRESHOLD)

    def test_false_positive_rejection_cross_domains(self):
        from api.services.site_generation.cache import calculate_prompt_similarity

        domain_pairs = [
            ("site pour un restaurant", "site pour une boulangerie"),
            ("site pour une animalerie", "site pour une boulangerie"),
            ("cabinet d'avocat à Paris", "agence immobilière à Paris"),
            ("boutique de vêtements", "salle de sport et musculation"),
            ("salon de coiffure et beauté", "librairie de livres rares"),
        ]

        for prompt_a, prompt_b in domain_pairs:
            score = calculate_prompt_similarity(prompt_a, prompt_b)
            self.assertEqual(score, 0.0, f"Expected 0.0 for '{prompt_a}' vs '{prompt_b}', got {score}")

    def test_false_positive_rejection_categorized_vs_uncategorized(self):
        from api.services.site_generation.cache import calculate_prompt_similarity

        score = calculate_prompt_similarity("site pour un restaurant", "site pour une navette spatiale")
        self.assertEqual(score, 0.0)

        score2 = calculate_prompt_similarity("site pour vente de guitares", "site pour un cafe")
        self.assertEqual(score2, 0.0)

    def test_subdomain_modifier_conflict_within_same_category(self):
        from api.services.site_generation.cache import calculate_prompt_similarity, SIMILARITY_THRESHOLD

        p_pizza = "site restaurant pizza"
        p_sushi = "site restaurant sushi"

        score = calculate_prompt_similarity(p_pizza, p_sushi)
        self.assertLess(score, SIMILARITY_THRESHOLD, f"Expected conflict rejection for sushi vs pizza, got {score}")

    def test_uncategorized_matching_and_rejection(self):
        from api.services.site_generation.cache import calculate_prompt_similarity, SIMILARITY_THRESHOLD

        p1 = "site pour vente de velos electriques"
        p2 = "creer un site de vente de velos electriques"
        p3 = "site pour vente de voitures electriques"

        score_match = calculate_prompt_similarity(p1, p2)
        self.assertGreaterEqual(score_match, SIMILARITY_THRESHOLD, f"Expected match for {p2}, got {score_match}")

        score_mismatch = calculate_prompt_similarity(p1, p3)
        self.assertLess(score_mismatch, SIMILARITY_THRESHOLD, f"Expected mismatch for {p3}, got {score_mismatch}")

    def test_generic_and_empty_prompts_safety(self):
        from api.services.site_generation.cache import calculate_prompt_similarity

        self.assertEqual(calculate_prompt_similarity("site web", "faire un site"), 0.0)
        self.assertEqual(calculate_prompt_similarity("", "site restaurant"), 0.0)
        self.assertEqual(calculate_prompt_similarity(None, "site restaurant"), 0.0)

    # --- End-to-End Database and API Tests ---

    def test_smart_cache_hit_on_restaurant_phrasing_variation(self):
        from api.services.site_generation.cache import set_cached_generation, get_cached_generation

        original_prompt = "créez un site web pour un restaurant"
        set_cached_generation(original_prompt, {
            "theme": self.mock_hp["theme"],
            "sections": self.mock_hp["sections"],
            "catalog": self.mock_cat,
            "original_prompt": original_prompt,
        })

        # Query with different wording
        query_prompt = "donner un site pour mon restaurant"
        cached = get_cached_generation(query_prompt)

        self.assertIsNotNone(cached, "Should find cached restaurant template via smart scoring")
        self.assertEqual(cached["theme"]["primary_color"], "#b91c1c")
        self.assertEqual(cached["sections"][0]["brand_name"], "Le Gourmet")
        self.assertEqual(cached["catalog"][0]["name"], "Entrées")

    def test_smart_cache_miss_on_cafe_when_restaurant_is_cached(self):
        from api.services.site_generation.cache import set_cached_generation, get_cached_generation

        rest_prompt = "créez un site web pour un restaurant"
        set_cached_generation(rest_prompt, {
            "theme": self.mock_hp["theme"],
            "sections": self.mock_hp["sections"],
            "catalog": self.mock_cat,
            "original_prompt": rest_prompt,
        })

        # Query for café must NOT reuse restaurant
        cafe_query = "créez un site web pour un cafe"
        cached = get_cached_generation(cafe_query)
        self.assertIsNone(cached, "Café query must NOT reuse restaurant cached template")

    def test_api_generate_endpoint_reuses_site_on_phrasing_variation(self):
        from api.services.site_generation.cache import set_cached_generation

        original = "créez un site web pour un restaurant"
        set_cached_generation(original, {
            "theme": self.mock_hp["theme"],
            "sections": self.mock_hp["sections"],
            "catalog": self.mock_cat,
            "original_prompt": original,
        })

        query = "donner un site pour mon restaurant"

        with patch("api.views.generate_homepage_config") as mock_hp_call, \
             patch("api.views.generate_catalog_config") as mock_cat_call:
            response = self.client_api.post("/api/generate/", {"prompt": query}, format="json")

        self.assertEqual(response.status_code, 200)
        # LLM must NOT be called
        mock_hp_call.assert_not_called()
        mock_cat_call.assert_not_called()

        data = response.json()
        self.assertEqual(data["theme"]["primary_color"], "#b91c1c")
        self.assertEqual(data["sections"][0]["brand_name"], "Le Gourmet")





