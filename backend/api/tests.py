import json
from unittest.mock import patch

from django.test import TestCase

from .ai_service import (
    normalize_order_state,
    apply_order_message,
    get_next_missing_field,
    build_order_details,
    handle_chat_message,
)
from .models import Order, OrderLine, Project, Category, Product
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