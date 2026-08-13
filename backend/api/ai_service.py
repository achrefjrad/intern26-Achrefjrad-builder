import json
import os

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
OLLAMA_MODEL = "qwen2.5-coder:7b"
OLLAMA_API_URL = "http://localhost:11434/api/chat"

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
                "model": OLLAMA_MODEL,
                "messages": messages,
                "format": "json",
                "stream": False,
                "options": {"temperature": 0.0, "num_ctx": 8192},
            }
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=150)
            response.raise_for_status()
            data = response.json()
            content = data.get("message", {}).get("content", "")
            parsed = json.loads(content)
            print(f"[AI Service] Ollama model ({OLLAMA_MODEL}) generated response successfully!")
            return _normalize_config(parsed, prompt)
        except Exception as e:
            print(f"[AI Service] Ollama generation unavailable ({type(e).__name__}): {str(e)}")
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


def handle_chat_message(project_name, catalog, message_history, user_message):
    """Envoie le message utilisateur à un modèle Ollama local et retourne la réponse JSON parsée."""
    catalog_text = summarize_catalog_for_chat(catalog)
    system_prompt = CHATBOT_SYSTEM_PROMPT.format(catalog=catalog_text)

    formatted_history = []
    if isinstance(message_history, list):
        for m in message_history:
            if not isinstance(m, dict):
                continue
            sender = m.get("sender") or m.get("role")
            text = m.get("text") or m.get("content")

            if sender and text:
                role = "assistant" if sender == "bot" else "user"
                formatted_history.append({"role": role, "content": text})
    messages = [{"role": "system", "content": system_prompt}] + formatted_history + [{"role": "user", "content": user_message}]

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.4, "num_ctx": 2048},
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
    content = data.get("message", {}).get("content", "")
    try:
        parsed = json.loads(content)
    except (TypeError, ValueError, json.JSONDecodeError):
        parsed = None
    if not isinstance(parsed, dict) or not isinstance(parsed.get("reply"), str):
        return {
            "reply": "Je suis à votre disposition ! Souhaitez-vous des informations sur nos produits ou passer une commande ?",
            "order_ready": False,
            "order_details": {},
        }
    return parsed
