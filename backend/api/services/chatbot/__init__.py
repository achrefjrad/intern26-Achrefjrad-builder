# Chatbot subpackage
from .handler import handle_chat_message, build_reply_context, build_reply_action, reply_requires_catalog
from .order_state import (
    ORDER_FLOW_FIELDS,
    normalize_order_state,
    apply_order_message,
    get_next_missing_field,
    build_order_state_block,
    build_order_details,
)
from .extractors import (
    _NON_NAME_SIGNALS,
    _NAME_PREFIX_RE,
    _is_phone_like,
    _extract_phone,
    _is_email_like,
    _extract_email,
    _extract_quantity,
    _extract_name_value,
    _strip_phone,
    _clean_name_text,
    _looks_like_address,
)
from .catalog_matcher import (
    ACCENT_MAP,
    _normalize_product_label,
    match_product_in_catalog,
    summarize_catalog_for_chat,
)

__all__ = [
    "handle_chat_message",
    "build_reply_context",
    "build_reply_action",
    "reply_requires_catalog",
    "ORDER_FLOW_FIELDS",
    "normalize_order_state",
    "apply_order_message",
    "get_next_missing_field",
    "build_order_state_block",
    "build_order_details",
    "_NON_NAME_SIGNALS",
    "_NAME_PREFIX_RE",
    "_is_phone_like",
    "_extract_phone",
    "_is_email_like",
    "_extract_email",
    "_extract_quantity",
    "_extract_name_value",
    "_strip_phone",
    "_clean_name_text",
    "_looks_like_address",
    "ACCENT_MAP",
    "_normalize_product_label",
    "match_product_in_catalog",
    "summarize_catalog_for_chat",
]
