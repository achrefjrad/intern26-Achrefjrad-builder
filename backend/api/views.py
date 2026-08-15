import json
import os

from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import WebsiteConfig, Column, BackgroundOverlay, Section, Project, Category, Product, Order, OrderLine
from .ai_service import generate_config, handle_chat_message

VALID_SECTION_TYPES = {'hero', 'columns', 'gallery', 'testimonials', 'stats', 'overlay', 'navbar', 'footer'}
DEFAULT_DRAFT_PROJECT_NAME = "__draft__"


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


def save_sections(config, sections):
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

        # Update the modern draft Project
        draft_project, _ = Project.objects.get_or_create(
            name=DEFAULT_DRAFT_PROJECT_NAME,
            defaults={'theme': {}, 'sections': [], 'original_prompt': ''},
        )
        draft_project.original_prompt = prompt
        draft_project.save(update_fields=['original_prompt'])

        # Transitional legacy mirror (until Stage 2 model removal)
        try:
            WebsiteConfig.objects.get_or_create(id=1)
            WebsiteConfig.objects.filter(id=1).update(original_prompt=prompt)
        except Exception:
            pass

        return Response({**config, 'original_prompt': prompt}, status=status.HTTP_200_OK)


class ChatView(APIView):
    def post(self, request):
        project_name = str(request.data.get('project_name', '') or '').strip()
        catalog = request.data.get('catalog')
        message_history = request.data.get('message_history', [])
        user_message = str(request.data.get('user_message', '') or '').strip()
        order_state = request.data.get('order_state', {})
        if not user_message:
            return Response(
                {'error': 'user_message is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = handle_chat_message(project_name, catalog, message_history, user_message, order_state)
        except Exception as e:
            return Response(
                {'error': f'Ollama unavailable ({type(e).__name__}): {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(result, status=status.HTTP_200_OK)


def build_legacy_view(project_or_config, sections):
    """Construit les champs hérités (hero_banner, columns, overlay) depuis les sections."""
    if not project_or_config:
        return {'hero_banner': None, 'columns': [], 'overlay': None}

    def first_data(section_type):
        for sec in sections:
            if isinstance(sec, dict) and sec.get('type') == section_type:
                return sec.get('data') or {}
        return {}

    hero = first_data('hero')
    cols = first_data('columns')
    overlay = first_data('overlay')

    columns_data = []
    for col in cols.get('columns') or []:
        if isinstance(col, dict):
            columns_data.append({
                'id': col.get('position'),
                'position': col.get('position'),
                'content_type': col.get('content_type', 'both'),
                'image': col.get('image') or '',
                'images': col.get('images') or [],
                'text': col.get('text') or '',
            })

    prompt = getattr(project_or_config, 'original_prompt', '') or ''
    project_id = getattr(project_or_config, 'id', 1)

    hero_banner = {
        'id': project_id,
        'hero_type': hero.get('hero_type', 'image'),
        'hero_images': hero.get('hero_images') or [],
        'hero_title': hero.get('hero_title', ''),
        'hero_subtitle': hero.get('hero_subtitle', ''),
        'hero_text_color': hero.get('hero_text_color', '#ffffff'),
        'hero_font_family': hero.get('hero_font_family', 'sans-serif'),
        'hero_font_size': hero.get('hero_font_size', 'xl'),
        'column_count': cols.get('column_count', 4),
        'hero_first': True,
        'section_order': [{'id': s['id'], 'type': s['type']} for s in sections if isinstance(s, dict) and 'id' in s and 'type' in s],
        'original_prompt': prompt,
        'overlay': {
            'id': project_id,
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
        project, _ = Project.objects.get_or_create(
            name=DEFAULT_DRAFT_PROJECT_NAME,
            defaults={'theme': {}, 'sections': [], 'original_prompt': ''},
        )
        sections = project.sections if isinstance(project.sections, list) else []
        legacy = build_legacy_view(project, sections)
        return Response({
            'id': project.id,
            'name': project.name,
            'theme': project.theme or {},
            'sections': sections,
            'original_prompt': project.original_prompt or '',
            'catalog': [
                {
                    'id': cat.id,
                    'name': cat.name,
                    'products': _project_products(cat),
                }
                for cat in project.categories.all()
            ],
            **legacy,
        })

    def post(self, request):
        project, _ = Project.objects.get_or_create(
            name=DEFAULT_DRAFT_PROJECT_NAME,
            defaults={'theme': {}, 'sections': [], 'original_prompt': ''},
        )

        if 'sections' in request.data:
            sections = request.data['sections']
            if isinstance(sections, str):
                try:
                    sections = json.loads(sections)
                except Exception:
                    sections = []
            if isinstance(sections, list):
                project.sections = sections

        if 'theme' in request.data:
            theme = request.data['theme']
            if isinstance(theme, str):
                try:
                    theme = json.loads(theme)
                except Exception:
                    theme = {}
            if isinstance(theme, dict):
                project.theme = theme

        if 'original_prompt' in request.data:
            project.original_prompt = str(request.data['original_prompt'] or '')

        if 'catalog' in request.data:
            catalog = request.data['catalog']
            if isinstance(catalog, str):
                try:
                    catalog = json.loads(catalog)
                except Exception:
                    catalog = None
            if isinstance(catalog, list):
                project.categories.all().delete()
                for cat in catalog:
                    if not isinstance(cat, dict):
                        continue
                    cat_name = str(cat.get('name', '') or '').strip()
                    if not cat_name:
                        continue
                    category = Category.objects.create(project=project, name=cat_name)
                    products = cat.get('products')
                    if isinstance(products, list):
                        for prod in products:
                            if not isinstance(prod, dict):
                                continue
                            prod_name = str(prod.get('name', '') or '').strip()
                            if not prod_name:
                                continue
                            try:
                                stock = int(prod.get('stock', 0) or 0)
                            except (ValueError, TypeError):
                                stock = 0
                            Product.objects.create(
                                category=category,
                                name=prod_name,
                                price=str(prod.get('price', '') or ''),
                                description=str(prod.get('description', '') or '') or None,
                                stock=stock,
                                image_url=str(prod.get('image_url', '') or '') or None,
                            )

        project.save()

        # Transitional legacy mirror (until Stage 2 model removal)
        try:
            config, _ = WebsiteConfig.objects.get_or_create(id=1)
            if isinstance(project.sections, list) and project.sections:
                save_sections(config, project.sections)
            if project.original_prompt:
                config.original_prompt = project.original_prompt
                config.save(update_fields=['original_prompt'])
        except Exception:
            pass

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


def _project_products(category):
    return [
        {
            'id': p.id,
            'name': p.name,
            'price': p.price,
            'description': p.description,
            'stock': p.stock,
            'image_url': p.image_url,
        }
        for p in category.products.all()
    ]


def _serialize_project(project):
    """Sérialise un projet complet : theme, sections (8 types), categories et produits."""
    return {
        'id': project.id,
        'name': project.name,
        'theme': project.theme,
        'sections': project.sections,
        'catalog': [
            {
                'id': cat.id,
                'name': cat.name,
                'products': _project_products(cat),
            }
            for cat in project.categories.all()
        ],
        'original_prompt': project.original_prompt,
        'created_at': project.created_at.isoformat(),
        'updated_at': project.updated_at.isoformat(),
    }


class ProjectView(APIView):
    def get(self, request):
        name = (request.query_params.get('name') or '').strip()
        project_id = (request.query_params.get('id') or '').strip()
        if name or project_id:
            try:
                if name:
                    project = Project.objects.get(name=name)
                else:
                    project = Project.objects.get(id=project_id)
            except (Project.DoesNotExist, ValueError):
                return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
            return Response(_serialize_project(project), status=status.HTTP_200_OK)

        projects = Project.objects.exclude(name=DEFAULT_DRAFT_PROJECT_NAME).order_by('-updated_at')
        return Response([
            {
                'id': p.id,
                'name': p.name,
                'sections_count': len(p.sections) if isinstance(p.sections, list) else 0,
                'categories_count': p.categories.count(),
                'updated_at': p.updated_at.isoformat(),
            }
            for p in projects
        ], status=status.HTTP_200_OK)

    def post(self, request):
        project_name = str(request.data.get('project_name', '') or '').strip()
        if not project_name:
            return Response({'error': 'Project name is required'}, status=status.HTTP_400_BAD_REQUEST)

        theme = request.data.get('theme') if isinstance(request.data.get('theme'), dict) else {}
        sections = request.data.get('sections') if isinstance(request.data.get('sections'), list) else []
        catalog = request.data.get('catalog') if isinstance(request.data.get('catalog'), list) else []
        original_prompt = str(request.data.get('original_prompt', '') or '')

        project, created = Project.objects.update_or_create(
            name=project_name,
            defaults={'theme': theme, 'sections': sections, 'original_prompt': original_prompt},
        )

        project.categories.all().delete()
        if isinstance(catalog, list):
            for cat in catalog:
                if not isinstance(cat, dict):
                    continue
                cat_name = str(cat.get('name', '') or '').strip()
                if not cat_name:
                    continue
                category = Category.objects.create(project=project, name=cat_name)
                products = cat.get('products')
                if isinstance(products, list):
                    for prod in products:
                        if not isinstance(prod, dict):
                            continue
                        prod_name = str(prod.get('name', '') or '').strip()
                        if not prod_name:
                            continue
                        try:
                            stock = int(prod.get('stock', 0) or 0)
                        except (ValueError, TypeError):
                            stock = 0
                        Product.objects.create(
                            category=category,
                            name=prod_name,
                            price=str(prod.get('price', '') or ''),
                            description=str(prod.get('description', '') or '') or None,
                            stock=stock,
                            image_url=str(prod.get('image_url', '') or '') or None,
                        )

        return Response(
            {'id': project.id, 'name': project.name, 'created': created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ProjectDetailView(APIView):
    def _get_project(self, project_name):
        try:
            return Project.objects.get(name=project_name)
        except (Project.DoesNotExist, ValueError):
            return None

    def get(self, request, project_name):
        project = self._get_project(project_name)
        if project is None:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize_project(project), status=status.HTTP_200_OK)

    def delete(self, request, project_name):
        project = self._get_project(project_name)
        if project is None:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        project.categories.all().delete()
        project.delete()
        return Response({'success': True}, status=status.HTTP_200_OK)


class OrderView(APIView):
    def post(self, request):
        project_name = str(request.data.get('project_name', '') or '').strip()
        if not project_name:
            return Response({'error': 'project_name is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            project = Project.objects.get(name=project_name)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        name = str(request.data.get('name', '') or '').strip()
        first_name = str(request.data.get('first_name', '') or '').strip()
        last_name = str(request.data.get('last_name', '') or '').strip()
        email = str(request.data.get('email', '') or '').strip()
        phone = str(request.data.get('phone', '') or '').strip()
        address = str(request.data.get('address', '') or '').strip()
        if not first_name and not last_name and name:
            parts = name.split()
            if parts:
                first_name = parts[0]
                last_name = ' '.join(parts[1:]) if len(parts) > 1 else parts[0]
        if not first_name or not last_name or not email or not address:
            return Response(
                {'error': 'name (prénom et nom), email and address are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = request.data.get('items')
        if not isinstance(items, list) or not items:
            return Response({'error': 'items must be a non-empty list'}, status=status.HTTP_400_BAD_REQUEST)

        parsed_items = []
        for item in items:
            if not isinstance(item, dict):
                continue
            product_id = item.get('product_id')
            try:
                product_id = int(product_id)
            except (ValueError, TypeError):
                continue
            try:
                quantity = int(item.get('quantity', 1) or 1)
            except (ValueError, TypeError):
                quantity = 1
            if quantity < 1:
                quantity = 1
            parsed_items.append({'product_id': product_id, 'quantity': quantity})
        if not parsed_items:
            return Response({'error': 'No valid items provided'}, status=status.HTTP_400_BAD_REQUEST)

        product_ids = [i['product_id'] for i in parsed_items]
        products = Product.objects.select_related('category__project').filter(id__in=product_ids)
        product_map = {p.id: p for p in products}

        for item in parsed_items:
            product = product_map.get(item['product_id'])
            if product is None:
                return Response(
                    {'error': f"Product {item['product_id']} not found in project '{project_name}'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if product.category.project_id != project.id:
                return Response(
                    {'error': f"Product {product.name} does not belong to project '{project_name}'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if product.stock < item['quantity']:
                return Response(
                    {'error': f"Insufficient stock for '{product.name}' (available: {product.stock})"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        order = Order.objects.create(
            project=project,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            address=address,
            status='pending',
        )
        for item in parsed_items:
            product = product_map[item['product_id']]
            OrderLine.objects.create(order=order, product=product, quantity=item['quantity'])
            product.stock -= item['quantity']
            product.save(update_fields=['stock'])

        return Response(
            {'success': True, 'order_id': order.id, 'message': 'Order created successfully.'},
            status=status.HTTP_201_CREATED,
        )
