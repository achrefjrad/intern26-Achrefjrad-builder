import json
import os
import requests
import google.generativeai as genai

from .config import (
    OLLAMA_API_URL,
    SITE_GENERATION_TIMEOUT,
    GEMINI_MODEL,
)


def call_ollama_chat(messages, model, format_json=True, temperature=0.0, num_ctx=4096, repeat_penalty=None, timeout=SITE_GENERATION_TIMEOUT):
    """Sends a chat completion request to Ollama and returns the parsed JSON or raw content string."""
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature, "num_ctx": num_ctx},
    }
    if format_json:
        payload["format"] = "json"
    if repeat_penalty is not None:
        payload["options"]["repeat_penalty"] = repeat_penalty

    response = requests.post(OLLAMA_API_URL, json=payload, timeout=timeout)
    response.raise_for_status()
    data = response.json()
    return str(data.get("message", {}).get("content", "")).strip()


def call_gemini_generate(prompt, system_instruction=None, model_name=GEMINI_MODEL, temperature=0.85, top_p=0.95):
    """Sends a generation request to Google Gemini API and returns parsed response data."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "default_mock_key":
        return None

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name=model_name,
        system_instruction=system_instruction,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=temperature,
            top_p=top_p,
        ),
    )
    response = model.generate_content(prompt)
    return json.loads(response.text)
