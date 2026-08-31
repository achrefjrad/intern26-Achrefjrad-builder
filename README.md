# Website Builder v0

## Overview

Website Builder v0 is a web application that allows users to create a simple website without writing code.

Users can describe the type of website they want using natural language, and an AI assistant generates an initial layout. The generated website can then be customized through an interactive editor before being published.

This version is the first prototype and focuses on the core website creation workflow.

---

## Features

- Generate a website layout from a text prompt using AI (two-stage: homepage + catalog).
- Edit the generated website through a visual interface.
- Add, remove, duplicate, and reorder sections.
- Customize text, colors, fonts, and layouts.
- Upload images for different sections.
- Live preview while editing.
- Save and reload website configurations.
- E-commerce catalog with 4 categories × 6 products (24 total) for the Découvrir page.
- Integrated order chatbot for customer inquiries.

---

## Current Section Types

The builder supports **8 section types**:

- **Navbar** (always first)
  - Brand name, navigation links (3-4), CTA button
- **Hero Section**
  - Title, subtitle, CTA
  - Layout styles: centered_bg, split_50_50, minimal_text
  - Image or text-based hero
  - Custom colors, fonts, font sizes
  - Up to three hero images
- **Columns Section**
  - 1 to 4 columns
  - Layout styles: grid_cards, asymmetric_featured, alternating_rows
  - Text content, single image, or image slider per column
- **Gallery Section**
  - Layout styles: masonry_grid, row_grid
  - 3 to 6 items with titles and images
- **Testimonials Section**
  - Layout styles: quote_cards, full_width_quote
  - Reviews with quote, author, role
- **Stats Section**
  - Layout styles: metric_grid, banner_stats
  - Metrics with label and value
- **Background Overlay Section**
  - Layout styles: full_bg_banner, split_cta
  - Background image, overlay images, title, subtitle, CTA
  - Custom text styling
- **Footer** (always last)
  - Brand name, description, copyright
  - Navigation links, social links

---

## Technology Stack

### Backend

- Python 3.10+
- Django 5.2
- Django REST Framework
- SQLite (development)

### Frontend

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4

### AI Generation

**Primary (local):** Ollama with `gemma3:4b` model

**Fallback providers (configurable via env):**
- Google Gemini API (`gemini-3.6-flash`)
- Kaggle remote inference (Qwen2.5-Coder:3B on Tesla T4)
- Hugging Face ZeroGPU (Qwen3-VL-8B-Instruct via Gradio)

**Generation flow (two-stage):**
1. **Homepage generation** — theme + 6-8 sections (navbar → content → footer), no catalog
2. **Catalog generation** — exactly 4 categories × 6 products (24 total), using original prompt + homepage context (brand, theme)

**Fallback behavior:** When AI providers are unavailable or return invalid JSON, domain-specific smart fallbacks generate themed content (bakery, animalerie, legal, restaurant, generic).

---

## Project Structure

```text
website-builder/
├── backend/                    # Django REST API
│   ├── api/
│   │   ├── models.py           # Project, Category, Product, Order, OrderLine
│   │   ├── views.py            # REST endpoints (generate, config, projects, orders, chat)
│   │   ├── prompts.py          # System prompts (HOMEPAGE_SYSTEM_PROMPT, CATALOG_SYSTEM_PROMPT, CHATBOT_SYSTEM_PROMPT)
│   │   ├── fallbacks.py        # Domain-specific fallback generators
│   │   ├── image_service.py    # Unsplash/LoremFlickr stock images
│   │   └── services/
│   │       ├── site_generation/  # Generator, normalizer, section mappers
│   │       ├── llm/              # Provider configs, clients (Ollama, Gemini, HF)
│   │       └── chatbot/          # Order flow chatbot
│   ├── backend/                # Django settings, URLs
│   └── manage.py
├── frontend/                   # Next.js application
│   ├── app/                    # App Router pages (builder, assistant)
│   ├── components/             # Editor, preview, panels, modals, sections
│   ├── lib/                    # Config, normalizers, defaults
│   └── types/                  # TypeScript types
└── docker-compose.yml          # Backend (8000) + Frontend (3000)
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate/` | Two-stage AI generation (homepage → catalog) |
| GET/POST | `/api/config/` | Get/save draft project config |
| GET/POST | `/api/projects/` | List/create saved projects |
| GET/DELETE | `/api/projects/<name>/` | Load/delete project by name |
| POST | `/api/upload-images/` | Upload section images |
| POST | `/api/chat/` | Order chatbot |
| POST | `/api/orders/` | Create order |

---

## Configuration

Key environment variables (backend/.env):

```ini
GEMINI_API_KEY=...              # Optional: enables Gemini provider
UNSPLASH_ACCESS_KEY=...         # Optional: stock photos
AI_PROVIDER=ollama              # ollama | kaggle | huggingface
USE_OLLAMA_FOR_GENERATION=True  # False = use Gemini API
OLLAMA_BASE_URL=http://localhost:11434
KAGGLE_API_URL=...              # ngrok URL for remote Qwen
HUGGINGFACE_SPACE=...           # HF Space for Qwen3-VL
```

---

## How It Works

1. User enters a prompt (e.g., "un site web pour un café shop").
2. **Call 1 (homepage):** AI generates theme + sections (navbar, hero, columns, gallery, testimonials, stats, overlay, footer) — no catalog.
3. Homepage displays immediately in the editor.
4. **Call 2 (catalog):** AI generates 4 categories × 6 products using original prompt + homepage context (brand, theme).
5. Catalog populates the Découvrir page.
6. User edits content, layout, images in the visual editor.
7. Configuration saved to database via `/api/config/` or `/api/projects/`.
8. Published view available at `/project/<name>/`.

---

## Status

This project is currently under active development and serves as the first functional prototype (v0).

**Known issues (v0):**
- `gemma3:4b` sometimes returns JSON that fails validation, triggering generic fallbacks.
- Catalog domain relevance depends on model capability to follow complex schema + prompt.
- Two-stage generation increases latency vs. single call.

Future versions will introduce improved AI capabilities, better fallback handling, and support for larger, more complex websites.