"""Small, general-purpose language/style detection layer for the chatbot.

Detects the language, script and stylistic register of the CURRENT user message so
the reply-generation LLM can mirror it precisely. It NEVER translates the message
and NEVER controls the deterministic order state: intent + order_state remain the
single source of truth for the order flow.
"""

import json
import re

from .catalog_matcher import match_product_in_catalog
from .intent import _strip_fences

VALID_LANGUAGES = ("fr", "ar", "en", "mixed")
VALID_SCRIPTS = ("latin", "arabic", "mixed")
VALID_STYLES = ("french", "msa", "tunisian_darija", "arabizi", "english", "mixed")

DEFAULT_LANGUAGE = {
    "language": "mixed",
    "script": "mixed",
    "style": "mixed",
    "is_language_question": False,
}

LANGUAGE_SYSTEM_PROMPT = """Tu es un détecteur de langue, de script et de style pour un assistant de vente en ligne. Tu détectes le français, l'arabe littéraire (MSA), le darija tunisien et l'arabizi tunisien.

Analyse le message ACTUEL du client en entier (ne te fie pas à un seul mot) et classifie :

- language : "fr" (français), "ar" (arabe) ou "mixed" (mélange de langues). Si le message est en arabe ou darija, c'est "ar", même s'il contient un mot français comme "commande" ou un nom de produit anglais.
- script : "latin" (lettres latines, avec éventuellement des chiffres arabizi comme 2 3 5 7 9), ou "arabic" (lettres arabes), ou "mixed".
- style : "french" (français), "msa" (arabe littéraire), "tunisian_darija" (dialecte tunisien en lettres arabes, ex: "نحب نعدي كوموند"), "arabizi" (tunisien en lettres latines et chiffres, ex: "n7eb n3adi commande"), ou "mixed".
- is_language_question : true UNIQUEMENT si le client demande de parler une langue précise ("parle français", "تكلم بالعربية", "تحكي بالفرنسية", "speak arabic", "do you speak arabic"). Une simple question, une commande, un achat ou une salutation ne sont JAMAIS des questions de langue.

Exemples :
- "أريد تقديم طلب" -> {"language": "ar", "script": "arabic", "style": "msa", "is_language_question": false}
- "نحب نعدي كوموند" -> {"language": "ar", "script": "arabic", "style": "tunisian_darija", "is_language_question": false}
- "n7eb n3adi commande" -> {"language": "ar", "script": "latin", "style": "arabizi", "is_language_question": false}
- "je veux commander" -> {"language": "fr", "script": "latin", "style": "french", "is_language_question": false}
- "peux-tu parler arabe ?" -> {"language": "fr", "script": "latin", "style": "french", "is_language_question": true}

Réponds UNIQUEMENT avec un objet JSON de cette forme (rien d'autre, aucun backtick) :
{"language": "ar", "script": "arabic", "style": "msa", "is_language_question": false}

Ne traduis jamais le message du client."""

# Lettres arabes utilisées pour le filet de sécurité déterministe (script).
_ARABIC_LETTERS = set("ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأؤإئىة")

# Caractères supprimés pour reconnaître un message "data-only" (téléphone, email,
# simple donnée) qui ne porte pas d'information linguistique.
_DATA_ONLY_STRIP = re.compile(r"[0-9@\s.,:;'\"\-()/+#!?؟]")
_DATA_ONLY_TOKEN_MAX = 24

_LANGUAGE_LABELS = {
    "fr": "French",
    "ar": "Arabic",
    "en": "English",
    "mixed": "Mixed",
}

_SCRIPT_LABELS = {
    "latin": "Latin",
    "arabic": "Arabic",
    "mixed": "Mixed",
}

_STYLE_LABELS = {
    "french": "French",
    "msa": "Modern Standard Arabic",
    "tunisian_darija": "Tunisian Darija",
    "arabizi": "Tunisian Arabizi",
    "english": "English",
    "mixed": "Mixed",
}

_TRUE_VALUES = ("true", "1", "yes", "oui")


def _parse_language_response(content):
    """Parse la réponse brute du LLM en dict de langue/style normalisé.

    Tolérant : JSON invalide, type inattendu ou valeurs inconnues ne provoquent
    jamais d'exception et retombent sur les valeurs par défaut.
    """
    if isinstance(content, dict):
        raw = content
    else:
        try:
            raw = json.loads(_strip_fences(content))
        except (TypeError, ValueError, json.JSONDecodeError):
            return dict(DEFAULT_LANGUAGE)
    if not isinstance(raw, dict):
        return dict(DEFAULT_LANGUAGE)

    language = str(raw.get("language") or "").strip().lower()
    if language not in VALID_LANGUAGES:
        language = "mixed"
    script = str(raw.get("script") or "").strip().lower()
    if script not in VALID_SCRIPTS:
        script = "mixed"
    style = str(raw.get("style") or "").strip().lower()
    if style not in VALID_STYLES:
        style = "mixed"

    is_q = raw.get("is_language_question")
    if isinstance(is_q, bool):
        is_language_question = is_q
    else:
        is_language_question = str(is_q or "").strip().lower() in _TRUE_VALUES

    return {
        "language": language,
        "script": script,
        "style": style,
        "is_language_question": is_language_question,
    }


def _has_arabic_script(text):
    """Vrai si le texte contient des lettres arabes."""
    return any(ch in _ARABIC_LETTERS for ch in text)


def _has_latin_script(text):
    """Vrai si le texte contient des lettres latines."""
    return any(ch.isascii() and ch.isalpha() for ch in text)


def _apply_script_consistency(lang, user_message):
    """Filet de sécurité déterministe : si le script réel du message contredit la
    détection du LLM (ex: message arabe classé latin), on corrige script/langue/style.
    Le message analysé n'est jamais traduit."""
    lang = dict(lang)
    text = str(user_message or "").strip()
    if _has_arabic_script(text):
        lang["script"] = "arabic"
        if lang.get("language") in ("fr", "en"):
            lang["language"] = "ar"
        if lang.get("style") in ("french", "english", "arabizi"):
            lang["style"] = "msa"
    elif _has_latin_script(text) and lang.get("script") != "latin":
        lang["script"] = "latin"
    return lang


def is_data_only_message(user_message):
    """Vrai si le message est une simple donnée (téléphone, email, nom ou ville
    court) qui ne porte pas d'information linguistique exploitable : on peut alors
    réutiliser la langue de la conversation plutôt que de détecter sur la donnée.

    - Supprimer chiffres/séparateurs -> vide : donnée pure (numéro, email).
    - Un seul mot court (<= 24 caractères) : nom ou ville simple.
    """
    text = str(user_message or "").strip()
    if not text:
        return True
    stripped = _DATA_ONLY_STRIP.sub("", text)
    if not stripped:
        return True
    return len(text.split()) == 1 and len(stripped) <= _DATA_ONLY_TOKEN_MAX


def _essentially_product_value(text, product_name):
    """Vrai si le message se réduit essentiellement au nom d'un produit du
    catalogue : seul du bruit, de la ponctuation ou des chiffres l'entourent.
    C'est alors une VALEUR produit, pas une phrase portant de la langue.

    Ex: "Toyota Corolla" -> True ; "نحب Toyota Corolla" -> False (reste "نحب",
    des lettres) ; "Je veux Toyota Corolla" -> False (reste "je veux").
    """
    if not product_name or not text:
        return False
    rest = re.sub(re.escape(product_name), " ", str(text), flags=re.IGNORECASE)
    return not _DATA_ONLY_STRIP.sub("", rest)


def is_language_bearing_message(user_message, catalog=None):
    """Vrai si le message porte une véritable information linguistique capable
    d'ancrer ou de changer la langue de la conversation (phrase, question...).

    Faux (valeur de données / produit nu / bruit) pour : téléphone, email, nombre,
    mot court unique, nom de produit du catalogue nu, ponctuation/bruit. Pour ces
    messages, la langue de la conversation doit être CONSERVÉE : un produit nu
    comme "Toyota Corolla" ne doit jamais établir la langue (le détecteur le
    classerait en français alors que l'utilisateur n'a jamais changé de langue).
    """
    text = str(user_message or "").strip()
    if not text:
        return False
    if is_data_only_message(text):
        return False
    if catalog:
        product = match_product_in_catalog(catalog, text)
        if product and _essentially_product_value(text, product):
            return False
    return True


def pick_language_source_message(message_history, user_message, catalog=None):
    """Renvoie le message sur lequel détecter la langue de la conversation.

    - Si le message ACTUEL porte de la langue (phrase, question), on détecte sur
      lui : c'est lui qui établit ou change la langue de la conversation.
    - Sinon (donnée, produit nu, bruit), on renvoie le message utilisateur
      historique le plus récent qui porte réellement de la langue, afin de
      CONSERVER le style de la conversation. Un produit nu ("Toyota Corolla") ne
      remplace donc jamais l'ancre de langue.
    - En dernier recours (pas d'historique exploitable), on renvoie le message
      actuel."""
    text = str(user_message or "").strip()
    if not text:
        return text
    if is_language_bearing_message(text, catalog):
        return text
    if isinstance(message_history, list):
        for msg in reversed(message_history):
            if not isinstance(msg, dict) or msg.get("sender") != "user":
                continue
            htext = str(msg.get("text") or "").strip()
            if htext and is_language_bearing_message(htext, catalog):
                return htext
    return text


def detect_language(user_message, call_llm):
    """Détecte la langue/style du message ACTUEL via un petit appel LLM.

    `call_llm` est la fonction fournisseur (ex: _call_chatbot_llm). Le message
    original est envoyé tel quel (jamais traduit) : c'est le modèle qui comprend.
    Le filet de sécurité déterministe (_apply_script_consistency) ne s'applique
    qu'après un parsing réussi : le fallback (timeout / JSON invalide) renvoie
    exactement DEFAULT_LANGUAGE, sans correction.
    """
    messages = [
        {"role": "system", "content": LANGUAGE_SYSTEM_PROMPT},
        {"role": "user", "content": str(user_message or "").strip()},
    ]
    try:
        content = call_llm(messages)
    except Exception:
        return dict(DEFAULT_LANGUAGE)
    parsed = _parse_language_response(content)
    if parsed == DEFAULT_LANGUAGE:
        return parsed
    return _apply_script_consistency(parsed, user_message)


def build_response_language_metadata(lang):
    """Convertit le résultat du détecteur en libellés humains (Language / Script / Style)."""
    return {
        "language": _LANGUAGE_LABELS.get(lang.get("language"), "Mixed"),
        "script": _SCRIPT_LABELS.get(lang.get("script"), "Mixed"),
        "style": _STYLE_LABELS.get(lang.get("style"), "Mixed"),
    }


def build_response_language_block(lang):
    """Construit le bloc LANGUE DE RÉPONSE injecté dans le prompt du reply LLM."""
    metadata = build_response_language_metadata(lang)
    language = metadata["language"]
    script = metadata["script"]
    style = metadata["style"]
    return (
        "LANGUE DE RÉPONSE — RÈGLE CRITIQUE:\n"
        "La langue, le script et le style imposés ci-dessous (pour le message ACTUEL "
        "du client) sont des contraintes STRICTES pour la formulation de ta réponse.\n"
        f"* Language: {language}\n"
        f"* Script: {script}\n"
        f"* Style: {style}\n"
        "Rédige ta réponse UNIQUEMENT dans cette langue, ce script et ce style. "
        "Ne réponds jamais dans une autre langue, n'annonce jamais la langue détectée "
        "et ne traduis jamais le message du client."
    )