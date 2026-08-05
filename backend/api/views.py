import json
import os

from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import WebsiteConfig, Column, BackgroundOverlay, Section
from .serializers import ConfigSerializer, ColumnSerializer, WebsiteConfigSerializer
from .ai_service import generate_config

VALID_SECTION_TYPES = {'hero', 'columns', 'overlay'}


def _normalize_section_order(section_order):
    """Accepte des objets {id, type} ou des chaînes simples ('hero', 'columns', 'overlay')."""
    if not isinstance(section_order, list):
        return None
    items = []
    for item in section_order:
        if isinstance(item, dict) and item.get('id') and item.get('type') in VALID_SECTION_TYPES:
            items.append({'id': str(item['id']), 'type': item['type']})
        elif isinstance(item, str) and item in VALID_SECTION_TYPES:
            items.append({'id': f'{item}_1', 'type': item})
        else:
            return None
    return items


def save_sections(config, sections, files=None):
    """Persiste une liste de sections [{id, type, data}] et met à jour section_order."""
    order = []
    for item in sections:
        if not isinstance(item, dict):
            continue
        section_type = item.get('type')
        data = item.get('data')
        if section_type not in VALID_SECTION_TYPES or not isinstance(data, dict):
            continue
        sid = str(item.get('id') or '')
        if not sid:
            sid = f'{section_type}_{len(order) + 1}'
        Section.objects.update_or_create(id=sid, defaults={'section_type': section_type, 'data': data})
        order.append({'id': sid, 'type': section_type})
    if order:
        config.section_order = order
        config.save(update_fields=['section_order'])

class GenerateView(APIView):
    def post(self, request):
        prompt = request.data.get('prompt', '')
        if not prompt or not isinstance(prompt, str):
            return Response(
                {'error': 'Le champ "prompt" est requis et doit être une chaîne de caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        config = generate_config(prompt)
        WebsiteConfig.objects.get_or_create(id=1)
        WebsiteConfig.objects.filter(id=1).update(original_prompt=prompt)
        return Response({**config, 'original_prompt': prompt}, status=status.HTTP_200_OK)

def build_legacy_view(config, sections):
    """Construit les champs hérités (hero_banner, columns, overlay) depuis les sections."""
    if not config:
        return {'hero_banner': None, 'columns': [], 'overlay': None}

    def first_data(section_type):
        for sec in sections:
            if sec['type'] == section_type:
                return sec['data']
        return None

    hero = first_data('hero') or {}
    cols = first_data('columns') or {}
    overlay = first_data('overlay') or {}

    columns_data = []
    for col in cols.get('columns') or []:
        columns_data.append({
            'id': col.get('position'),
            'position': col.get('position'),
            'content_type': col.get('content_type', 'both'),
            'image': col.get('image') or '',
            'images': col.get('images') or [],
            'text': col.get('text') or '',
        })

    hero_banner = {
        'id': config.id,
        'hero_type': hero.get('hero_type', 'image'),
        'hero_images': hero.get('hero_images') or [],
        'hero_title': hero.get('hero_title', ''),
        'hero_subtitle': hero.get('hero_subtitle', ''),
        'hero_text_color': hero.get('hero_text_color', '#ffffff'),
        'hero_font_family': hero.get('hero_font_family', 'sans-serif'),
        'hero_font_size': hero.get('hero_font_size', 'xl'),
        'column_count': cols.get('column_count', 4),
        'hero_first': True,
        'section_order': [{'id': s['id'], 'type': s['type']} for s in sections],
        'original_prompt': config.original_prompt or '',
        'overlay': {
            'id': config.id,
            'bg_image': (overlay.get('images') or [''])[0],
            'overlay_images': overlay.get('images') or [],
            'title': overlay.get('title', ''),
            'subtitle': overlay.get('subtitle', ''),
            'font_size': overlay.get('font_size', 'lg'),
            'text_color': overlay.get('text_color', '#ffffff'),
            'font_family': overlay.get('font_family', 'sans-serif'),
        },
    }
    return {'hero_banner': hero_banner, 'columns': columns_data, 'overlay': hero_banner['overlay']}


class ConfigView(APIView):
    def get(self, request):
        config = WebsiteConfig.objects.first()
        if config is None:
            return Response({'sections': [], 'hero_banner': None, 'columns': [], 'overlay': None})

        order = _normalize_section_order(config.section_order)
        sections = []
        if order:
            section_map = {s.id: s for s in Section.objects.all()}
            for item in order:
                sec = section_map.get(item['id'])
                if sec:
                    sections.append({'id': sec.id, 'type': sec.section_type, 'data': sec.data})
                else:
                    sections.append({'id': item['id'], 'type': item['type'], 'data': {}})
        else:
            all_sections = Section.objects.all()
            for sec in all_sections:
                sections.append({'id': sec.id, 'type': sec.section_type, 'data': sec.data})

        legacy = build_legacy_view(config, sections)
        return Response({'sections': sections, **legacy})

    def post(self, request):
        config, _ = WebsiteConfig.objects.get_or_create(id=1)

        if 'sections' in request.data:
            sections = request.data['sections']
            if isinstance(sections, str):
                sections = json.loads(sections)
            if isinstance(sections, list):
                save_sections(config, sections, request.FILES)
            if 'original_prompt' in request.data:
                config.original_prompt = request.data['original_prompt']
                config.save(update_fields=['original_prompt'])
            return self.get(request)

        # --- Chemin hérité (champs plats) ---
        if 'hero_type' in request.data:
            config.hero_type = request.data['hero_type']
        if 'hero_images' in request.data:
            hero_images = request.data['hero_images']
            if isinstance(hero_images, str):
                hero_images = json.loads(hero_images)
            if isinstance(hero_images, list):
                config.hero_images = hero_images[:3]
        if 'hero_image' in request.FILES:
            img = request.FILES['hero_image']
            images = list(config.hero_images or [])
            images.append(default_storage.save(os.path.join('hero', img.name), img))
            config.hero_images = images[:3]
        if 'hero_title' in request.data:
            config.hero_title = request.data['hero_title']
        if 'hero_subtitle' in request.data:
            config.hero_subtitle = request.data['hero_subtitle']
        if 'hero_text_color' in request.data:
            config.hero_text_color = request.data['hero_text_color']
        if 'hero_font_family' in request.data:
            config.hero_font_family = request.data['hero_font_family']
        if 'hero_font_size' in request.data:
            config.hero_font_size = request.data['hero_font_size']
        column_count = int(request.data.get('column_count', 4))
        config.column_count = column_count
        if 'hero_first' in request.data:
            config.hero_first = request.data['hero_first'] in ('true', 'True', '1', 'on')
        if 'section_order' in request.data:
            section_order = request.data['section_order']
            if isinstance(section_order, str):
                section_order = json.loads(section_order)
            if isinstance(section_order, list):
                config.section_order = section_order
        if 'original_prompt' in request.data:
            config.original_prompt = request.data['original_prompt']
        config.save()

        for i in range(1, column_count + 1):
            col, _ = Column.objects.get_or_create(position=i)
            content_type_key = f'column_{i}_content_type'
            img_key = f'column_{i}_image'
            text_key = f'column_{i}_text'
            images_key = f'column_{i}_images'
            if content_type_key in request.data:
                col.content_type = request.data[content_type_key]
            if img_key in request.FILES:
                col.image = request.FILES[img_key]
            if images_key in request.data:
                col_images = request.data[images_key]
                if isinstance(col_images, str):
                    col_images = json.loads(col_images)
                if isinstance(col_images, list):
                    col.images = col_images
            k = 0
            while f'column_{i}_image_{k}' in request.FILES:
                file_key = f'column_{i}_image_{k}'
                img = request.FILES[file_key]
                saved = default_storage.save(os.path.join('columns', str(i), img.name), img)
                col.images = list(col.images or []) + [saved]
                k += 1
            if text_key in request.data:
                col.text = request.data[text_key]
            col.save()

        existing_positions = set(range(1, column_count + 1))
        Column.objects.exclude(position__in=existing_positions).delete()

        overlay, _ = BackgroundOverlay.objects.get_or_create(config=config)
        if 'bg_image' in request.FILES:
            overlay.bg_image = request.FILES['bg_image']
        if 'overlay_images' in request.data:
            overlay_images = request.data['overlay_images']
            if isinstance(overlay_images, str):
                overlay_images = json.loads(overlay_images)
            if isinstance(overlay_images, list):
                overlay.overlay_images = overlay_images[:3]
        if 'overlay_title' in request.data:
            overlay.title = request.data['overlay_title']
        if 'overlay_subtitle' in request.data:
            overlay.subtitle = request.data['overlay_subtitle']
        if 'overlay_font_size' in request.data:
            overlay.font_size = request.data['overlay_font_size']
        if 'overlay_text_color' in request.data:
            overlay.text_color = request.data['overlay_text_color']
        if 'overlay_font_family' in request.data:
            overlay.font_family = request.data['overlay_font_family']
        overlay.save()

        return self.get(request)


class UploadImagesView(APIView):
    def post(self, request):
        result = {"hero_images": [], "columns": {}, "column_sliders": {}, "bg_image": None, "overlay_images": []}
        for i in range(3):
            key = f'hero_image_{i}'
            if key in request.FILES:
                img = request.FILES[key]
                result['hero_images'].append(default_storage.save(os.path.join('hero', img.name), img))
        for position in range(1, 5):
            key = f'column_{position}_image'
            if key in request.FILES:
                img = request.FILES[key]
                result['columns'][str(position)] = default_storage.save(os.path.join('columns', img.name), img)
            slider_paths = []
            k = 0
            while f'column_{position}_image_{k}' in request.FILES:
                file_key = f'column_{position}_image_{k}'
                img = request.FILES[file_key]
                slider_paths.append(default_storage.save(os.path.join('columns', str(position), img.name), img))
                k += 1
            if slider_paths:
                result['column_sliders'][str(position)] = slider_paths
        if 'overlay_image' in request.FILES:
            img = request.FILES['overlay_image']
            result['bg_image'] = default_storage.save(os.path.join('overlay', img.name), img)
        for i in range(3):
            key = f'overlay_image_{i}'
            if key in request.FILES:
                img = request.FILES[key]
                result['overlay_images'].append(default_storage.save(os.path.join('overlay', img.name), img))
        return Response(result, status=status.HTTP_200_OK)
