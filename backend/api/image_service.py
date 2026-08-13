import json
import os
import urllib.parse
import urllib.request

# Unsplash official API access key (rate limit: 50 requests/hour) - loaded from backend/.env
UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY", "")


def get_stock_image_url(keywords: str, width: int = 1200, height: int = 800) -> str:
    """
    Fetches a royalty-free stock image URL from the official Unsplash API.
    Falls back to LoremFlickr if rate limits (50 req/hr) are exceeded or offline.
    """
    formatted_tags = urllib.parse.quote(keywords.replace(" ", ","))

    if not UNSPLASH_ACCESS_KEY:
        # No API key configured: skip the Unsplash call entirely
        return f"https://loremflickr.com/{width}/{height}/{formatted_tags}"

    try:
        query = urllib.parse.quote(keywords.strip())
        url = f"https://api.unsplash.com/photos/random?query={query}&orientation=landscape"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}",
                "Accept-Version": "v1"
            }
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode("utf-8"))
            raw_url = data.get("urls", {}).get("raw")
            if raw_url:
                # Return dynamic resized Unsplash CDN URL
                return f"{raw_url}&w={width}&h={height}&fit=crop&q=80"
            regular_url = data.get("urls", {}).get("regular")
            if regular_url:
                return regular_url
    except Exception as e:
        print(f"[AI Service] Unsplash API fallback for '{keywords}': {e}")

    # Fallback if Unsplash API rate limit (403/429) or timeout occurs
    return f"https://loremflickr.com/{width}/{height}/{formatted_tags}"


def _stock_url(keyword: str, width: int = 1200, height: int = 800) -> str:
    return get_stock_image_url((keyword or "").strip() or "work, service", width, height)
