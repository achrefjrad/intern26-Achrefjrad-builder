import os

import requests

from .config import HUGGINGFACE_SPACE


def call_huggingface(text):
    """Appelle le Space Hugging Face ZeroGPU et renvoie le contenu brut de l'assistant.

    Le client Gradio renvoie un tuple (message, historique) et la réponse du modèle
    se trouve dans result[1][-1]["content"]. Le token Hugging Face (HF_TOKEN) est
    passé au Client pour authentifier les appels ZeroGPU et n'est jamais journalisé.
    Toute erreur est convertie en requests.exceptions.RequestException pour reposer
    sur les mécanismes de repli déjà utilisés par les autres fournisseurs.
    """
    if not HUGGINGFACE_SPACE:
        raise requests.exceptions.RequestException("HUGGINGFACE_SPACE is not configured")
    from gradio_client import Client

    token = os.environ.get("HF_TOKEN", "") or None

    try:
        client = Client(HUGGINGFACE_SPACE, token=token)
        result = client.predict(
            message={"text": text, "files": []},
            history=[],
            api_name="/chat_fn",
        )
        content = result[1][-1]["content"]
        # DEBUG (temporary): measure the raw response returned by the Space.
        print(f"[DEBUG] Hugging Face response length: {len(content)} chars")
        if len(content) <= 6000:
            print("[DEBUG] Hugging Face full response:")
            print(content)
        else:
            print("[DEBUG] Hugging Face response head (3000):")
            print(content[:3000])
            print("[DEBUG] Hugging Face response tail (3000):")
            print(content[-3000:])
        return content
    except requests.exceptions.RequestException:
        raise
    except Exception as e:
        raise requests.exceptions.RequestException(f"Hugging Face request failed: {e}")