import json
import os

from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Project, Category, Product, Order, OrderLine
from .ai_service import (
    generate_config,
    generate_homepage_config,
    _normalize_homepage_config,
    generate_catalog_config,
    _normalize_catalog,
    detect_category,
    get_cached_generation,
    set_cached_generation,
)

DEFAULT_DRAFT_PROJECT_NAME = "__draft__"


def _save_catalog_to_project(project, catalog):
    if not isinstance(catalog, list):
        return
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


class GenerateHomepageView(APIView):
    def post(self, request):
        prompt = request.data.get('prompt', '')
        if not prompt or not isinstance(prompt, str):
            return Response(
                {'error': 'Le champ "prompt" est requis et doit être une chaîne de caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check prompt-based persistent cache first (handles any prompt, not just known categories)
        cached = get_cached_generation(prompt)
        if cached and cached.get('sections'):
            draft_project, _ = Project.objects.get_or_create(
                name=DEFAULT_DRAFT_PROJECT_NAME,
                defaults={'theme': {}, 'sections': [], 'original_prompt': ''},
            )
            draft_project.original_prompt = prompt
            draft_project.theme = cached.get("theme", {})
            draft_project.sections = cached.get("sections", [])
            draft_project.save()

            result = {
                'theme': cached.get("theme", {}),
                'sections': cached.get("sections", []),
                'original_prompt': prompt,
                'category': detect_category(prompt),
            }
            return Response(result, status=status.HTTP_200_OK)

        homepage = generate_homepage_config(prompt)
        if isinstance(homepage, dict) and 'error' in homepage:
            return Response(homepage, status=status.HTTP_502_BAD_GATEWAY)

        draft_project, _ = Project.objects.get_or_create(
            name=DEFAULT_DRAFT_PROJECT_NAME,
            defaults={'theme': {}, 'sections': [], 'original_prompt': ''},
        )
        draft_project.original_prompt = prompt
        draft_project.theme = homepage.get("theme", {})
        draft_project.sections = homepage.get("sections", [])
        draft_project.save()

        result = {
            'theme': homepage.get("theme", {}),
            'sections': homepage.get("sections", []),
            'original_prompt': prompt,
            'category': detect_category(prompt),
        }
        return Response(result, status=status.HTTP_200_OK)


class GenerateCatalogView(APIView):
    def post(self, request):
        prompt = request.data.get('prompt', '')
        if not prompt or not isinstance(prompt, str):
            return Response(
                {'error': 'Le champ "prompt" est requis et doit être une chaîne de caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        homepage_context = request.data.get('homepage_context', '')
        brand_name = request.data.get('brand_name', '')
        theme = request.data.get('theme', {})

        if not homepage_context:
            if brand_name:
                homepage_context += f"brand: {brand_name}. "
            if theme and isinstance(theme, dict):
                primary_color = theme.get("primary_color", "")
                if primary_color:
                    homepage_context += "theme colors supplied. "

        # Check prompt-based persistent cache first (any prompt, not just known categories)
        cached = get_cached_generation(prompt)
        if cached and cached.get('catalog'):
            catalog_list = cached.get('catalog')
            draft_project, _ = Project.objects.get_or_create(
                name=DEFAULT_DRAFT_PROJECT_NAME,
                defaults={'theme': {}, 'sections': [], 'original_prompt': ''},
            )
            _save_catalog_to_project(draft_project, catalog_list)
            return Response({'catalog': catalog_list, 'original_prompt': prompt}, status=status.HTTP_200_OK)

        catalog = generate_catalog_config(prompt, homepage_context)
        if isinstance(catalog, dict) and 'error' in catalog:
            from api.fallbacks import _fallback_catalog
            catalog = _fallback_catalog(prompt)

        catalog_list = catalog if isinstance(catalog, list) else []

        draft_project, _ = Project.objects.get_or_create(
            name=DEFAULT_DRAFT_PROJECT_NAME,
            defaults={'theme': {}, 'sections': [], 'original_prompt': ''},
        )
        _save_catalog_to_project(draft_project, catalog_list)

        # Persist complete template (sections must already be in draft from Stage 1)
        if draft_project.sections and catalog_list:
            full_result = {
                'theme': draft_project.theme or {},
                'sections': draft_project.sections or [],
                'catalog': catalog_list,
                'original_prompt': prompt,
            }
            set_cached_generation(prompt, full_result)

        return Response({'catalog': catalog_list, 'original_prompt': prompt}, status=status.HTTP_200_OK)


class GenerateView(APIView):
    def post(self, request):
        prompt = request.data.get('prompt', '')
        if not prompt or not isinstance(prompt, str):
            return Response(
                {'error': 'Le champ "prompt" est requis et doit être une chaîne de caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check prompt-based persistent cache before running LLM calls
        cached = get_cached_generation(prompt)
        if cached:
            draft_project, _ = Project.objects.get_or_create(
                name=DEFAULT_DRAFT_PROJECT_NAME,
                defaults={'theme': {}, 'sections': [], 'original_prompt': ''},
            )
            draft_project.original_prompt = prompt
            draft_project.theme = cached.get("theme", {})
            draft_project.sections = cached.get("sections", [])
            draft_project.save()
            _save_catalog_to_project(draft_project, cached.get("catalog", []))

            result = {
                'theme': cached.get("theme", {}),
                'sections': cached.get("sections", []),
                'catalog': cached.get("catalog", []),
                'original_prompt': prompt,
            }
            return Response(result, status=status.HTTP_200_OK)

        # Call 1: Generate homepage (theme + sections, no catalogue)
        homepage = generate_homepage_config(prompt)
        if isinstance(homepage, dict) and 'error' in homepage:
            return Response(homepage, status=status.HTTP_502_BAD_GATEWAY)

        # Extract minimal context from homepage for catalog generation
        homepage_context = ""
        if homepage and isinstance(homepage, dict):
            theme = homepage.get("theme", {})
            sections = homepage.get("sections", [])
            # Extract brand name from navbar (first section if type is navbar).
            brand_name = ""
            if sections and len(sections) > 0:
                first_sec = sections[0]
                if first_sec.get("type") == "navbar":
                    brand_name = first_sec.get("brand_name", "")
            if brand_name:
                homepage_context = f"brand: {brand_name}. "
            if theme:
                primary_color = theme.get("primary_color", "")
                if primary_color:
                    homepage_context += f"theme colors supplied. "

        # Call 2: Generate catalog based on prompt + homepage context
        catalog = generate_catalog_config(prompt, homepage_context)
        if isinstance(catalog, dict) and 'error' in catalog:
            from api.fallbacks import _fallback_catalog
            catalog = _fallback_catalog(prompt)

        # Save draft project
        draft_project, _ = Project.objects.get_or_create(
            name=DEFAULT_DRAFT_PROJECT_NAME,
            defaults={'theme': {}, 'sections': [], 'original_prompt': ''},
        )
        draft_project.original_prompt = prompt
        draft_project.theme = homepage.get("theme", {})
        draft_project.sections = homepage.get("sections", [])
        draft_project.save()
        _save_catalog_to_project(draft_project, catalog if isinstance(catalog, list) else [])

        # Combine and persist complete generated website (prompt-keyed)
        result = {
            'theme': homepage.get("theme", {}),
            'sections': homepage.get("sections", []),
            'catalog': catalog if isinstance(catalog, list) else [],
            'original_prompt': prompt,
        }
        if result['sections'] and result['catalog']:
            set_cached_generation(prompt, result)

        return Response(result, status=status.HTTP_200_OK)


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


class ConfigView(APIView):
    def get(self, request):
        project, _ = Project.objects.get_or_create(
            name=DEFAULT_DRAFT_PROJECT_NAME,
            defaults={'theme': {}, 'sections': [], 'original_prompt': ''},
        )
        sections = project.sections if isinstance(project.sections, list) else []
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
            product_name = item.get('product_name')
            try:
                product_id = int(product_id)
            except (ValueError, TypeError):
                product_id = None
            try:
                quantity = int(item.get('quantity', 1) or 1)
            except (ValueError, TypeError):
                quantity = 1
            if quantity < 1:
                quantity = 1
            parsed_items.append({
                'product_id': product_id,
                'product_name': str(product_name or '').strip() or None,
                'quantity': quantity,
            })
        if not parsed_items:
            return Response({'error': 'No valid items provided'}, status=status.HTTP_400_BAD_REQUEST)

        product_ids = [i['product_id'] for i in parsed_items if i['product_id'] is not None]
        products = Product.objects.select_related('category__project').filter(id__in=product_ids)
        product_map = {p.id: p for p in products}

        for item in parsed_items:
            if item['product_id'] is not None:
                product = product_map.get(item['product_id'])
                if product is None:
                    return Response(
                        {'error': f"Product {item['product_id']} not found in project '{project_name}'"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                name = item.get('product_name')
                if not name:
                    return Response(
                        {'error': 'Each item must provide a product_id or a product_name'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                matches = list(Product.objects.select_related('category__project').filter(
                    category__project_id=project.id,
                    name=name,
                ))
                if not matches:
                    return Response(
                        {'error': f"Product '{name}' not found in project '{project_name}'"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if len(matches) > 1:
                    return Response(
                        {'error': f"Product name '{name}' is ambiguous in project '{project_name}'"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                product = matches[0]
                item['product_id'] = product.id
                product_map[product.id] = product
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
