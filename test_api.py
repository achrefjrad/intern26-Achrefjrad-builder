import os
os.chdir('C:/Users/nitro/website-builder')
import sys
sys.path.insert(0, 'backend')
sys.path.insert(0, '.')

os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
import django
django.setup()

from django.test import Client
from django.test.utils import setup_test_environment
setup_test_environment()

client = Client()

# Test the generate endpoint
print('=== Test Generate API with bakery prompt ===')
prompt = 'Je veux créer un site pour une boulangerie artisanale'
response = client.post(
    '/api/generate/',
    {'prompt': prompt},
    content_type='application/json'
)
print('Status code:', response.status_code)
print('Response:', response.content.decode('utf-8')[:500] if response.content else 'Empty')

print()
print('=== Test Generate API with animal store prompt ===')
prompt2 = 'Je veux un site pour une animalerie avec chiens et chats'
response2 = client.post(
    '/api/generate/',
    {'prompt': prompt2},
    content_type='application/json'
)
print('Status code:', response2.status_code)
if response2.content:
    data2 = response2.content.decode('utf-8')
    print('Response:', data2[:500])
    # Parse and check
    import json
    try:
        parsed2 = json.loads(data2)
        print('Theme:', parsed2.get('theme'))
        print('Sections count:', len(parsed2.get('sections', [])))
        print('Catalog count:', len(parsed2.get('catalog', [])))
        print('Has catalog key in sections theme:', 'catalog' in parsed2)
        
        # Check sections types
        section_types = [s.get('type') for s in parsed2.get('sections', [])]
        print('Section types:', section_types)
        
        # Verify no catalog in first call's data
        print('Catalog in response:', 'catalog' in parsed2)
        if 'catalog' in parsed2:
            print('Catalog items:', len(parsed2['catalog']))
    except json.JSONDecodeError as e:
        print('JSON decode error:', e)
else:
    print('No response content')