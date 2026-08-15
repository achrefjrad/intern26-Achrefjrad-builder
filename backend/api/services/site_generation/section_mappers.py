from api.prompts import DEFAULT_TITLES, DEFAULT_KEYWORDS
from api.image_service import _stock_url

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
