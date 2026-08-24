import json
import re
import requests

from api.prompts import CHATBOT_SYSTEM_PROMPT
from api.services.llm.config import CHATBOT_MODEL, OLLAMA_API_URL, AI_PROVIDER, KAGGLE_API_URL, CHATBOT_TIMEOUT
from api.services.llm.huggingface import call_huggingface
from .catalog_matcher import match_product_in_catalog, summarize_catalog_for_chat
from .intent import DEFAULT_INTENT, detect_intent
from .language import (
    DEFAULT_LANGUAGE,
    build_response_language_block,
    build_response_language_metadata,
    detect_language,
    pick_language_source_message,
)
from .order_state import (
    ORDER_FLOW_FIELDS,
    normalize_order_state,
    apply_order_message,
    build_order_details,
    get_next_missing_field,
)


def _call_chatbot_llm(messages, timeout=CHATBOT_TIMEOUT):
    """Envoie les messages au fournisseur LLM configuré et renvoie le contenu brut.

    - AI_PROVIDER=ollama : comportement historique inchangé (payload Ollama complet).
    - AI_PROVIDER=kaggle : POST {messages} sur KAGGLE_API_URL, lit data["response"].
    - AI_PROVIDER=huggingface : appelle le Space Hugging Face ZeroGPU via Gradio.
    Le parsing JSON et toute la logique déterministe restent dans le handler.
    """
    if AI_PROVIDER == "kaggle":
        if not KAGGLE_API_URL:
            raise requests.exceptions.RequestException("KAGGLE_API_URL is not configured")
        response = requests.post(KAGGLE_API_URL, json={"messages": messages}, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        content = str(data.get("response", "") or "").strip()
        if content.startswith("```"):
            lines = content.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()
        return content

    if AI_PROVIDER == "huggingface":
        text = "\n\n".join(f"{m['role']}: {m['content']}" for m in messages)
        content = call_huggingface(text)
        if content.startswith("```"):
            lines = content.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()
        return content

    payload = {
        "model": CHATBOT_MODEL,
        "messages": messages,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.4, "num_ctx": 4096, "repeat_penalty": 1.15},
    }
    response = requests.post(OLLAMA_API_URL, json=payload, timeout=timeout)
    response.raise_for_status()
    data = response.json()
    return str(data.get("message", {}).get("content", "")).strip()


def build_reply_context(intent_result, lang_result, state, next_key, user_message):
    """Construit le bloc de faits déterministes compact injecté dans le prompt du reply LLM.

    Les valeurs proviennent exclusivement des couches déterministes (détection
    d'intention, détection de langue, état de commande). Le reply LLM ne doit
    jamais les redéduire : son seul travail est de rédiger la réponse naturelle.
    """
    metadata = build_response_language_metadata(lang_result)
    quantity = state.get("quantity", 1)
    collected = []
    for key, label in ORDER_FLOW_FIELDS:
        value = str(state.get(key) or "").strip()
        collected.append(f"{label}={value or '-'}")
    collected.append(f"Quantité={quantity}")
    return "\n".join(
        [
            "FAITS DÉTERMINISTES FOURNIS PAR LE SYSTÈME :",
            f"INTENT: {intent_result.get('intent') or 'other'}",
            f"RESPONSE_LANGUAGE: {metadata['language']}",
            f"RESPONSE_SCRIPT: {metadata['script']}",
            f"RESPONSE_STYLE: {metadata['style']}",
            f"PRODUCT: {state.get('product_name') or ''}",
            f"QUANTITY: {quantity}",
            f"NEXT_FIELD: {next_key or ''}",
            f"ORDER_STATE: {'; '.join(collected)}",
            f"CURRENT_USER_MESSAGE: {user_message}",
        ]
    )


FIELD_ACTIONS = {
    "name": "le nom complet du client",
    "phone": "le numéro de téléphone du client",
    "address": "l'adresse de livraison du client",
    "email": "l'adresse email du client",
}

_FIELD_LABELS = {"name": "Nom", "phone": "Téléphone", "address": "Adresse", "email": "Email"}

_NATURAL_INTENTS = ("product_inquiry", "product_search", "greeting")

# Une question (présence d'un point d'interrogation) ne peut jamais injecter un
# produit dans la commande : "3andkom pizza?" ou "عندكم فرجيني؟" sont des questions
# de disponibilité, pas des prises de commande, même si le classificateur
# d'intention les classe start_order par erreur.
_QUESTION_MARK_RE = re.compile(r"[?؟]")


def _is_question_message(user_message):
    return bool(_QUESTION_MARK_RE.search(str(user_message or "")))

_FORBIDDEN_TALK = (
    "Ne parle jamais de disponibilité, de stock, de prix, de livraison, de paiement, de remise, "
    "de confirmation ou de réception de commande. Ne conclus pas la commande. Ne commence pas par "
    "une salutation ou une question d'ouverture : pose directement la question demandée."
)


def build_reply_action(intent_result, state, next_key, is_language_question=False):
    """Construit le bloc ACTION injecté dans le prompt du reply LLM.

    L'action est dynamique et ne mentionne QUE le comportement du tour ACTUEL
    (jamais une table complète des champs) : le petit modèle reply n'est donc
    jamais tenté de s'ancrer sur le mauvais champ. Elle est placée juste avant
    la spécification JSON, au plus près de la sortie.
    """
    intent = (intent_result or {}).get("intent") or "other"
    product = str((state or {}).get("product_name") or "").strip()

    if is_language_question:
        return (
            "ACTION : le client pose une question sur la langue. Réponds-y dans la langue "
            "demandée, de façon naturelle, sans modifier la commande en cours."
        )

    if intent == "start_order":
        if next_key in FIELD_ACTIONS:
            product_part = (
                f"Le client veut commander {product}, déjà enregistré dans la commande. "
                if product
                else ""
            )
            action = (
                f"ACTION : {product_part}La seule information à demander est "
                f"{FIELD_ACTIONS[next_key]}. Pose UNE SEULE question courte et naturelle."
            )
        else:
            action = (
                "ACTION : aucun produit n'est encore choisi. Demande au client quel produit "
                "il souhaite commander, en une seule question courte et naturelle."
            )
        forbidden = f"INTERDIT : ne demande jamais les autres champs de la commande. {_FORBIDDEN_TALK}"
        return action + "\n" + forbidden

    if next_key in FIELD_ACTIONS:
        action = (
            f"ACTION : la seule information à demander est {FIELD_ACTIONS[next_key]}. "
            "Pose UNE SEULE question courte et naturelle."
        )
        others = " ni ".join(_FIELD_LABELS[k] for k in FIELD_ACTIONS if k != next_key)
        forbidden = f"INTERDIT : ne demande jamais {others}. {_FORBIDDEN_TALK}"
        return action + "\n" + forbidden

    if next_key is None:
        if intent in _NATURAL_INTENTS:
            return (
                "ACTION : réponds naturellement au message du client (salutation ou question "
                "produit) en t'appuyant UNIQUEMENT sur les faits du CATALOGUE ci-dessous "
                "(prix, stock, produits) : n'invente jamais de prix, de stock ou de produit "
                "absent du catalogue."
            )
        return (
            "ACTION : toutes les informations de la commande sont déjà collectées. Récapitule la "
            "commande et remercie le client, sans redemander d'information."
        )

    return (
        "ACTION : réponds naturellement au message du client, en t'appuyant UNIQUEMENT sur les "
        "faits du CATALOGUE ci-dessous (prix, stock, produits) : n'invente jamais de prix, de "
        "stock ou de produit absent du catalogue."
    )


def reply_requires_catalog(intent_result, next_key, is_language_question=False):
    """Le catalogue n'est injecté que pour les réponses naturelles (salutation,
    question produit). Pendant le flux de commande il est omis : il provoquait
    des hallucinations de disponibilité / stock sur le petit modèle reply."""
    if is_language_question:
        return False
    intent = (intent_result or {}).get("intent") or "other"
    if intent not in _NATURAL_INTENTS:
        return False
    return next_key is None or next_key not in FIELD_ACTIONS


# Règle injectée UNIQUEMENT avec le catalogue (réponses naturelles). Le catalogue
# est la source de vérité : le petit modèle reply ne doit jamais inventer un prix,
# un stock ou un produit. Une question produit ne doit jamais devenir une commande.
_CATALOG_AUTHORITY = (
    "RÈGLE ANTI-HALLUCINATION (CATALOGUE AUTORITATIF) :\n"
    "Tu ne peux énoncer que des faits PRÉSENTS dans le catalogue ci-dessus "
    "(prix, stock, produits disponibles). N'invente JAMAIS un prix, un stock, une "
    "disponibilité ou un produit absent de ce catalogue. Si le produit demandé n'y "
    "figure pas, réponds que tu ne le trouves pas dans le catalogue / que tu n'as "
    "pas d'information sur ce produit. Ne transforme jamais une question produit en "
    "prise de commande."
)


# Exemples de style par (style, action). Ce sont des EXEMPLES SÉMANTIQUES pour le
# petit modèle reply : ils montrent le STYLE du tour actuel (question posée au
# client, confirmation, réponse naturelle) sans jamais copier la conversation
# réelle du client et sans contredire les faits déterministes. Aucune phrase
# interdite par les tests n'y figure.
_REPLY_STYLE_EXAMPLES = {
    "french": {
        "ask_name": [
            ("je voudrais une voiture", "Bien sûr ! Quel est votre nom complet ?"),
            ("bonjour, je veux commander", "Avec plaisir ! Quel est votre nom complet ?"),
        ],
        "ask_phone": [
            ("Amin", "Merci Amin ! Quel est votre numéro de téléphone ?"),
            ("je m'appelle Achref", "Parfait ! Pourriez-vous me donner votre numéro de téléphone ?"),
        ],
        "ask_address": [
            ("22123456", "Merci ! Quelle est votre adresse de livraison ?"),
            ("mon numéro est 22446688", "Parfait ! Où souhaitez-vous être livré ?"),
        ],
        "ask_email": [
            ("tunis", "Merci ! Quelle est votre adresse email ?"),
            ("12 rue de Tunis", "Très bien ! Quelle est votre adresse email ?"),
        ],
        "ask_product": [
            ("je voudrais passer une commande", "Avec plaisir ! Quel produit souhaitez-vous commander ?"),
            ("salut, je veux acheter", "Bienvenue ! Quel produit vous ferait plaisir ?"),
        ],
        "natural": [
            ("bonjour", "Bonjour ! Comment puis-je vous aider aujourd'hui ?"),
            ("quels produits vendez-vous ?", "Nous vendons les produits de notre catalogue. Que recherchez-vous ?"),
        ],
        "recap": [
            ("merci", "Merci pour votre commande ! Nous la préparons dès maintenant."),
            ("c'est tout", "Votre commande est bien enregistrée. À bientôt !"),
        ],
        "language_question": [
            ("peux-tu parler arabe ?", "Bien sûr ! Je peux parler arabe. Que puis-je faire pour vous ?"),
            ("do you speak french ?", "Oui, bien sûr ! Je parle français. Comment puis-je vous aider ?"),
        ],
    },
    "msa": {
        "ask_name": [
            ("أود شراء سيارة", "بالتأكيد! ما هو اسمك الكامل؟"),
            ("أريد أن أطلب منتجاً", "حاضر! ما هو اسمك الكامل؟"),
        ],
        "ask_phone": [
            ("أمين", "شكراً! ما هو رقم هاتفك؟"),
            ("اسمي أحمد", "ممتاز! أعطني رقم هاتفك من فضلك."),
        ],
        "ask_address": [
            ("22123456", "شكراً! ما هو عنوانك؟"),
            ("22446688", "تمام! أين تريد أن تصلك الطلبية؟"),
        ],
        "ask_email": [
            ("تونس", "شكراً! ما هو بريدك الإلكتروني؟"),
            ("سوسة", "ممتاز! أعطني إيميلك من فضلك."),
        ],
        "ask_product": [
            ("أود أن أطلب", "بالتأكيد! ما هو المنتج الذي تريد طلبه؟"),
            ("أريد شراء منتج", "حاضر! أي منتج تريد أن تطلبه؟"),
        ],
        "natural": [
            ("السلام عليكم", "وعليكم السلام! كيف أساعدك؟"),
            ("ما هي منتجاتكم؟", "نعرض منتجاتنا في الكتالوج. ماذا تبحث عنه؟"),
        ],
        "recap": [
            ("شكراً", "شكراً لك! تم تسجيل طلبك بنجاح."),
            ("هذا كل شيء", "طلبك مؤكد. في انتظار تواصلك معنا!"),
        ],
        "language_question": [
            ("هل يمكنك التحدث بالعربية؟", "نعم، بالتأكيد! أنا أتحدث العربية. كيف يمكنني مساعدتك؟"),
            ("تكلم بالفرنسية", "حاضر! سأتكلم بالفرنسية. ماذا تريد؟"),
        ],
    },
    "tunisian_darija": {
        "ask_name": [
            ("حبيت نطلب شغلة", "حاضر! شنو اسمك الكامل، عيشك؟"),
            ("بغيت نطلب منكم منتوج", "تخدم بالصحة! أعطيني اسمك الكامل."),
        ],
        "ask_phone": [
            ("أمين", "شكراً! شنو رقم هاتفك؟"),
            ("اسمي أحمد", "مليح! أعطيني رقم هاتفك."),
        ],
        "ask_address": [
            ("22123456", "شكراً! وين تحب نوصلو الطلبية؟"),
            ("رقمي 22446688", "تمام! شنو عنوانك؟"),
        ],
        "ask_email": [
            ("سوسة", "شكراً! شنو إيميلك؟"),
            ("تونس", "مليح! أعطيني إيميلك من فضلك."),
        ],
        "ask_product": [
            ("حبيت نطلب", "حاضر! شنو تحب تطلب؟"),
            ("باش نشتري حاجة", "مليح! شنو المنتج اللي تحب؟"),
        ],
        "natural": [
            ("السلام عليكم", "وعليكم السلام! كيفاش ننجمو نساعدوك؟"),
            ("شكونو المنتجات متاعكم؟", "المنتجات راهم في الكتالوج. شنو تحب؟"),
        ],
        "recap": [
            ("شكراً", "شكراً ليك! طلبك تثبت."),
            ("هذا كل شيء", "طلبك راهو ثابت. نرجعو نخدمولك!"),
        ],
        "language_question": [
            ("تقدر تحكي بالفرنسية؟", "على كيفك! ننجم نحكي بالفرنسية. شنو تحب؟"),
            ("تحكي معايا بالعربية", "على كيفك! نحكي معاك بالعربية."),
        ],
    },
    "arabizi": {
        "ask_name": [
            ("hbit nechri haja", "Tayeb! Chnowa ismek el kamel, 3aychek?"),
            ("bghit ncomandi", "Ahla! 3atini ismek el kamel."),
        ],
        "ask_phone": [
            ("Amin", "Merci! Chnowa ra9mek mta3 telephone?"),
            ("esmi Ahmed", "Mli7! 3atini ra9mek mta3 telephone."),
        ],
        "ask_address": [
            ("22123456", "Merci! Win t7eb nsayyeb le commande?"),
            ("ra9mi 22446688", "Tayeb! Chnowa 3onwinek?"),
        ],
        "ask_email": [
            ("sousse", "Merci! Chnowa imeilek?"),
            ("tunis", "Mli7! 3atini imeilek."),
        ],
        "ask_product": [
            ("n7eb nechri haja", "Tayeb! Chnowa t7eb tcommandi?"),
            ("bich nechri", "Ahla! Chnowa el produit eli t7eb?"),
        ],
        "natural": [
            ("salam", "Salam! Kifech nje9der ne3awnek?"),
            ("chnowa el produits mte3kom?", "El produits mawjoudin fil catalogue. Chnowa t7eb?"),
        ],
        "recap": [
            ("choukran", "Choukran lik! Le commande thebet."),
            ("haka koll chay", "Le commande thebbet. Nrawhou nkhemmlou!"),
        ],
        "language_question": [
            ("ta9der te7ki bel francais?", "Aywa! Nje9der ne7ki bel francais. Chnowa t7eb?"),
            ("do you speak arabic?", "Aywa! Na7ki bl 3arbiya. Chnowa t7eb?"),
        ],
    },
}

_FIELD_STYLE_KEYS = {
    "name": "ask_name",
    "phone": "ask_phone",
    "address": "ask_address",
    "email": "ask_email",
}


def _example_style_key(lang_result):
    """Choisit le style des exemples : le style détecté s'il existe, sinon on
    déduit du script (arabe -> msa, sinon français)."""
    style = (lang_result or {}).get("style") or "mixed"
    if style in _REPLY_STYLE_EXAMPLES:
        return style
    if (lang_result or {}).get("script") == "arabic":
        return "msa"
    return "french"


def _example_action_key(intent_result, state, next_key):
    """Associe l'action du tour ACTUEL à une clé d'exemples de style."""
    if next_key in _FIELD_STYLE_KEYS:
        return _FIELD_STYLE_KEYS[next_key]
    if next_key == "product_name":
        intent = (intent_result or {}).get("intent") or "other"
        return "ask_product" if intent == "start_order" else "natural"
    if next_key is None:
        intent = (intent_result or {}).get("intent") or "other"
        return "natural" if intent in _NATURAL_INTENTS else "recap"
    return "natural"


def build_reply_style_examples(intent_result, state, next_key, lang_result, is_language_question=False):
    """Bloc few-shot injecté dans le prompt reply : un exemple concret de la tâche
    du tour ACTUEL dans le style détecté. Montre le STYLE, jamais la conversation
    réelle du client, et ne contredit jamais les faits déterministes."""
    action = "language_question" if is_language_question else _example_action_key(intent_result, state, next_key)
    style = _example_style_key(lang_result)
    examples = _REPLY_STYLE_EXAMPLES.get(style, {}).get(action)
    if not examples:
        return ""
    lines = ["EXEMPLES DE RÉPONSES DANS LE STYLE DU CLIENT (à imiter, sans copier mot pour mot) :"]
    for user_text, reply_text in examples:
        lines.append(f'Client: "{user_text}" -> Réponse: "{reply_text}"')
    return "\n".join(lines)


def handle_chat_message(project_name, catalog, message_history, user_message, order_state=None):
    """Envoie le message utilisateur à un modèle Ollama local et retourne la réponse JSON parsée."""
    catalog_text = summarize_catalog_for_chat(catalog)
    state = normalize_order_state(order_state)
    user_msg = str(user_message or "").strip()
    # L'état était-il déjà complet AVANT ce message ? Si oui, ce message ne
    # complète PAS la commande : il ne doit donc pas redéclencher une persistance.
    was_ready_before = get_next_missing_field(state)[0] is None

    # Étape 1 (langue/style) : petit appel LLM pour le message porteur de langue.
    # Il ne sert QU'À formuler la réponse (jamais à piloter l'état). is_language_question
    # signale une question sur la langue : un tel message ne doit pas être stocké
    # comme nom/adresse dans l'état déterministe. Pour un message data-only (numéro,
    # email, nom simple), on détecte sur le dernier message historique porteur de
    # langue pour CONSERVER le style de la conversation au lieu de détecter sur la
    # donnée elle-même (sinon le modèle basculerait en mixed/français).
    lang_result = dict(DEFAULT_LANGUAGE)
    try:
        lang_result = detect_language(
            pick_language_source_message(message_history, user_msg, catalog),
            _call_chatbot_llm,
        )
    except (requests.exceptions.Timeout, requests.exceptions.RequestException):
        lang_result = dict(DEFAULT_LANGUAGE)

    # Étape 2 (intention) : petit appel LLM multilingue. L'intention est autoritaire
    # pour interpréter un message qui démarre une commande (start_order). L'appel
    # n'est nécessaire que tant qu'aucun produit n'est renseigné : en plein flux de
    # commande (nom, téléphone, adresse, email) le message est une réponse à une
    # question et reste traité de façon 100% déterministe.
    intent_result = dict(DEFAULT_INTENT)
    if not state.get("product_name"):
        try:
            intent_result = detect_intent(user_msg, _call_chatbot_llm)
        except (requests.exceptions.Timeout, requests.exceptions.RequestException):
            intent_result = dict(DEFAULT_INTENT)

    if intent_result.get("intent") == "start_order":
        # Le message lance une commande : produit et quantité proviennent de
        # l'intention. Le message d'ouverture n'est JAMAIS une réponse à la question
        # "nom" et ne doit pas entrer dans la logique déterministe de saisie
        # (sinon "أريد تقديم طلب nissan altima" serait stocké comme nom du client).
        llm_product = intent_result.get("product_name") or ""
        if _is_question_message(user_msg):
            # Une question d'achat/disponibilité n'apporte jamais un produit :
            # on ne le stocke pas (protection contre un start_order erroné).
            llm_product = ""
        if llm_product:
            state["product_name"] = match_product_in_catalog(catalog, llm_product) or llm_product
        llm_qty = intent_result.get("quantity")
        if isinstance(llm_qty, int) and 1 <= llm_qty <= 999:
            state["quantity"] = llm_qty
    elif lang_result.get("is_language_question"):
        # Question sur la langue en plein flux de commande : on conserve l'état
        # exactement tel quel (le message n'est ni un nom ni une adresse).
        pass
    elif not state.get("product_name"):
        # Porte de routage 3C : tant qu'aucun produit n'est choisi, SEUL
        # start_order (ou une question de langue) ouvre le flux de commande. Une
        # question produit, une recherche, une salutation, une annulation ou un
        # autre message ne doit JAMAIS entrer dans l'état de commande, même s'il
        # contient un nom de produit du catalogue ("شنوما السعر متاع BMW 5 Series؟"
        # ne doit pas créer une commande).
        pass
    else:
        # Autre message en plein flux de commande (nom, téléphone, adresse, email,
        # quantité, changement de produit) : l'extraction déterministe existante
        # reste la source de vérité.
        state = apply_order_message(state, user_msg, catalog)

    next_key, _ = get_next_missing_field(state)
    reply_context = build_reply_context(intent_result, lang_result, state, next_key, user_msg)
    is_language_question = bool(lang_result.get("is_language_question"))
    reply_action = build_reply_action(intent_result, state, next_key, is_language_question)
    system_prompt = (
        CHATBOT_SYSTEM_PROMPT
        .replace("{response_language}", build_response_language_block(lang_result))
        .replace("{reply_context}", reply_context)
        .replace("{reply_action}", reply_action)
        .replace(
            "{reply_style}",
            build_reply_style_examples(intent_result, state, next_key, lang_result, is_language_question),
        )
    )
    if reply_requires_catalog(intent_result, next_key, is_language_question):
        system_prompt += (
            "\n\nCATALOGUE DES PRODUITS DISPONIBLES :\n" + catalog_text
            + "\n\n" + _CATALOG_AUTHORITY
        )
        intent_name = (intent_result or {}).get("intent")
        if intent_name in ("product_inquiry", "product_search"):
            if not match_product_in_catalog(catalog, user_msg):
                system_prompt += (
                    "\n\nFAIT DÉTERMINISTE (vérité absolue) : aucun produit du CATALOGUE "
                    "ci-dessus n'est mentionné dans la demande de l'utilisateur. Tu n'as donc "
                    "AUCUN prix, stock ou disponibilité à donner. Réponds seulement que tu ne "
                    "trouves pas / que tu n'as pas ce produit dans le catalogue, sans inventer de prix."
                )

    formatted_history = []
    if isinstance(message_history, list):
        for msg in message_history:
            if not isinstance(msg, dict):
                continue
            sender = msg.get("sender")
            text = msg.get("text", "")
            if sender == "bot":
                formatted_history.append({"role": "assistant", "content": text})
            else:
                formatted_history.append({"role": "user", "content": text})
    messages = [{"role": "system", "content": system_prompt}] + formatted_history + [{"role": "user", "content": user_message}]

    timeout_payload = {
        "reply": "Désolé, la réponse prend plus de temps que prévu. Pouvez-vous reformuler ?",
        "order_ready": False,
        "order_details": {},
    }
    try:
        content = _call_chatbot_llm(messages, timeout=CHATBOT_TIMEOUT)
    except (requests.exceptions.Timeout, requests.exceptions.RequestException):
        return timeout_payload

    # Remove leading meta lines
    forbidden_prefixes = (
        "votre réponse", "assistant", "response", "note", "remarque",
        "votre reponse", "réponse", "reponse"
    )
    lines = content.split("\n")
    clean_lines = []
    for line in lines:
        l_lower = line.strip().lower()
        if any(l_lower.startswith(p) for p in forbidden_prefixes):
            continue
        clean_lines.append(line)
    content = "\n".join(clean_lines).strip()
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

    # order_ready est déterministe. Il ne vaut true que sur la transition
    # incomplet -> complet : si l'état était déjà complet avant ce message, ce
    # message ne complète pas la commande et ne doit pas redéclencher une
    # persistance (sinon "شكرا" après une commande créerait une 2ème commande).
    next_key, _ = get_next_missing_field(state)
    parsed["order_ready"] = next_key is None and not was_ready_before
    return parsed
