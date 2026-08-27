import os
os.chdir('C:/Users/nitro/website-builder')
import sys
sys.path.insert(0, 'backend')
sys.path.insert(0, '.')

os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
import django
django.setup()

from api.services.site_generation.generator import generate_homepage_config, generate_catalog_config

# Test with bakery prompt
print('=== Test 1: Bakery prompt ===')
prompt1 = 'Je veux cr er un site pour une boulangerie artisanale'
homepage1 = generate_homepage_config(prompt1)
print('Homepage type:', type(homepage1))
if isinstance(homepage1, dict):
    print('Homepage keys:', list(homepage1.keys()))
    print('Theme:', homepage1.get('theme'))
    print('Sections count:', len(homepage1.get('sections', [])))
    for s in homepage1.get('sections', []):
        print(' -', s.get('type'), ': id=' + str(s.get('id')), ', layout=' + str(s.get('layout_style')))
    
    # Check no catalog in homepage
    has_catalog = 'catalog' in homepage1
    print('Has catalog key:', has_catalog)
    
    # Generate catalog
    print()
    print('Generating catalog...')
    catalog1 = generate_catalog_config(prompt1, '')
    print('Catalog type:', type(catalog1))
    if isinstance(catalog1, list):
        print('Catalog length:', len(catalog1))
        for cat in catalog1:
            print('  Category:', cat.get('name'))
            print('  Products count:', len(cat.get('products', [])))
    elif isinstance(catalog1, dict) and 'error' in catalog1:
        print('Catalog error:', catalog1['error'])