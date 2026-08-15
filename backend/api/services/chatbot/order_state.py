from .catalog_matcher import match_product_in_catalog
from .extractors import (
    _extract_quantity,
    _extract_email,
    _extract_phone,
    _extract_name_value,
    _clean_name_text,
    _strip_phone,
    _looks_like_address,
)

ORDER_FLOW_FIELDS = [
    ("product_name", "Produit"),
    ("name", "Nom"),
    ("phone", "Téléphone"),
    ("address", "Adresse"),
    ("email", "Email"),
]


def normalize_order_state(order_state):
    """Reconstruit l'état canonique (champ 'name' unique) depuis l'état reçu."""
    state = {}
    if not isinstance(order_state, dict):
        return state
    for key in ("product_name", "name", "phone", "address", "email"):
        val = order_state.get(key)
        if isinstance(val, str) and val.strip():
            state[key] = val.strip()
        elif val is not None and str(val).strip():
            state[key] = str(val).strip()
    first = str(order_state.get("first_name") or "").strip()
    last = str(order_state.get("last_name") or "").strip()
    if not state.get("name") and (first or last):
        state["name"] = " ".join(p for p in (first, last) if p).strip()
    try:
        qty = int(order_state.get("quantity", 1) or 1)
        state["quantity"] = qty if qty >= 1 else 1
    except (TypeError, ValueError):
        state["quantity"] = 1
    return state


def apply_order_message(state, user_message, catalog):
    """Applique le message utilisateur à l'état de commande de façon déterministe.

    Retourne le nouvel état (autoritatif, indépendant du modèle LLM).
    """
    state = dict(state)
    text = str(user_message or "").strip()
    if not text:
        return state

    product = match_product_in_catalog(catalog, text)
    if product:
        state["product_name"] = product

    qty = _extract_quantity(text, state.get("product_name"))
    if qty and 1 <= qty <= 999:
        state["quantity"] = qty

    email = _extract_email(text)
    if email:
        state["email"] = email
    phone = _extract_phone(text)
    if phone:
        state["phone"] = phone

    if not state.get("product_name"):
        return state

    next_key, _ = get_next_missing_field(state)

    if next_key == "name":
        name = _extract_name_value(text)
        if not name:
            name = _clean_name_text(_strip_phone(text).strip() or text)
        if name:
            state["name"] = name
    elif next_key == "address":
        name = _extract_name_value(text)
        if name:
            state["name"] = name
        elif _looks_like_address(_strip_phone(text).strip() or text):
            state["address"] = _strip_phone(text).strip() or text

    name_corr = _extract_name_value(text)
    if name_corr and state.get("name") and name_corr != state["name"]:
        state["name"] = name_corr

    return state


def get_next_missing_field(order_state):
    """Retourne (key, label) du premier champ non collecté, ou (None, None)."""
    if not isinstance(order_state, dict):
        order_state = {}
    for key, label in ORDER_FLOW_FIELDS:
        if not str(order_state.get(key, "") or "").strip():
            return key, label
    return None, None


def build_order_state_block(order_state, current_user_message=None):
    """Construit un bloc d'état actuel à injecter dans le prompt (évite de redemander des infos déjà fournies)."""
    if not isinstance(order_state, dict):
        order_state = {}
    collected = []
    for key, label in ORDER_FLOW_FIELDS:
        val = str(order_state.get(key, "") or "").strip()
        if val:
            collected.append(f"- {label}: {val}")
    try:
        qty = int(order_state.get("quantity"))
    except (TypeError, ValueError):
        qty = None
    if qty and qty >= 1:
        collected.append(f"- Quantité: {qty}")
    if collected:
        lines = "\n".join(collected)
    else:
        lines = "- Aucune information collectée pour l'instant."
    next_key, next_label = get_next_missing_field(order_state)
    if current_user_message:
        lines += f"\n\nLa réponse actuelle de l'utilisateur ('{current_user_message}') a déjà été enregistrée ci-dessus. NE redemande PAS cette information."
    if next_key:
        lines += f"\nPROCHAINE information à demander: {next_label}."
    else:
        lines += "\nToutes les informations sont collectées : récapitule la commande et passe 'order_ready' à true."
    return lines


def build_order_details(state):
    """Construit le champ order_details (canonique, avec 'name' unique) à renvoyer au frontend."""
    details = {}
    if not isinstance(state, dict):
        return details
    for key in ("product_name", "name", "phone", "address", "email"):
        val = str(state.get(key, "") or "").strip()
        if val:
            details[key] = val
    try:
        qty = int(state.get("quantity"))
    except (TypeError, ValueError):
        qty = None
    if qty and qty >= 1:
        details["quantity"] = qty
    return details
