"""Website Generation Persistent Cache.

Saves and retrieves generated website configurations keyed by **normalized user prompt**.

Key design decisions:
- The lookup key is ``normalize_text(prompt)`` — accent-stripped, lowercased, whitespace-collapsed.
- This means trivial differences (casing, extra spaces, accents) resolve to the same record.
- Category detection remains available for metadata / analytics, but is NOT the lookup key.
- A record is only saved once BOTH ``sections`` (homepage) AND ``catalog`` are present, so an
  incomplete Stage-1-only generation is never persisted as a "complete" template.
- The ``category`` field on the model is informational only (no unique constraint).
"""

import copy
import re
import unicodedata
from typing import Dict, List, Optional, Any


# ---------------------------------------------------------------------------
# Text normalization
# ---------------------------------------------------------------------------

def normalize_text(text: str) -> str:
    """Normalize text for use as a prompt lookup key.

    Transformations applied (in order):
      1. NFKD decomposition + ASCII encoding   → removes accents (café → cafe)
      2. Lowercase
      3. Replace non-alphanumeric chars (except spaces) with spaces
      4. Collapse multiple whitespace characters into a single space
      5. Strip leading / trailing whitespace

    Examples::

        >>> normalize_text("  Créez un CAFÉ moderne! ")
        'creez un cafe moderne'
        >>> normalize_text("Create a website for SELLING PCs")
        'create a website for selling pcs'
    """
    if not text or not isinstance(text, str):
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("utf-8")
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# Category detection (kept for metadata / analytics — NOT the lookup key)
# ---------------------------------------------------------------------------

# Canonical category definitions mapped to normalized keywords / phrases.
# Longest / most specific phrases are listed first to avoid partial conflicts.
CATEGORY_DEFINITIONS: Dict[str, List[str]] = {
    "coffee_shop": [
        "coffee shop", "coffee house", "salon de the", "tea room",
        "cafe shop", "barista", "espresso", "cappuccino", "coffee", "cafe",
    ],
    "bakery": [
        "boulangerie", "patisserie", "bakery", "pastry shop", "pastry",
        "viennoiserie", "croissant", "boulanger", "pain", "bread",
    ],
    "restaurant": [
        "fast food", "food truck", "pizzeria", "trattoria", "bistrot",
        "bistro", "restaurant", "resto", "pizza", "burger", "gastronomie", "diner",
    ],
    "pet_shop": [
        "pet shop", "pet store", "animalerie", "veterinaire", "veterinary",
        "animaux", "animal", "chiot", "chaton", "chien", "chat",
        "puppy", "kitten", "dog", "cat", "pets", "pet",
    ],
    "lawyer": [
        "cabinet juridique", "cabinet d avocat", "cabinet avocat",
        "law firm", "legal firm", "avocat", "lawyer", "attorney",
        "juridique", "notaire", "droit", "legal",
    ],
    "grocery": [
        "fruits et legumes", "fruits legumes", "primeur", "potager",
        "epicerie", "grocery", "vegetable shop", "vegetables", "vegetable",
        "legumes", "legume",
    ],
    "clothing": [
        "boutique de mode", "boutique de vetements", "pret a porter",
        "clothing store", "fashion store", "vetements", "vetement",
        "clothing", "fashion", "mode", "habits",
    ],
    "fitness": [
        "salle de sport", "coach sportif", "fitness center",
        "crossfit", "musculation", "fitness", "gym",
    ],
    "real_estate": [
        "agence immobiliere", "real estate agency", "real estate",
        "immobilier", "immo",
    ],
    "bookstore": [
        "librairie", "bookstore", "book store", "bouquiniste",
        "livres", "books", "livre", "book",
    ],
    "beauty_salon": [
        "salon de beaute", "salon de coiffure", "beauty salon",
        "hair salon", "coiffure", "barbier", "barber", "spa",
    ],
}


def detect_category(prompt: str) -> Optional[str]:
    """Detect canonical website category from user prompt.

    Uses accent-stripped normalized text and word-boundary matching.
    Returns canonical category string (e.g. 'coffee_shop', 'bakery') or None.

    This is used for informational metadata only — it is NOT the cache key.
    """
    if not prompt or not isinstance(prompt, str):
        return None
    normalized = normalize_text(prompt)
    if not normalized:
        return None
    for category, keywords in CATEGORY_DEFINITIONS.items():
        for kw in keywords:
            pattern = r"(?:^|\b)" + re.escape(kw) + r"(?:\b|$)"
            if re.search(pattern, normalized):
                return category
    return None


# ---------------------------------------------------------------------------
# Stopwords and generic request terminology
# ---------------------------------------------------------------------------

# Words that carry no domain-specific business information across French and English
STOPWORDS = {
    # Request verbs and intent words
    "creer", "creez", "cree", "crees", "faire", "fais", "fait", "donne", "donner",
    "donnez", "construire", "construis", "construisez", "generer", "genere", "generez",
    "generation", "veux", "voudrais", "cherche", "cherchons", "besoin", "aimerais",
    "demande", "proposer", "proposez", "lance", "lancer", "souhaite", "mettre",
    "create", "creates", "creating", "make", "makes", "making", "build", "builds",
    "building", "give", "gives", "giving", "want", "wants", "need", "needs",
    "generate", "generates", "generating", "looking", "like", "would",

    # Generic website / platform terms
    "site", "sites", "website", "websites", "web", "page", "pages", "internet",
    "boutique", "boutiques", "plateforme", "plateformes", "store", "stores",
    "shop", "shops", "online", "application", "app", "apps", "vitrine",

    # Grammatical particles, articles, pronouns, prepositions
    "un", "une", "des", "du", "de", "d", "le", "la", "les", "l", "pour", "mon",
    "ma", "mes", "notre", "nos", "ton", "ta", "tes", "votre", "vos", "leur",
    "leurs", "au", "aux", "avec", "sans", "sur", "sous", "dans", "en", "par",
    "et", "ou", "ce", "cet", "cette", "ces", "qui", "que", "quoi", "dont", "a",
    "y", "se", "sa", "son", "ses",
    "a", "an", "the", "for", "my", "our", "your", "his", "her", "their", "in",
    "on", "at", "to", "from", "with", "without", "by", "of", "and", "or", "is",
    "are", "this", "that", "these", "those", "it", "its",

    # Generic marketing / aesthetic qualifiers (don't define the business domain)
    "moderne", "modernes", "pro", "professionnel", "professionnelle", "professionnels",
    "professionnelles", "joli", "jolie", "jolis", "simple", "simples", "nouveau",
    "nouvelle", "nouveaux", "nouvelles", "bon", "bonne", "bons", "bonnes", "top",
    "super", "grand", "grande", "grands", "grandes", "petit", "petite", "petits",
    "petites", "modern", "professional", "clean", "new", "good", "great", "best",
}

# Conservative threshold for cache similarity hit
SIMILARITY_THRESHOLD = 0.80


def _stem_word(word: str) -> str:
    """Basic conservative stemming for French and English (strip plural 's' / 'es')."""
    if len(word) > 4 and word.endswith("es"):
        return word[:-2]
    if len(word) > 3 and word.endswith("s"):
        return word[:-1]
    return word


def extract_core_tokens(prompt: str) -> set:
    """Extract normalized meaningful domain tokens from a prompt.

    1. Normalizes text (accent removal, lowercase, alphanumeric only).
    2. Identifies any recognized category keyword and adds its canonical tag.
    3. Filters out stopwords and generic request words.
    4. Applies conservative plural stemming.
    """
    if not prompt or not isinstance(prompt, str):
        return set()
    normalized = normalize_text(prompt)
    if not normalized:
        return set()

    tokens = set()
    cat = detect_category(prompt)
    if cat:
        tokens.add(f"__cat_{cat}__")

    for word in normalized.split():
        if word and word not in STOPWORDS and len(word) > 1:
            stemmed = _stem_word(word)
            if stemmed not in STOPWORDS:
                tokens.add(stemmed)

    return tokens


def calculate_prompt_similarity(prompt_a: str, prompt_b: str) -> float:
    """Calculate conservative semantic similarity score [0.0, 1.0] between two prompts.

    Conservative matching rules:
      1. Exact normalized match -> 1.0
      2. Category mismatch (different detected categories) -> 0.0
      3. Category asymmetry (one categorized, one uncategorized) -> 0.0
      4. Empty meaningful tokens on either side (without identical exact text) -> 0.0
      5. Same category:
         - If both prompts specify non-empty distinct sub-domain modifiers that do NOT overlap
           (e.g., "restaurant pizza" vs "restaurant sushi"), conflict penalty -> 0.0
         - Otherwise, Score = 0.5 (category match) + 0.5 * Dice(tokens_a, tokens_b)
      6. Both uncategorized:
         - Score = Dice(tokens_a, tokens_b)
    """
    if not prompt_a or not prompt_b:
        return 0.0

    norm_a = normalize_text(prompt_a)
    norm_b = normalize_text(prompt_b)

    if not norm_a or not norm_b:
        return 0.0

    if norm_a == norm_b:
        return 1.0

    cat_a = detect_category(prompt_a)
    cat_b = detect_category(prompt_b)

    # Category conflict or asymmetry (strictly avoid cross-domain collisions)
    if cat_a != cat_b:
        return 0.0

    tokens_a = extract_core_tokens(prompt_a)
    tokens_b = extract_core_tokens(prompt_b)

    if not tokens_a or not tokens_b:
        return 0.0

    # Same category branch
    if cat_a is not None and cat_b is not None:
        cat_tag = f"__cat_{cat_a}__"
        # Sub-domain modifiers (tokens excluding category tag and category name)
        modifiers_a = {t for t in tokens_a if t != cat_tag and t != cat_a}
        modifiers_b = {t for t in tokens_b if t != cat_tag and t != cat_b}

        # If both have explicit modifiers but zero overlap -> sub-domain conflict (e.g. sushi vs pizza)
        if modifiers_a and modifiers_b and not (modifiers_a & modifiers_b):
            return 0.0

        intersection = len(tokens_a & tokens_b)
        total = len(tokens_a) + len(tokens_b)
        dice = (2.0 * intersection) / total if total > 0 else 0.0
        return 0.5 + (0.5 * dice)

    # Both uncategorized branch
    intersection = len(tokens_a & tokens_b)
    total = len(tokens_a) + len(tokens_b)
    dice = (2.0 * intersection) / total if total > 0 else 0.0
    return dice


# ---------------------------------------------------------------------------
# Prompt-based persistent cache (DB-backed)
# ---------------------------------------------------------------------------

def get_cached_generation(prompt: str, threshold: float = SIMILARITY_THRESHOLD) -> Optional[Dict[str, Any]]:
    """Retrieve a previously generated website for this prompt from the database.

    Lookup strategy:
      1. Fast-path: Exact match on ``normalize_text(prompt)``.
      2. Scoring-path: Computes semantic similarity against existing candidate
         records in the same domain category (or uncategorized records).
         If the best candidate score >= threshold, reuses that template.

    Returns a dict with keys ``theme``, ``sections``, ``catalog``, ``original_prompt``
    if a complete record is found, or ``None`` otherwise.
    """
    if not prompt or not isinstance(prompt, str):
        return None
    prompt_key = normalize_text(prompt)
    if not prompt_key:
        return None
    try:
        from api.models import GeneratedSiteCache

        # 1. Fast path: exact normalized prompt match (O(1))
        exact_entry = GeneratedSiteCache.objects.filter(prompt_key=prompt_key).first()
        if exact_entry:
            return {
                "theme": copy.deepcopy(exact_entry.theme or {}),
                "sections": copy.deepcopy(exact_entry.sections or []),
                "catalog": copy.deepcopy(exact_entry.catalog or []),
                "original_prompt": exact_entry.original_prompt or prompt,
            }

        # 2. Scoring path: conservative semantic similarity matching
        prompt_cat = detect_category(prompt) or ""
        candidates = GeneratedSiteCache.objects.filter(category=prompt_cat)

        best_entry = None
        best_score = 0.0

        for candidate in candidates:
            cand_prompt = candidate.original_prompt or candidate.prompt_key
            score = calculate_prompt_similarity(prompt, cand_prompt)
            if score > best_score:
                best_score = score
                best_entry = candidate

        if best_entry and best_score >= threshold:
            print(
                f"[Cache] Smart match hit ({best_score:.2f} >= {threshold}): "
                f"{prompt!r} reused template from {best_entry.original_prompt or best_entry.prompt_key!r}"
            )
            return {
                "theme": copy.deepcopy(best_entry.theme or {}),
                "sections": copy.deepcopy(best_entry.sections or []),
                "catalog": copy.deepcopy(best_entry.catalog or []),
                "original_prompt": best_entry.original_prompt or prompt,
            }
    except Exception as e:
        print(f"[Cache] Error retrieving cached generation (key={prompt_key!r}): {e}")
    return None


def set_cached_generation(prompt: str, config: Dict[str, Any]) -> None:
    """Save a complete generated website to the database, keyed by the normalized prompt.

    Requirements for saving:
      - ``prompt`` must be a non-empty string.
      - ``config`` must contain non-empty ``sections`` AND non-empty ``catalog``.
        If either is missing the save is silently skipped (protects against
        persisting an incomplete Stage-1-only result).

    The ``category`` field is populated automatically via :func:`detect_category`
    and stored as informational metadata and fast candidate partition index.
    """
    if not prompt or not isinstance(prompt, str):
        return
    if not isinstance(config, dict):
        return

    sections = config.get("sections", [])
    catalog = config.get("catalog", [])
    if not sections or not catalog:
        # Incomplete — do not persist (Stage 1 only, no catalog yet)
        return

    prompt_key = normalize_text(prompt)
    if not prompt_key:
        return

    try:
        from api.models import GeneratedSiteCache
        category = detect_category(prompt) or ""
        orig_prompt = str(config.get("original_prompt", "") or prompt)
        GeneratedSiteCache.objects.update_or_create(
            prompt_key=prompt_key,
            defaults={
                "category": category,
                "theme": copy.deepcopy(config.get("theme", {})),
                "sections": copy.deepcopy(sections),
                "catalog": copy.deepcopy(catalog),
                "original_prompt": orig_prompt,
            },
        )
        print(f"[Cache] Saved template for prompt_key={prompt_key!r} (category={category!r})")
    except Exception as e:
        print(f"[Cache] Error saving generation (key={prompt_key!r}): {e}")


def clear_generation_cache() -> None:
    """Delete all cached generation records from the database."""
    try:
        from api.models import GeneratedSiteCache
        deleted, _ = GeneratedSiteCache.objects.all().delete()
        print(f"[Cache] Cleared {deleted} cached generation record(s).")
    except Exception as e:
        print(f"[Cache] Error clearing cache: {e}")

