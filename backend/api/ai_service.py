import json
import os
import re

import requests

import google.generativeai as genai

from .prompts import SYSTEM_PROMPT, CHATBOT_SYSTEM_PROMPT, DEFAULT_TITLES, DEFAULT_KEYWORDS
from .fallbacks import generate_smart_fallback, _fallback_catalog, _navbar_section, _footer_section
from .image_service import get_stock_image_url, _stock_url

# Modern active model identifier (used when USE_OLLAMA_FOR_GENERATION is False)
GEMINI_MODEL = 'gemini-3.6-flash'

# Toggle website generation between local Ollama and Gemini API
USE_OLLAMA_FOR_GENERATION = True

# Local Ollama models (used for website generation and the e-commerce chatbot)
SITE_GENERATION_MODEL = "qwen2.5-coder:3b"  # Used for generating structured website JSON
CHATBOT_MODEL = "mistral:7b"                  # Used for customer chat interactions
OLLAMA_API_URL = f"{os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434').rstrip('/')}/api/chat"

# --- Section model ---
VALID_SECTION_TYPES = {"hero", "columns", "gallery", "testimonials", "stats", "overlay", "navbar", "footer"}

LAYOUT_STYLES = {
    "hero": {"centered_bg", "split_50_50", "minimal_text"},
    "columns": {"grid_cards", "asymmetric_featured", "alternating_rows"},
    "gallery": {"masonry_grid", "row_grid"},
    "testimonials": {"quote_cards", "full_width_quote"},
    "stats": {"metric_grid", "banner_stats"},
    "overlay": {"full_bg_banner", "split_cta"},
}

CONTENT_TYPES = {"both", "image_only", "text_only"}


def _default_layout(sec_type: str) -> str:
    return sorted(LAYOUT_STYLES.get(sec_type, set()))[0]


def _normalize_catalog(data):
    """Extrait et normalise le catalogue {name, products} depuis la réponse Gemini."""
    raw = data.get("catalog") if isinstance(data, dict) else None
    if not isinstance(raw, list):
        return None
    catalog = []
    for cat in raw:
        if not isinstance(cat, dict):
            continue
        name = str(cat.get("name", "") or "").strip()
        products = []
        raw_products = cat.get("products")
        if isinstance(raw_products, list):
            for prod in raw_products:
                if not isinstance(prod, dict):
                    continue
                pname = str(prod.get("name", "") or "").strip()
                if not pname:
                    continue
                keyword = str(prod.get("image_keyword", "") or "").strip() or "product"
                pname_display = pname
                stock_raw = prod.get("stock")
                try:
                    stock = int(stock_raw) if stock_raw is not None else 0
                except (ValueError, TypeError):
                    stock = 0
                products.append({
                    "name": pname,
                    "price": str(prod.get("price", "") or "").strip() or "Prix sur demande",
                    "image_keyword": keyword,
                    "image_url": get_stock_image_url(keyword, 800, 800),
                    "description": str(prod.get("description", "") or "").strip() or f"{pname_display}. Un produit de qualité sélectionné pour vous.",
                    "stock": stock,
                })
        if name and products:
            catalog.append({"name": name, "products": products})
    return catalog if catalog else None


def _hero_section(data, sec_id):
    style = str(data.get("layout_style", "")).strip()
    if style not in LAYOUT_STYLES["hero"]:
        style = _default_layout("hero")
    keyword = str(data.get("image_keyword", "") or "").strip() or DEFAULT_KEYWORDS["hero"]
    return {
        "id": sec_id,
        "type": "hero",
        "layout_style": style,
        "title": str(data.get("title", "") or DEFAULT_TITLES["hero"]),
        "subtitle": str(data.get("subtitle", "") or ""),
        "cta_text": str(data.get("cta_text", "") or "Contactez-nous"),
        "image_keyword": keyword,
        "image_url": _stock_url(keyword, 1600, 900),
    }


def _overlay_section(data, sec_id):
    style = str(data.get("layout_style", "")).strip()
    if style not in LAYOUT_STYLES["overlay"]:
        style = _default_layout("overlay")
    keyword = str(data.get("image_keyword", "") or "").strip() or DEFAULT_KEYWORDS["overlay"]
    return {
        "id": sec_id,
        "type": "overlay",
        "layout_style": style,
        "title": str(data.get("title", "") or DEFAULT_TITLES["overlay"]),
        "subtitle": str(data.get("subtitle", "") or ""),
        "cta_text": str(data.get("cta_text", "") or "Découvrir"),
        "image_keyword": keyword,
        "image_url": _stock_url(keyword, 1600, 900),
    }


def _columns_section(data, sec_id):
    style = str(data.get("layout_style", "")).strip()
    if style not in LAYOUT_STYLES["columns"]:
        style = _default_layout("columns")
    raw_columns = data.get("columns")
    if not isinstance(raw_columns, list):
        raw_columns = []
    columns = []
    for c in raw_columns:
        if not isinstance(c, dict):
            continue
        content_type = str(c.get("content_type", "both")).strip()
        if content_type not in CONTENT_TYPES:
            content_type = "both"
        keyword = str(c.get("image_keyword", "") or "").strip() or DEFAULT_KEYWORDS["columns"]
        columns.append({
            "title": str(c.get("title", "") or ""),
            "text": str(c.get("text", "") or ""),
            "content_type": content_type,
            "image_keyword": keyword,
            "image_url": _stock_url(keyword, 800, 600),
        })
    if style == "asymmetric_featured":
        while len(columns) < 3:
            keyword = DEFAULT_KEYWORDS["columns"]
            columns.append({
                "title": f"Section {len(columns) + 1}",
                "text": "",
                "content_type": "both",
                "image_keyword": keyword,
                "image_url": _stock_url(keyword, 800, 600),
            })
    return {
        "id": sec_id,
        "type": "columns",
        "layout_style": style,
        "title": str(data.get("title", "") or ""),
        "subtitle": str(data.get("subtitle", "") or ""),
        "columns": columns,
    }


def _gallery_section(data, sec_id):
    style = str(data.get("layout_style", "")).strip()
    if style not in LAYOUT_STYLES["gallery"]:
        style = _default_layout("gallery")
    raw_items = data.get("items")
    if not isinstance(raw_items, list):
        raw_items = []
    items = []
    for it in raw_items:
        if not isinstance(it, dict):
            continue
        keyword = str(it.get("image_keyword", "") or "").strip() or DEFAULT_KEYWORDS["gallery"]
        items.append({
            "title": str(it.get("title", "") or ""),
            "image_keyword": keyword,
            "image_url": _stock_url(keyword, 800, 600),
        })
    return {
        "id": sec_id,
        "type": "gallery",
        "layout_style": style,
        "title": str(data.get("title", "") or ""),
        "subtitle": str(data.get("subtitle", "") or ""),
        "items": items,
    }


def _testimonials_section(data, sec_id):
    style = str(data.get("layout_style", "")).strip()
    if style not in LAYOUT_STYLES["testimonials"]:
        style = _default_layout("testimonials")
    raw_reviews = data.get("reviews")
    if not isinstance(raw_reviews, list):
        raw_reviews = []
    reviews = []
    for r in raw_reviews:
        if not isinstance(r, dict):
            continue
        reviews.append({
            "quote": str(r.get("quote", "") or ""),
            "author": str(r.get("author", "") or ""),
            "role": str(r.get("role", "") or ""),
        })
    return {
        "id": sec_id,
        "type": "testimonials",
        "layout_style": style,
        "title": str(data.get("title", "") or ""),
        "reviews": reviews,
    }


def _stats_section(data, sec_id):
    style = str(data.get("layout_style", "")).strip()
    if style not in LAYOUT_STYLES["stats"]:
        style = _default_layout("stats")
    raw_metrics = data.get("metrics")
    if not isinstance(raw_metrics, list):
        raw_metrics = []
    metrics = []
    for m in raw_metrics:
        if not isinstance(m, dict):
            continue
        metrics.append({
            "label": str(m.get("label", "") or ""),
            "value": str(m.get("value", "") or ""),
        })
    return {
        "id": sec_id,
        "type": "stats",
        "layout_style": style,
        "title": str(data.get("title", "") or ""),
        "metrics": metrics,
    }


def _normalize_config(data, prompt=""):
    """Normalise la réponse Gemini (racine {theme, sections}) en config propre et riche en images."""
    try:
        if not isinstance(data, dict) or not isinstance(data.get("sections"), list) or not data["sections"]:
            return generate_smart_fallback(prompt)

        theme_raw = data.get("theme") if isinstance(data.get("theme"), dict) else {}
        font_family = str(theme_raw.get("font_family", "sans-serif")).lower()
        if font_family not in ("serif", "sans-serif", "monospace"):
            font_family = "sans-serif"
        border_radius = str(theme_raw.get("border_radius", "lg")).lower()
        if border_radius not in ("none", "sm", "lg", "full"):
            border_radius = "lg"
        theme = {
            "primary_color": str(theme_raw.get("primary_color", "#4f46e5")),
            "secondary_color": str(theme_raw.get("secondary_color", "#06b6d4")),
            "background_color": str(theme_raw.get("background_color", "#ffffff")),
            "font_family": font_family,
            "border_radius": border_radius,
        }

        id_counts = {}
        sections = []
        for raw_sec in data["sections"]:
            if not isinstance(raw_sec, dict):
                continue
            sec_type = str(raw_sec.get("type", "")).strip()
            if sec_type not in VALID_SECTION_TYPES:
                continue
            id_counts[sec_type] = id_counts.get(sec_type, 0) + 1
            sec_id = str(raw_sec.get("id", "")).strip() or f"{sec_type}_{id_counts[sec_type]}"

            if sec_type == "hero":
                sections.append(_hero_section(raw_sec, sec_id))
            elif sec_type == "columns":
                sections.append(_columns_section(raw_sec, sec_id))
            elif sec_type == "gallery":
                sections.append(_gallery_section(raw_sec, sec_id))
            elif sec_type == "testimonials":
                sections.append(_testimonials_section(raw_sec, sec_id))
            elif sec_type == "stats":
                sections.append(_stats_section(raw_sec, sec_id))
            elif sec_type == "overlay":
                sections.append(_overlay_section(raw_sec, sec_id))
            elif sec_type == "navbar":
                sections.append(_navbar_section(raw_sec, sec_id))
            elif sec_type == "footer":
                sections.append(_footer_section(raw_sec, sec_id))

        if not sections:
            return generate_smart_fallback(prompt)

        catalog = _normalize_catalog(data)
        if catalog is None:
            catalog = _fallback_catalog(prompt)

        return {"theme": theme, "sections": sections, "catalog": catalog}
    except Exception:
        return generate_smart_fallback(prompt)


def generate_config(prompt):
    if USE_OLLAMA_FOR_GENERATION:
        try:
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ]
            payload = {
                "model": SITE_GENERATION_MODEL,
                "messages": messages,
                "format": "json",
                "stream": False,
                "options": {"temperature": 0.0, "num_ctx": 4096},
            }
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=300)
            response.raise_for_status()
            data = response.json()
            raw_content = str(data.get("message", {}).get("content", "")).strip()
            if raw_content.startswith("```"):
                lines = raw_content.split('\n')
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw_content = '\n'.join(lines).strip()
            parsed = json.loads(raw_content)
            print(f"[AI Service] Ollama model ({SITE_GENERATION_MODEL}) generated response successfully!")
            return _normalize_config(parsed, prompt)
        except Exception as e:
            print(f"[AI Service] Ollama generation failed: {str(e)}")
            return generate_smart_fallback(prompt)

    if not USE_OLLAMA_FOR_GENERATION:
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key or api_key == 'default_mock_key':
            return generate_smart_fallback(prompt)

        try:
            # Laissez le SDK gérer l'endpoint automatiquement par défaut
            genai.configure(api_key=api_key)

            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=SYSTEM_PROMPT,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.85,
                    top_p=0.95,
                ),
            )
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            print(f"[AI Service] Live Gemini Model ({GEMINI_MODEL}) generated response successfully!")
            return _normalize_config(data, prompt)
        except Exception as e:
            print(f" [AI Service] Gemini API unavailable ({type(e).__name__}): {str(e)}")
            return generate_smart_fallback(prompt)


ACCENT_MAP = {
    ord('à'): 'a', ord('â'): 'a', ord('ä'): 'a', ord('ã'): 'a',
    ord('é'): 'e', ord('è'): 'e', ord('ê'): 'e', ord('ë'): 'e',
    ord('î'): 'i', ord('ï'): 'i',
    ord('ô'): 'o', ord('ö'): 'o', ord('õ'): 'o',
    ord('ù'): 'u', ord('û'): 'u', ord('ü'): 'u',
    ord('ç'): 'c', ord('ñ'): 'n',
}


def _normalize_product_label(value: str) -> str:
    """Normalise un nom de produit : minuscules, sans accents, espaces réduits."""
    if not isinstance(value, str):
        return ""
    normalized = value.strip().translate(ACCENT_MAP).lower()
    return ' '.join(normalized.split())


def match_product_in_catalog(catalog, requested_name):
    """Cherche un produit dans le catalogue en tolérant casse, accents et variantes.

    Retourne le nom canonique du produit (celui du catalogue) s'il existe, sinon None.
    Le matching est effectué : insensible à la casse, insensible aux accents, et accepte
    que la valeur demandée soit contenue dans le nom du produit (ou l'inverse).
    """
    requested = _normalize_product_label(requested_name)
    if not requested:
        return None
    for cat in catalog:
        if not isinstance(cat, dict):
            continue
        products = cat.get("products")
        if not isinstance(products, list):
            continue
        for prod in products:
            if not isinstance(prod, dict):
                continue
            name = prod.get("name")
            if not isinstance(name, str):
                continue
            candidate = _normalize_product_label(name)
            if not candidate:
                continue
            if requested == candidate or requested in candidate or candidate in requested:
                return name
    return None


def summarize_catalog_for_chat(catalog):
    """Résume le catalogue en une chaîne compacte (sans descriptions ni images) pour réduire la taille du prompt."""
    if not isinstance(catalog, list):
        return ""
    lines = []
    for cat in catalog:
        if not isinstance(cat, dict):
            continue
        cat_name = str(cat.get("name", "") or "").strip()
        if cat_name:
            lines.append(f"Catégorie: {cat_name}")
        products = cat.get("products")
        if isinstance(products, list):
            for prod in products:
                if not isinstance(prod, dict):
                    continue
                name = str(prod.get("name", "") or "").strip()
                if not name:
                    continue
                price_raw = str(prod.get("price", "") or "").strip()
                if price_raw.endswith("€"):
                    price_raw = price_raw.rstrip("€").strip()
                stock_raw = prod.get("stock")
                try:
                    stock = int(stock_raw) if stock_raw is not None else 0
                except (ValueError, TypeError):
                    stock = 0
                lines.append(f"- {name} | {price_raw}€ | Stock: {stock}")
    return "\n".join(lines)


ORDER_FLOW_FIELDS = [
    ("product_name", "Produit"),
    ("name", "Nom"),
    ("phone", "Téléphone"),
    ("address", "Adresse"),
    ("email", "Email"),
]

_NON_NAME_SIGNALS = (
    "changer", "changement", "modifier", "finalement", "en fait", "plutôt", "plutot",
    "je voudrais", "je veux", "je souhaite", "je préfère", "merci", "bonjour", "salut",
    "combien", "quel", "quelle", "comment", "pourquoi", "est-ce", "d'accord",
    "il fait", "qu'est-ce", "je vous en prie",
)

_NAME_PREFIX_RE = re.compile(
    r"^\s*(?:(?:non|si|ah|oh|ok|d'accord)[,\s]+)*"
    r"(?:je\s+m[' ]appelle|mon\s+nom\s+(?:est|c[' ]est)|le\s+nom\s+est|c[' ]est|je\s+suis|nom\s*[:=])\s*",
    re.IGNORECASE,
)


def _is_phone_like(value):
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    return len(digits) >= 7


def _extract_phone(value):
    text = str(value or "")
    m = re.search(r"\+?\d[\d\s.\-()]{5,}\d", text)
    if not m:
        return None
    return "".join(ch for ch in m.group(0) if ch.isdigit())


def _is_email_like(value):
    return bool(re.search(r"[^@\s]+@[^@\s]+\.[^@\s]+", str(value)))


def _extract_email(value):
    text = str(value or "")
    m = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    return m.group(0) if m else None


def _extract_quantity(message, product_name=None):
    text = str(message or "")
    m = re.search(r"(\d{1,3})\s*[xX]\s*\d{0,3}", text)
    if m and m.group(1):
        return int(m.group(1))
    m = re.search(r"(?:quantit[eé]|qt[eé])\s*[:=]?\s*(\d{1,3})", text, re.IGNORECASE)
    if m:
        return int(m.group(1))
    if product_name:
        norm_text = _normalize_product_label(text)
        norm_prod = _normalize_product_label(product_name)
        if norm_prod:
            m = re.search(r"(\d{1,3})\s+(?:de\s+)?\b" + re.escape(norm_prod), norm_text)
            if m:
                return int(m.group(1))
    return None


def _extract_name_value(message):
    text = str(message or "").strip()
    m = _NAME_PREFIX_RE.match(text)
    if m:
        candidate = text[m.end():].strip(" .,;:-")
        if candidate and any(ch.isalpha() for ch in candidate):
            return candidate
    return None


def _strip_phone(message):
    return re.sub(r"\+?\d[\d\s.\-()]{5,}\d", " ", str(message or ""))


def _clean_name_text(message):
    text = str(message or "").strip()
    if not any(ch.isalpha() for ch in text):
        return None
    if _is_phone_like(text) or _is_email_like(text):
        return None
    lowered = text.lower()
    if any(sig in lowered for sig in _NON_NAME_SIGNALS):
        return None
    return text


def _looks_like_address(message):
    text = str(message or "").strip()
    if not any(ch.isalpha() for ch in text):
        return False
    if _is_phone_like(text) or _is_email_like(text) or _extract_name_value(text):
        return False
    lowered = text.lower()
    if any(sig in lowered for sig in _NON_NAME_SIGNALS):
        return False
    return True


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


def handle_chat_message(project_name, catalog, message_history, user_message, order_state=None):
    """Envoie le message utilisateur à un modèle Ollama local et retourne la réponse JSON parsée."""
    catalog_text = summarize_catalog_for_chat(catalog)
    state = normalize_order_state(order_state)
    user_msg = str(user_message or "").strip()

    # L'état de commande est géré de façon 100% déterministe : le message utilisateur
    # met à jour l'état (produit, nom, téléphone, adresse, email, quantité) sans
    # dépendre du modèle. Le LLM ne fait que formuler la réponse en texte.
    state = apply_order_message(state, user_msg, catalog)

    state_block = build_order_state_block(state, user_msg)
    system_prompt = (
        CHATBOT_SYSTEM_PROMPT
        .replace("{catalog}", catalog_text)
        .replace("{order_state}", state_block)
    )

    formatted_history = []
    if isinstance(message_history, list):
        for msg in message_history:
            if not isinstance(msg, dict):
                continue
            sender = msg.get("sender")
            text = msg.get("text", "")
            if sender == "bot":
                fake_json = json.dumps({
                    "reply": text,
                    "order_ready": False,
                    "order_details": {"product_name": "", "quantity": 1, "name": "", "phone": "", "address": "", "email": ""}
                }, ensure_ascii=False)
                formatted_history.append({"role": "assistant", "content": fake_json})
            else:
                formatted_history.append({"role": "user", "content": text})
    messages = [{"role": "system", "content": system_prompt}] + formatted_history + [{"role": "user", "content": user_message}]

    payload = {
        "model": CHATBOT_MODEL,
        "messages": messages,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.4, "num_ctx": 4096, "repeat_penalty": 1.15},
    }
    timeout_payload = {
        "reply": "Désolé, la réponse prend plus de temps que prévu. Pouvez-vous reformuler ?",
        "order_ready": False,
        "order_details": {},
    }
    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=90)
        response.raise_for_status()
    except (requests.exceptions.Timeout, requests.exceptions.RequestException):
        return timeout_payload
    data = response.json()
    content = str(data.get("message", {}).get("content", "")).strip()

    # Remove leading meta lines
    forbidden_prefixes = (
        "votre réponse", "assistant", "response", "note", "remarque",
        "votre reponse", "réponse", "reponse"
    )
    lines = content.split('\n')
    clean_lines = []
    for line in lines:
        l_lower = line.strip().lower()
        if any(l_lower.startswith(p) for p in forbidden_prefixes):
            continue
        clean_lines.append(line)
    content = '\n'.join(clean_lines).strip()
    # Fallback if cleaning stripped everything
    if not content:
        content = "Pour continuer votre commande, pouvez-vous me préciser la dernière information demandée ?"

    try:
        parsed = json.loads(content)
    except (TypeError, ValueError, json.JSONDecodeError):
        parsed = None
    if not isinstance(parsed, dict):
        return {
            "reply": "Je suis à votre disposition ! Souhaitez-vous des informations sur nos produits ou passer une commande ?",
            "order_ready": False,
            "order_details": {},
        }
    if not isinstance(parsed.get("reply"), str):
        for alt_key in ("message", "response", "text"):
            alt_value = parsed.get(alt_key)
            if isinstance(alt_value, str) and alt_value.strip():
                parsed["reply"] = alt_value
                break
        else:
            return {
                "reply": "Je suis à votre disposition ! Souhaitez-vous des informations sur nos produits ou passer une commande ?",
                "order_ready": False,
                "order_details": {},
            }
    # L'état déterministe est la seule source de vérité : on ignore les
    # order_details renvoyés par le LLM et on reconstruit depuis l'état.
    parsed["order_details"] = build_order_details(state)

    # order_ready est déterministe : toutes les informations requises sont présentes.
    next_key, _ = get_next_missing_field(state)
    parsed["order_ready"] = next_key is None
    return parsed
