import json
import os
import requests
import google.generativeai as genai

from api.prompts import SYSTEM_PROMPT, HOMEPAGE_SYSTEM_PROMPT, CATALOG_SYSTEM_PROMPT
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
from api.image_service import get_stock_image_url
from api.fallbacks import _navbar_section, _footer_section
from .normalizer import _normalize_config, _normalize_catalog
from .section_mappers import (
    VALID_SECTION_TYPES,
    _hero_section,
    _overlay_section,
    _columns_section,
    _gallery_section,
    _testimonials_section,
    _stats_section,
)


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
                "options": {
                    "temperature": 0.0,
                    "num_ctx": 8192,
                    "num_predict": 8192,
                },
            }
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=1800)
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


def generate_homepage_config(prompt):
    """Génère uniquement la configuration homepage (theme + sections), sans catalogue."""
    if AI_PROVIDER == "kaggle":
        try:
            messages = [
                {"role": "system", "content": HOMEPAGE_SYSTEM_PROMPT},
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
            print("[AI Service] Kaggle model generated homepage response successfully!")
            return _normalize_homepage_config(parsed, prompt)
        except Exception as e:
            print(f"[AI Service] Kaggle generation failed: {str(e)}")
            return generate_smart_fallback(prompt)

    if AI_PROVIDER == "huggingface":
        try:
            text = f"{HOMEPAGE_SYSTEM_PROMPT}\n\n{prompt}"
            raw_content = call_huggingface(text)
            raw_content = _strip_markdown_fences(str(raw_content or "").strip())
            parsed = json.loads(raw_content)
            print("[AI Service] Hugging Face model generated homepage response successfully!")
            return _normalize_homepage_config(parsed, prompt)
        except Exception as e:
            print(f"[AI Service] Hugging Face generation failed: {str(e)}")
            return generate_smart_fallback(prompt)

    if USE_OLLAMA_FOR_GENERATION:
        try:
            messages = [
                {"role": "system", "content": HOMEPAGE_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ]
            payload = {
                "model": SITE_GENERATION_MODEL,
                "messages": messages,
                "format": "json",
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_ctx": 8192,
                    "num_predict": 8192,
                },
            }
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=1800)
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
            print(f"[DEBUG homepage] raw_content ({len(raw_content)} chars): {raw_content[:500]}")
            parsed = json.loads(raw_content)
            print(f"[AI Service] Ollama model ({SITE_GENERATION_MODEL}) generated homepage response successfully!")
            result = _normalize_homepage_config(parsed, prompt)
            if not isinstance(result, dict) or "sections" not in result:
                print(f"[DEBUG homepage] _normalize_homepage_config returned fallback for prompt: {prompt!r}")
            return result
        except Exception as e:
            print(f"[AI Service] Ollama homepage generation failed: {str(e)}")
            return generate_smart_fallback(prompt)

    if not USE_OLLAMA_FOR_GENERATION:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key or api_key == "default_mock_key":
            return generate_smart_fallback(prompt)

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=HOMEPAGE_SYSTEM_PROMPT,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.85,
                    top_p=0.95,
                ),
            )
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            print(f"[AI Service] Live Gemini Model ({GEMINI_MODEL}) generated homepage response successfully!")
            return _normalize_homepage_config(data, prompt)
        except Exception as e:
            print(f" [AI Service] Gemini API unavailable ({type(e).__name__}): {str(e)}")
            return generate_smart_fallback(prompt)


def generate_catalog_config(prompt, homepage_context=""):
    """Génère uniquement le catalogue (4 catégories × 6 produits) suite à la génération de la homepage."""
    context_str = ""
    if homepage_context:
        ctx = homepage_context
        if isinstance(ctx, dict):
            if ctx.get("theme"):
                theme_str = f"theme: primary_color={ctx['theme'].get('primary_color', '')}, secondary_color={ctx['theme'].get('secondary_color', '')}, font_family={ctx['theme'].get('font_family', '')}"
                context_str += theme_str + " "
            if ctx.get("sections"):
                sections_types = [s.get("type", "") for s in ctx["sections"] if s.get("type")]
                if sections_types:
                    context_str += f"sections types: {', '.join(sections_types)}. "

    full_prompt = f"{CATALOG_SYSTEM_PROMPT}\n\nPrompt de l'utilisateur: {prompt}\n\nContexte de la homepage: {context_str.strip()}".strip()

    if AI_PROVIDER == "kaggle":
        try:
            messages = [
                {"role": "system", "content": full_prompt},
                {"role": "user", "content": ""},
            ]
            raw_content = _request_kaggle(messages)
            try:
                parsed = json.loads(raw_content)
            except Exception as e:
                print(f"[AI Service] Kaggle returned invalid JSON for catalog: {e}")
                print(f"[AI Service] Kaggle raw response: {raw_content}")
                retry_messages = messages + [{"role": "user", "content": JSON_CORRECTION_PROMPT}]
                raw_content = _request_kaggle(retry_messages)
                parsed = json.loads(raw_content)
            print("[AI Service] Kaggle model generated catalog response successfully!")
            return _normalize_catalog_only(parsed)
        except Exception as e:
            print(f"[AI Service] Kaggle generation failed for catalog: {str(e)}")
            return _fallback_catalog_only(prompt)

    if AI_PROVIDER == "huggingface":
        try:
            text = full_prompt
            raw_content = call_huggingface(text)
            raw_content = _strip_markdown_fences(str(raw_content or "").strip())
            parsed = json.loads(raw_content)
            print("[AI Service] Hugging Face model generated catalog response successfully!")
            return _normalize_catalog_only(parsed)
        except Exception as e:
            print(f"[AI Service] Hugging Face generation failed for catalog: {str(e)}")
            return _fallback_catalog_only(prompt)

    if USE_OLLAMA_FOR_GENERATION:
        try:
            payload = {
                "model": SITE_GENERATION_MODEL,
                "messages": [
                    {"role": "system", "content": CATALOG_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Prompt de l'utilisateur: {prompt}\n\nContexte de la homepage: {context_str.strip()}"},
                ],
                "format": "json",
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_ctx": 8192,
                    "num_predict": 8192,
                },
            }
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=1800)
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
            print(f"[DEBUG catalog] raw_content ({len(raw_content)} chars): {raw_content[:500]}")
            parsed = json.loads(raw_content)
            print(f"[AI Service] Ollama model ({SITE_GENERATION_MODEL}) generated catalog response successfully!")
            result = _normalize_catalog_only(parsed)
            if result is None:
                print(f"[DEBUG catalog] _normalize_catalog_only returned None for prompt: {prompt!r} — using fallback")
                return _fallback_catalog_only(prompt)
            return result
        except Exception as e:
            print(f"[AI Service] Ollama catalog generation failed: {str(e)}")
            return _fallback_catalog_only(prompt)

    if not USE_OLLAMA_FOR_GENERATION:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key or api_key == "default_mock_key":
            return _fallback_catalog_only(prompt)

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=full_prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.85,
                    top_p=0.95,
                ),
            )
            # full_prompt already embeds the user prompt + homepage context in the
            # system instruction, so we only need a minimal user trigger here.
            response = model.generate_content("Génère le catalogue.")
            data = json.loads(response.text)
            print(f"[AI Service] Live Gemini Model ({GEMINI_MODEL}) generated catalog response successfully!")
            return _normalize_catalog_only(data)
        except Exception as e:
            print(f" [AI Service] Gemini API unavailable ({type(e).__name__}): {str(e)}")
            return _fallback_catalog_only(prompt)


def _normalize_homepage_config(data, prompt=""):
    """Normalise la réponse de l'IA pour la génération homepage (sans catalogue)."""
    try:
        if not isinstance(data, dict) or not isinstance(data.get("sections"), list) or not data["sections"]:
            return generate_smart_fallback(prompt)

        theme_raw = data.get("theme") if isinstance(data.get("theme"), dict) else {}
        font_family = str(theme_raw.get("font_family", "sans-serif")).lower()
        if font_family not in ("serif", "sans-serif", "monospace"):
            font_family = "sans-serif"
        border_radius = str(theme_raw.get("border_radius", "lg")).lower()
        if border_radius not in ("none", "sm", "lg", "full"):
            border_radius = "lg"
        theme = {
            "primary_color": str(theme_raw.get("primary_color", "#4f46e5")),
            "secondary_color": str(theme_raw.get("secondary_color", "#06b6d4")),
            "background_color": str(theme_raw.get("background_color", "#ffffff")),
            "font_family": font_family,
            "border_radius": border_radius,
        }

        id_counts = {}
        sections = []
        for raw_sec in data["sections"]:
            if not isinstance(raw_sec, dict):
                continue
            sec_type = str(raw_sec.get("type", "")).strip()
            if sec_type not in VALID_SECTION_TYPES:
                continue
            id_counts[sec_type] = id_counts.get(sec_type, 0) + 1
            sec_id = str(raw_sec.get("id", "")).strip() or f"{sec_type}_{id_counts[sec_type]}"

            if sec_type == "hero":
                sections.append(_hero_section(raw_sec, sec_id))
            elif sec_type == "columns":
                sections.append(_columns_section(raw_sec, sec_id))
            elif sec_type == "gallery":
                sections.append(_gallery_section(raw_sec, sec_id))
            elif sec_type == "testimonials":
                sections.append(_testimonials_section(raw_sec, sec_id))
            elif sec_type == "stats":
                sections.append(_stats_section(raw_sec, sec_id))
            elif sec_type == "overlay":
                sections.append(_overlay_section(raw_sec, sec_id))
            elif sec_type == "navbar":
                sections.append(_navbar_section(raw_sec, sec_id))
            elif sec_type == "footer":
                sections.append(_footer_section(raw_sec, sec_id))

        if not sections:
            print(f"[DEBUG homepage] No valid sections found after mapping, falling back.")
            return generate_smart_fallback(prompt)

        return {"theme": theme, "sections": sections}
    except Exception as e:
        import traceback
        print(f"[DEBUG homepage] _normalize_homepage_config failed with error: {e}")
        traceback.print_exc()
        return generate_smart_fallback(prompt)


def _normalize_catalog_only(data):
    """Extrait uniquement le catalogue d'une réponse IA."""
    try:
        raw = data.get("catalog") if isinstance(data, dict) else None
        if not isinstance(raw, list):
            return None
        catalog = []
        for cat in raw:
            if not isinstance(cat, dict):
                continue
            name = str(cat.get("name", "") or "").strip()
            products = []
            raw_products = cat.get("products")
            if isinstance(raw_products, list):
                for prod in raw_products:
                    if not isinstance(prod, dict):
                        continue
                    pname = str(prod.get("name", "") or "").strip()
                    if not pname:
                        continue
                    keyword = str(prod.get("image_keyword", "") or "").strip() or "product"
                    stock_raw = prod.get("stock")
                    try:
                        stock = int(stock_raw) if stock_raw is not None else 0
                    except (ValueError, TypeError):
                        stock = 0
                    products.append({
                        "name": pname,
                        "price": str(prod.get("price", "") or "").strip() or "Prix sur demande",
                        "image_keyword": keyword,
                        "image_url": get_stock_image_url(keyword, 800, 800),
                        "description": str(prod.get("description", "") or "").strip() or f"{pname}. Un produit de qualité sélectionné pour vous.",
                        "stock": stock,
                    })
            if name and products:
                catalog.append({"name": name, "products": products})
        return catalog if catalog else None
    except Exception as e:
        import traceback
        print(f"[DEBUG catalog] _normalize_catalog_only failed with error: {e}")
        traceback.print_exc()
        return None


def _fallback_catalog_only(prompt):
    """Génère un catalogue de fallback lorsqu l'IA est indisponible."""
    from api.fallbacks import generate_smart_fallback
    from api.fallbacks import _fallback_catalog
    fallback = _fallback_catalog(prompt)
    if fallback:
        return fallback
    return generate_smart_fallback(prompt)
