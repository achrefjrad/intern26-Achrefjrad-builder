import json
import os
import traceback

from google.api_core.client_options import ClientOptions
import google.generativeai as genai

# Modern active model identifier
GEMINI_MODEL = 'gemini-3.6-flash'

SYSTEM_PROMPT = """
Tu es un directeur artistique et développeur expert en création de sites web one-page. À partir de la demande de l'utilisateur en français, tu génères une configuration JSON valide qui correspond EXACTEMENT à ce schéma :

{
  "hero_first": true ou false (true = la bannière est en haut, false = les colonnes sont en haut),
  "hero_type": "image" ou "text",
  "hero_title": "titre français accrocheur pour l'entreprise ou le sujet",
  "hero_subtitle": "sous-titre français persuasif",
  "hero_text_color": "code HEX valide pour le texte de la bannière (ex: #ffffff, #f8fafc, #fef08a)",
  "hero_font_family": "choisis parmi : 'sans-serif' (moderne/tech), 'serif' (classique/luxe), ou 'monospace' (code/créatif)",
  "hero_font_size": "'sm', 'md', 'lg' ou 'xl' selon l'impact visuel souhaité",
  "column_count": nombre entier (1, 2, 3 ou 4),
  "columns": [
    {
      "position": nombre entier (1 à 4),
      "content_type": "both" | "image_only" | "text_only",
      "text": "description française pertinente pour cette section"
    }
  ],
  "section_order": ["hero", "columns", "overlay"] (ordonne CES EXACTEMENT 3 chaînes de manière logique selon l'objectif du site),
  "overlay_title": "titre impactant pour la section de mise en valeur (call-to-action)",
  "overlay_subtitle": "sous-titre persuasif ou slogan de conclusion",
  "overlay_text_color": "code HEX valide pour le texte de l'overlay (ex: #ffffff, #f8fafc, #fef08a)",
  "overlay_font_family": "choisis parmi : 'sans-serif' (moderne/tech), 'serif' (classique/artisan/juridique/luxe), ou 'monospace' (code/créatif)"
}

Règles importantes et liberté créative :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte supplémentaire, sans commentaires, sans backticks ni balises.
- Agencement dynamique (section_order) : Choisis l'ordre d'affichage des 3 sections ("hero", "columns", "overlay") le plus adapté au sujet. Par exemple, pour un site promotionnel urgent, tu peux placer "overlay" en deuxième.
- Typographie et Couleur : Déduis l'ambiance visuelle du sujet. Utilise une police "serif" élégante pour un cabinet d'avocats, une boulangerie ou du luxe, et "sans-serif" pour une agence ou une startup. Choisis des couleurs HEX claires (#ffffff, #f8fafc, #fef08a) bien lisibles sur fond sombre, tant pour la bannière (hero) que pour l'overlay.
- hero_first : true par défaut (bannière en haut), sauf si la demande suggère clairement le contraire.
- column_count : choisis entre 1 et 4 selon le nombre de spécialités/sections mentionnées (2 ou 3 par défaut si non précisé).
- Textes : Tous les textes (hero, colonnes, overlay) doivent être rédigés en français, naturels, professionnels et attractifs.
- Le JSON doit être parfaitement formé et parsable par json.loads.
"""


def generate_smart_fallback(prompt: str) -> dict:
    """Génère un agencement dynamique basé sur les mots-clés si l'API est indisponible."""
    p = prompt.lower() if prompt else ""

    # Détection du nombre de colonnes
    if "1 colonne" in p or "une colonne" in p:
        column_count = 1
    elif "2 colonnes" in p or "deux colonnes" in p:
        column_count = 2
    elif "4 colonnes" in p or "quatre colonnes" in p:
        column_count = 4
    else:
        column_count = 3

    # Détection du type de héros et disposition
    hero_type = "image" if ("image" in p or "photo" in p or "bannière" in p) else "text"
    hero_first = False if ("colonnes en haut" in p or "colonnes en premier" in p) else True

    # Détection de la thématique (textes + direction artistique)
    if any(k in p for k in ["boulangerie", "pâtisserie", "pain"]):
        hero_title = "Boulangerie Artisanale & Pâtisserie"
        hero_subtitle = "Le goût authentique du pain frais et des viennoiseries faites maison."
        hero_text_color = "#fef08a"
        hero_font_family = "serif"
        hero_font_size = "xl"
        overlay_title = "Commandez Vos Créations Pâtissières"
        overlay_subtitle = "Une envie particulière pour votre événement ? Contactez nos artisans."
        overlay_font_family = "serif"
        overlay_text_color = "#fef08a"
        section_order = ["hero", "columns", "overlay"]
        col_texts = [
            "Pains Traditionnels : Fabriqués chaque matin avec des farines locales et au levain naturel.",
            "Viennoiseries : Croissants au beurre AOP et pains au chocolat croustillants.",
            "Gâteaux & Tartes : Des créations gourmandes pour tous vos événements d'exception.",
            "Service Traiteur : Vos pièces montées et buffets sucrés sur commande.",
        ]
    elif any(k in p for k in ["avocat", "juridique", "cabinet", "droit"]):
        hero_title = "Cabinet d'Avocats & Conseil Juridique"
        hero_subtitle = "Un accompagnement rigoureux et personnalisé pour tous vos besoins juridiques."
        hero_text_color = "#ffffff"
        hero_font_family = "serif"
        hero_font_size = "xl"
        overlay_title = "Une Urgence Juridique ?"
        overlay_subtitle = "Prenez rendez-vous en ligne avec l'un de nos associés."
        overlay_font_family = "serif"
        overlay_text_color = "#ffffff"
        section_order = ["hero", "columns", "overlay"]
        col_texts = [
            "Droit des Affaires : Conseil et accompagnement des entreprises et dirigeants.",
            "Droit Immobilier : Baux, transactions et contentieux immobiliers.",
            "Droit du Travail : Défense des salariés et assistance aux employeurs.",
            "Gestion des Contentieux : Représentation devant toutes les juridictions.",
        ]
    elif any(k in p for k in ["pizza", "restaurant", "cuisine", "italien"]):
        hero_title = "Restaurant & Pizzeria Gourmande"
        hero_subtitle = "Des ingrédients frais et des recettes traditionnelles préparées avec passion."
        hero_text_color = "#fef08a"
        hero_font_family = "serif"
        hero_font_size = "xl"
        overlay_title = "Réservez Votre Table Dès Maintenant"
        overlay_subtitle = "Une soirée inoubliable autour de la gastronomie italienne vous attend."
        overlay_font_family = "serif"
        overlay_text_color = "#fef08a"
        section_order = ["hero", "columns", "overlay"]
        col_texts = [
            "Plats du Jour : Une cuisine de saison élaborée à partir de produits frais.",
            "Pizzas au Feu de Bois : Pâte artisanale maturée 48h et garnitures savoureuses.",
            "Desserts Maison : Tiramisu traditionnel, panna cotta et tartes de la maison.",
            "Réservations : Réservez votre table en ligne pour vos dîners et événements.",
        ]
    else:
        hero_title = "Bienvenue sur notre site web"
        hero_subtitle = "Découvrez nos services sur mesure et notre savoir-faire d'exception."
        hero_text_color = "#ffffff"
        hero_font_family = "sans-serif"
        hero_font_size = "xl"
        overlay_title = "Prêt à Lancer Votre Projet ?"
        overlay_subtitle = "Discutons de vos ambitions et construisons ensemble votre succès."
        overlay_font_family = "sans-serif"
        overlay_text_color = "#ffffff"
        section_order = ["hero", "columns", "overlay"]
        col_texts = [
            "Présentation : Découvrez notre équipe passionnée et notre savoir-faire unique.",
            "Nos Services : Des solutions sur mesure adaptées à tous vos projets.",
            "Engagement Qualité : Une exigence constante pour votre entière satisfaction.",
            "Contact : Contactez-nous dès aujourd'hui pour obtenir votre devis personnalisé.",
        ]

    columns = []
    for i in range(1, column_count + 1):
        columns.append({
            "position": i,
            "content_type": "both",
            "text": col_texts[i - 1] if i - 1 < len(col_texts) else f"Section {i} : Description personnalisée pour votre projet.",
        })

    return {
        "hero_first": hero_first,
        "hero_type": hero_type,
        "hero_title": hero_title,
        "hero_subtitle": hero_subtitle,
        "hero_text_color": hero_text_color,
        "hero_font_family": hero_font_family,
        "hero_font_size": hero_font_size,
        "column_count": column_count,
        "columns": columns,
        "section_order": section_order,
        "overlay_title": overlay_title,
        "overlay_subtitle": overlay_subtitle,
        "overlay_text_color": overlay_text_color,
        "overlay_font_family": overlay_font_family,
    }


def _normalize_config(data):
    try:
        hero_type = data.get('hero_type', 'image')
        if hero_type not in ('image', 'text'):
            hero_type = 'image'

        try:
            column_count = int(data.get('column_count', 3))
        except (TypeError, ValueError):
            column_count = 3
        column_count = max(1, min(4, column_count))

        columns_raw = data.get('columns') or []
        columns = []
        for i in range(1, column_count + 1):
            entry = next((c for c in columns_raw if c.get('position') == i), {})
            content_type = entry.get('content_type', 'both')
            if content_type not in ('both', 'image_only', 'text_only'):
                content_type = 'both'
            columns.append({
                'position': i,
                'content_type': content_type,
                'text': str(entry.get('text', '')),
            })

        # --- VALIDATION DE LA LIBERTÉ CRÉATIVE ---
        # 1. Validation de l'ordre des sections (doit contenir exactement les 3 sections)
        valid_sections = {"hero", "columns", "overlay"}
        raw_order = data.get('section_order', ["hero", "columns", "overlay"])
        if not isinstance(raw_order, list) or set(raw_order) != valid_sections:
            section_order = ["hero", "columns", "overlay"]
        else:
            section_order = raw_order

        # 2. Validation de la police de caractère (hero + overlay)
        hero_font_family = str(data.get('hero_font_family', 'sans-serif')).lower()
        if hero_font_family not in ('sans-serif', 'serif', 'monospace', 'playfair'):
            hero_font_family = 'sans-serif'
        font_family = str(data.get('overlay_font_family', 'sans-serif')).lower()
        if font_family not in ('sans-serif', 'serif', 'monospace'):
            font_family = 'sans-serif'

        # 2bis. Validation de la taille de police (hero)
        hero_font_size = str(data.get('hero_font_size', 'xl')).lower()
        if hero_font_size not in ('sm', 'md', 'lg', 'xl'):
            hero_font_size = 'xl'

        # 3. Validation du code couleur HEX
        hero_text_color = str(data.get('hero_text_color', '#ffffff')).strip()
        if not (hero_text_color.startswith('#') and len(hero_text_color) in (4, 7)):
            hero_text_color = '#ffffff'
        text_color = str(data.get('overlay_text_color', '#ffffff')).strip()
        if not (text_color.startswith('#') and len(text_color) in (4, 7)):
            text_color = '#ffffff'

        return {
            'hero_first': bool(data.get('hero_first', True)),
            'hero_type': hero_type,
            'hero_title': str(data.get('hero_title', '')),
            'hero_subtitle': str(data.get('hero_subtitle', '')),
            'hero_text_color': hero_text_color,
            'hero_font_family': hero_font_family,
            'hero_font_size': hero_font_size,
            'column_count': column_count,
            'columns': columns,
            'section_order': section_order,
            'overlay_title': str(data.get('overlay_title', 'Section de mise en valeur')),
            'overlay_subtitle': str(data.get('overlay_subtitle', 'Découvrez nos engagements')),
            'overlay_text_color': text_color,
            'overlay_font_family': font_family,
        }
    except Exception:
        return generate_smart_fallback("")


def generate_config(prompt):
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key or api_key == 'default_mock_key':
        return generate_smart_fallback(prompt)

    try:
        # Laissez le SDK gérer l'endpoint automatiquement par défaut
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            ),
        )
        response = model.generate_content(prompt)
        data = json.loads(response.text)
        print(f"[AI Service] Live Gemini Model ({GEMINI_MODEL}) generated response successfully!")
        return _normalize_config(data)
    except Exception as e:
        print(f" [AI Service] Gemini API unavailable ({type(e).__name__}): {str(e)}")
        return generate_smart_fallback(prompt)