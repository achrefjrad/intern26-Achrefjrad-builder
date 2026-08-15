import os

# Modern active model identifier (used when USE_OLLAMA_FOR_GENERATION is False)
GEMINI_MODEL = "gemini-3.6-flash"

# Toggle website generation between local Ollama and Gemini API
USE_OLLAMA_FOR_GENERATION = True

# Local Ollama models (used for website generation and the e-commerce chatbot)
SITE_GENERATION_MODEL = "qwen2.5-coder:3b"  # Used for generating structured website JSON
CHATBOT_MODEL = "mistral:7b"                  # Used for customer chat interactions
OLLAMA_API_URL = f"{os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434').rstrip('/')}/api/chat"

# Timeout constants (in seconds)
SITE_GENERATION_TIMEOUT = 300
CHATBOT_TIMEOUT = 90
