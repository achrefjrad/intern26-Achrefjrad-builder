from api.fallbacks import generate_smart_fallback, _fallback_catalog, _navbar_section, _footer_section
from api.image_service import get_stock_image_url
from .section_mappers import (
    VALID_SECTION_TYPES,
    _hero_section,
    _overlay_section,
    _columns_section,
    _gallery_section,
    _testimonials_section,
    _stats_section,
)


def _normalize_catalog(data):
    """Extrait et normalise le catalogue {name, products} depuis la réponse Gemini / Ollama."""
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
                    "description": str(prod.get("description", "") or "").strip() or f"{pname}. Un produit de qualité sélectionné pour vous.",
                    "stock": stock,
                })
        if name and products:
            catalog.append({"name": name, "products": products})
    return catalog if catalog else None


def _normalize_config(data, prompt=""):
    """Normalise la réponse de l'IA (racine {theme, sections}) en config propre et riche en images."""
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
