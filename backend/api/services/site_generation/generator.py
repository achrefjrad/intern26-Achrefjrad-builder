import json
import os
import requests
import google.generativeai as genai

from api.prompts import SYSTEM_PROMPT
from api.fallbacks import generate_smart_fallback
from api.services.llm.config import (
    USE_OLLAMA_FOR_GENERATION,
    SITE_GENERATION_MODEL,
    GEMINI_MODEL,
    OLLAMA_API_URL,
    AI_PROVIDER,
    KAGGLE_API_URL,
    SITE_GENERATION_TIMEOUT,
)
from api.services.llm.huggingface import call_huggingface
from .normalizer import _normalize_config


JSON_CORRECTION_PROMPT = (
    "Votre réponse précédente n'était pas un JSON valide. "
    "Renvoyez exactement la même configuration sous forme de JSON valide. "
    "Remplacez toute expression JavaScript/Python par des valeurs JSON littérales. "
    "N'émettez QUE du JSON, rien d'autre."
)


def _strip_markdown_fences(raw_content):
    if raw_content.startswith("```"):
        lines = raw_content.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw_content = "\n".join(lines).strip()
    return raw_content


def _request_kaggle(messages):
    if not KAGGLE_API_URL:
        raise Exception("KAGGLE_API_URL is not configured")
    response = requests.post(KAGGLE_API_URL, json={"messages": messages}, timeout=SITE_GENERATION_TIMEOUT)
    response.raise_for_status()
    data = response.json()
    return _strip_markdown_fences(str(data.get("response", "") or "").strip())


def generate_config(prompt):
    """Génère la configuration complète du site (thème, sections, catalogue) via Kaggle, Ollama ou Gemini."""
    if AI_PROVIDER == "kaggle":
        try:
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ]
            raw_content = _request_kaggle(messages)
            try:
                parsed = json.loads(raw_content)
            except Exception as e:
                print(f"[AI Service] Kaggle returned invalid JSON: {e}")
                print(f"[AI Service] Kaggle raw response: {raw_content}")
                retry_messages = messages + [{"role": "user", "content": JSON_CORRECTION_PROMPT}]
                raw_content = _request_kaggle(retry_messages)
                parsed = json.loads(raw_content)
            print("[AI Service] Kaggle model (Qwen2.5-Coder:3B) generated response successfully!")
            return _normalize_config(parsed, prompt)
        except Exception as e:
            print(f"[AI Service] Kaggle generation failed: {str(e)}")
            return generate_smart_fallback(prompt)

    if AI_PROVIDER == "huggingface":
        try:
            text = f"{SYSTEM_PROMPT}\n\n{prompt}"
            raw_content = call_huggingface(text)
            raw_content = _strip_markdown_fences(str(raw_content or "").strip())
            # DEBUG (temporary): inspect the raw model output before JSON parsing.
            print(f"[DEBUG] Hugging Face raw response ({len(raw_content)} chars):")
            if len(raw_content) <= 6000:
                print(raw_content)
            else:
                print(raw_content[:3000])
                print("[DEBUG] ... [truncated middle] ...")
                print(raw_content[-3000:])
            parsed = json.loads(raw_content)
            print("[AI Service] Hugging Face model (Qwen3-VL-8B-Instruct) generated response successfully!")
            return _normalize_config(parsed, prompt)
        except Exception as e:
            print(f"[AI Service] Hugging Face generation failed: {str(e)}")
            return generate_smart_fallback(prompt)

    if USE_OLLAMA_FOR_GENERATION:
        try:
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ]
            payload = {
                "model": SITE_GENERATION_MODEL,
                "messages": messages,
                "format": "json",
                "stream": False,
                "options": {"temperature": 0.0, "num_ctx": 4096},
            }
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=300)
            response.raise_for_status()
            data = response.json()
            raw_content = str(data.get("message", {}).get("content", "")).strip()
            if raw_content.startswith("```"):
                lines = raw_content.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw_content = "\n".join(lines).strip()
            parsed = json.loads(raw_content)
            print(f"[AI Service] Ollama model ({SITE_GENERATION_MODEL}) generated response successfully!")
            return _normalize_config(parsed, prompt)
        except Exception as e:
            print(f"[AI Service] Ollama generation failed: {str(e)}")
            return generate_smart_fallback(prompt)

    if not USE_OLLAMA_FOR_GENERATION:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key or api_key == "default_mock_key":
            return generate_smart_fallback(prompt)

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=SYSTEM_PROMPT,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.85,
                    top_p=0.95,
                ),
            )
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            print(f"[AI Service] Live Gemini Model ({GEMINI_MODEL}) generated response successfully!")
            return _normalize_config(data, prompt)
        except Exception as e:
            print(f" [AI Service] Gemini API unavailable ({type(e).__name__}): {str(e)}")
            return generate_smart_fallback(prompt)
