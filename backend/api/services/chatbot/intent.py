"""Small, general-purpose intent-understanding layer for the chatbot.

Stage 1 of a two-stage pipeline: classify the user's message into a small set of
intents (multilingual: French, Arabic, Tunisian Darija, Arabizi) and extract the
product name and quantity when present. The deterministic order state machine
(order_state.py) remains the single source of truth for the order flow.
"""

import json

VALID_INTENTS = (
    "greeting",
    "start_order",
    "product_inquiry",
    "product_search",
    "cancel_order",
    "order_status",
    "other",
)

DEFAULT_INTENT = {"intent": "other", "product_name": "", "quantity": None}

INTENT_SYSTEM_PROMPT = """Tu es un classificateur d'intentions pour un assistant de vente en ligne. Tu comprends le français, l'arabe, le darija tunisien et l'arabizi (arabe écrit en lettres latines).

Classe le message du client dans UN de ces intents :
- greeting : simple salutation ou prise de contact.
- start_order : le client veut acheter ou commander un produit (même si le produit n'est pas nommé).
- product_inquiry : le client pose une question à propos d'un produit.
- product_search : le client cherche un produit ou demande s'il est disponible.
- cancel_order : le client veut annuler une commande.
- order_status : le client demande le suivi de sa commande.
- other : tout le reste.

Réponds UNIQUEMENT avec un objet JSON de cette forme (rien d'autre, aucun backtick, aucun texte) :
{"intent": "start_order", "product_name": "", "quantity": null}

Règles :
- "start_order" si le client exprime l'intention d'acheter, commander ou obtenir un produit, dans n'importe quelle langue ou écriture.
- "product_name" : le nom du produit s'il est mentionné, sinon "".
- "quantity" : la quantité s'il y a un nombre, sinon null.

Précisions importantes :
- Une question de prix, de disponibilité ou d'information sur un produit = product_inquiry, PAS start_order. Ex: "كم سعر سيارة BMW؟", "wesh alay l prix", "quel est le prix ?", "شنوما السعر متاع BMW".
- Une recherche de produit ou une demande de disponibilité = product_search, PAS start_order. Ex: "chkoun ya3ref wino l fromage", "هل لديكم؟", "est-ce que vous vendez ?".
- Un simple nom de produit, ou une question de disponibilité ("3andkom pizza?", "عندكم pizza؟", "هل لديكم X ?", "est-ce que vous vendez X ?") = product_search ou product_inquiry, PAS start_order : start_order exige une intention explicite d'achat ou de commande (acheter, commander, "je veux", "أريد", "نحب", "n7eb", "nechri"). Mentionner un produit ne suffit jamais.
- Demander d'ANNULER = cancel_order. "نحب نكمل الطلب" veut dire CONTINUER/COMPLÉTER la commande, c'est donc start_order, PAS cancel_order.
- product_name : seulement le nom/marque/modèle précis du produit. Les mots génériques ("سيارة", "sayara", "produit", "منتج", "منتوج", "chose", "شغلة") doivent être laissés vides."""


def _strip_fences(content):
    text = str(content or "").strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def _parse_intent_response(content):
    """Parse la réponse brute du LLM en dict d'intention normalisé.

    Tolérant : JSON invalide, type inattendu, intent inconnu ou quantité
    illisible ne provoquent jamais d'exception et retombent sur "other".
    """
    if isinstance(content, dict):
        raw = content
    else:
        try:
            raw = json.loads(_strip_fences(content))
        except (TypeError, ValueError, json.JSONDecodeError):
            return dict(DEFAULT_INTENT)
    if not isinstance(raw, dict):
        return dict(DEFAULT_INTENT)
    intent = str(raw.get("intent") or "").strip().lower()
    if intent not in VALID_INTENTS:
        intent = "other"
    product_name = str(raw.get("product_name") or "").strip()
    quantity = raw.get("quantity")
    try:
        quantity = int(quantity) if quantity not in (None, "") else None
    except (TypeError, ValueError):
        quantity = None
    if quantity is not None and not (1 <= quantity <= 999):
        quantity = None
    return {"intent": intent, "product_name": product_name, "quantity": quantity}


def detect_intent(user_message, call_llm):
    """Classifie un message utilisateur via un petit appel LLM.

    `call_llm` est la fonction fournisseur (ex: _call_chatbot_llm) appelée avec
    une liste de messages [{role, content}]. Le message original est envoyé tel
    quel (jamais traduit) : c'est le modèle qui comprend la langue du client.
    """
    messages = [
        {"role": "system", "content": INTENT_SYSTEM_PROMPT},
        {"role": "user", "content": str(user_message or "").strip()},
    ]
    content = call_llm(messages)
    return _parse_intent_response(content)