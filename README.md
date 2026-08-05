# Website Builder v0

## Overview

Website Builder v0 is a web application that allows users to create a simple website without writing code.

Users can describe the type of website they want using natural language, and an AI assistant generates an initial layout. The generated website can then be customized through an interactive editor before being published.

This version is the first prototype and focuses on the core website creation workflow.

---

## Features

- Generate a website layout from a text prompt using AI.
- Edit the generated website through a visual interface.
- Add, remove, duplicate, and reorder sections.
- Customize text, colors, fonts, and layouts.
- Upload images for different sections.
- Live preview while editing.
- Save and reload website configurations.

---

## Current Section Types

The builder currently supports three section types:

- **Hero Section**
  - Title and subtitle
  - Image or text-based hero
  - Custom colors and fonts
  - Up to three hero images

- **Columns Section**
  - 1 to 4 columns
  - Text content
  - Single image
  - Image slider

- **Background Overlay Section**
  - Background image
  - Overlay images
  - Title and subtitle
  - Custom styling

---

## Technology Stack

### Backend

- Python
- Django 5
- Django REST Framework
- SQLite

### Frontend

- Next.js 16
- React
- TypeScript

### AI

- Google Gemini API
- Automatic fallback generator when no API key is available

---

## Project Structure

```text
website-builder/
├── backend/      Django REST API
└── frontend/     Next.js application
```

The backend is responsible for:

- AI generation
- Saving website configurations
- Managing uploaded images
- Providing REST APIs

The frontend provides:

- The website editor
- Live preview
- AI prompt interface
- Read-only published view

---

## How It Works

1. The user enters a prompt describing the desired website.
2. The AI generates an initial website configuration.
3. The user edits the generated content and layout.
4. Images can be uploaded for different sections.
5. The configuration is saved in the database.
6. The website can be viewed through the visual page.

---

## Status

This project is currently under active development and serves as the first functional prototype (v0). Future versions will introduce additional customization options, improved AI capabilities, and support for larger, more complex websites.
