# LLM Service subpackage
from .config import (
    GEMINI_MODEL,
    USE_OLLAMA_FOR_GENERATION,
    SITE_GENERATION_MODEL,
    CHATBOT_MODEL,
    OLLAMA_API_URL,
)
from .client import call_ollama_chat, call_gemini_generate

__all__ = [
    "GEMINI_MODEL",
    "USE_OLLAMA_FOR_GENERATION",
    "SITE_GENERATION_MODEL",
    "CHATBOT_MODEL",
    "OLLAMA_API_URL",
    "call_ollama_chat",
    "call_gemini_generate",
]
