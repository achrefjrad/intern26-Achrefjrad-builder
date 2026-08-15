import re
from .catalog_matcher import _normalize_product_label

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
