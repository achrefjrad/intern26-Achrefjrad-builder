import json
import requests

from api.prompts import CHATBOT_SYSTEM_PROMPT
from api.services.llm.config import CHATBOT_MODEL, OLLAMA_API_URL, AI_PROVIDER, KAGGLE_API_URL, CHATBOT_TIMEOUT
from api.services.llm.huggingface import call_huggingface
from .catalog_matcher import summarize_catalog_for_chat
from .order_state import (
    normalize_order_state,
    apply_order_message,
    build_order_state_block,
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

    # order_ready est déterministe : toutes les informations requises sont présentes.
    next_key, _ = get_next_missing_field(state)
    parsed["order_ready"] = next_key is None
    return parsed
