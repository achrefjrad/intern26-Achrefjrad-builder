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
    class _FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "message": {
                    "content": json.dumps(
                        {
                            "reply": "Merci ! Quel est votre numéro de téléphone ?",
                            "order_ready": False,
                            "order_details": {"name": "FAUX-NOM-LLM"},
                        },
                        ensure_ascii=False,
                    )
                }
            }

    @patch("api.ai_service.requests.post")
    def test_state_is_authoritative_over_llm(self, mock_post):
        mock_post.return_value = self._FakeResponse()
        result = handle_chat_message(
            "proj", CATALOG, [], "aded djja", {"product_name": "Champignons"}
        )
        # L'état déterministe écrase les order_details du LLM.
        self.assertEqual(result["order_details"].get("name"), "aded djja")
        self.assertEqual(result["order_details"].get("product_name"), "Champignons")
        self.assertIs(result["order_ready"], False)

    @patch("api.ai_service.requests.post")
    def test_order_ready_deterministic(self, mock_post):
        mock_post.return_value = self._FakeResponse()
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