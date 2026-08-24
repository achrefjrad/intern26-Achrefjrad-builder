import os

# AI provider selection: "ollama" (default) or "kaggle" (remote Qwen2.5-Coder:3B on a Tesla T4)
AI_PROVIDER = os.environ.get("AI_PROVIDER", "ollama")

# Modern active model identifier (used when USE_OLLAMA_FOR_GENERATION is False)
GEMINI_MODEL = "gemini-3.6-flash"

# Toggle website generation between local Ollama and Gemini API
USE_OLLAMA_FOR_GENERATION = True

# Local Ollama models (used for website generation and the e-commerce chatbot)
SITE_GENERATION_MODEL = "gemma3:4b"  # Used for generating structured website JSON
CHATBOT_MODEL = "gemma3:4b"                  # Used for customer chat interactions
OLLAMA_API_URL = f"{os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434').rstrip('/')}/api/chat"

# Remote Kaggle inference server (Qwen2.5-Coder:3B on a Tesla T4, exposed via ngrok)
KAGGLE_API_URL = os.environ.get("KAGGLE_API_URL", "")

# Hugging Face ZeroGPU Space (Qwen3-VL-8B-Instruct via Gradio)
HUGGINGFACE_SPACE = os.environ.get("HUGGINGFACE_SPACE", "developer0hye/Qwen3-VL-8B-Instruct")

# Timeout constants (in seconds)
SITE_GENERATION_TIMEOUT = 1800
CHATBOT_TIMEOUT = 90
