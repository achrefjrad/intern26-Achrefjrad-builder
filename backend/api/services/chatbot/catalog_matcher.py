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
