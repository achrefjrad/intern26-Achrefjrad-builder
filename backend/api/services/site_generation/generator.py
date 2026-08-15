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
)
from .normalizer import _normalize_config


def generate_config(prompt):
    """Génère la configuration complète du site (thème, sections, catalogue) via Ollama ou Gemini."""
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
