import os
os.chdir('C:/Users/nitro/website-builder')
import sys
sys.path.insert(0, 'backend')
sys.path.insert(0, '.')

os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
import django
django.setup()

from api.services.site_generation.generator import _normalize_homepage_config, generate_catalog_config, _normalize_catalog_only

# Test _normalize_homepage_config with mock AI output
print('=== Test _normalize_homepage_config ===')
mock_ai_output = {
    "theme": {
        "primary_color": "#b45309",
        "secondary_color": "#f59e0b",
        "background_color": "#fff7ed",
        "font_family": "serif",
        "border_radius": "lg"
    },
    "sections": [
        {
            "id": "navbar_1",
            "type": "navbar",
            "layout_style": "default",
            "brand_name": "Boulangerie Artisanale",
            "links": [
                {"label": "Accueil", "href": "#"},
                {"label": "Services", "href": "#"},
                {"label": "Contact", "href": "#"}
            ],
            "cta_text": "Nous trouver"
        },
        {
            "id": "hero_1",
            "type": "hero",
            "layout_style": "centered_bg",
            "title": "Boulangerie Artisanale & Pâtisserie",
            "subtitle": "Le goût authentique du pain frais et des viennoiseries faites maison.",
            "cta_text": "Découvrir nos créations",
            "image_keyword": "bakery, bread",
            "image_url": "http://example.com/image.jpg"
        },
        {
            "id": "columns_1",
            "type": "columns",
            "layout_style": "grid_cards",
            "title": "Nos services",
            "subtitle": "Ce que nous pouvons faire pour vous",
            "columns": [
                {
                    "position": 1,
                    "content_type": "both",
                    "title": "Pain de campagne",
                    "text": "Fabriqué chaque matin",
                    "image_keyword": "artisan bread",
                    "image_url": "http://example.com/img1.jpg",
                    "images": [],
                    "text": ""
                }
            ]
        }
    ]
}

result = _normalize_homepage_config(mock_ai_output, 'Test prompt bakery')
print('Result type:', type(result))
if isinstance(result, dict):
    print('Theme:', result.get('theme'))
    print('Sections count:', len(result.get('sections', [])))
    for s in result.get('sections', []):
        print(' -', s.get('type'), ': id=' + str(s.get('id')))
    print('No catalog key present:', 'catalog' not in result)
else:
    print('Result:', result)

print()
print('=== Test _normalize_catalog_only ===')
mock_catalog_ai = {
    "catalog": [
        {
            "name": "Pains",
            "products": [
                {"name": "Pain de Campagne", "price": "4.50 €", "image_keyword": "sourdough bread", "description": "Pain au levain", "stock": 25},
                {"name": "Baguette Tradition", "price": "1.30 €", "image_keyword": "french baguette", "description": "Baguette classique", "stock": 30},
                {"name": "Pain Complet Bio", "price": "3.20 €", "image_keyword": "whole grain bread", "description": "Pain complet bio", "stock": 15},
                {"name": "Pain aux Céréales", "price": "3.80 €", "image_keyword": "multi grain bread", "description": "Pain aux céréales", "stock": 20},
                {"name": "Pain de Seigle", "price": "4.20 €", "image_keyword": "rye bread", "description": "Pain de seigle", "stock": 10},
                {"name": "Fougasse aux Olives", "price": "5.50 €", "image_keyword": "focaccia olives", "description": "Fougasse aux olives", "stock": 8}
            ]
        },
        {
            "name": "Viennoiseries",
            "products": [
                {"name": "Croissant au Beurre AOP", "price": "1.50 €", "image_keyword": "butter croissant", "description": "Croissant au beurre", "stock": 42},
                {"name": "Pain au Chocolat", "price": "1.60 €", "image_keyword": "chocolate croissant", "description": "Pain au chocolat", "stock": 35},
                {"name": "Chausson aux Pommes", "price": "2.20 €", "image_keyword": "apple pastry", "description": "Chausson aux pommes", "stock": 28},
                {"name": "Brioche Nanterre", "price": "6.50 €", "image_keyword": "brioche bread", "description": "Brioche moelleuse", "stock": 12},
                {"name": "Pain aux Raisins", "price": "2.40 €", "image_keyword": "raisin pastry", "description": "Pain aux raisins", "stock": 33},
                {"name": "Palmier", "price": "1.80 €", "image_keyword": "palmier pastry", "description": "Palmier caramélisé", "stock": 18}
            ]
        },
        {
            "name": "Pâtisseries",
            "products": [
                {"name": "Éclair au Chocolat", "price": "3.90 €", "image_keyword": "chocolate eclair", "description": "Éclair au chocolat", "stock": 22},
                {"name": "Tarte aux Fruits Familiale", "price": "24.90 €", "image_keyword": "fruit tart", "description": "Tarte aux fruits", "stock": 5},
                {"name": "Millefeuille Vanille", "price": "4.50 €", "image_keyword": "millefeuille", "description": "Millefeuille vanille", "stock": 30},
                {"name": "Opéra", "price": "4.80 €", "image_keyword": "opera cake", "description": "Opéra cake", "stock": 15},
                {"name": "Paris-Brest", "price": "4.60 €", "image_keyword": "paris brest", "description": "Paris-Brest", "stock": 25},
                {"name": "Tarte au Citron Meringuée", "price": "4.40 €", "image_keyword": "lemon meringue pie", "description": "Tarte au citron meringuée", "stock": 28}
            ]
        },
        {
            "name": "Traiteur & Commandes",
            "products": [
                {"name": "Plateau Apéritif 12 Pers.", "price": "42.00 €", "image_keyword": "party platter", "description": "Plateau apéritif", "stock": 10},
                {"name": "Quiche Lorraine Familiale", "price": "18.50 €", "image_keyword": "quiche lorraine", "description": "Quiche lorraine", "stock": 15},
                {"name": "Sandwich Trio", "price": "12.90 €", "image_keyword": "sandwich platter", "description": "Sandwich trio", "stock": 25},
                {"name": "Tarte Fine aux Légumes", "price": "16.80 €", "image_keyword": "vegetable tart", "description": "Tarte fine légumes", "stock": 20},
                {"name": "Gâteau d'Anniversaire", "price": "29.00 €", "image_keyword": "birthday cake", "description": "Gâteau anniversaire", "stock": 8},
                {"name": "Coffret Petit-Déjeuner", "price": "19.90 €", "image_keyword": "breakfast box", "description": "Coffret petit-déjeuner", "stock": 35}
            ]
        }
    ]
}

cat_result = _normalize_catalog_only(mock_catalog_ai)
print('Catalog result type:', type(cat_result))
if isinstance(cat_result, list):
    print('Catalog length:', len(cat_result))
    for cat in cat_result:
        print('  Category:', cat.get('name'))
        print('  Products count:', len(cat.get('products', [])))
        for p in cat.get('products', []):
            print('   -', p.get('name'), '| keyword:', p.get('image_keyword'), '| stock:', p.get('stock'))
    # Verify 4 categories × 6 products = 24 total
    total_products = sum(len(cat.get('products', [])) for cat in cat_result)
    print('Total products:', total_products)
    print('Exactly 4 categories:', len(cat_result) == 4)
    print('Exactly 24 products:', total_products == 24)
elif cat_result is None:
    print('Catalog result is None')
else:
    print('Catalog result:', cat_result)