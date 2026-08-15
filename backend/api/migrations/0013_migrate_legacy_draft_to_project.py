from django.db import migrations


def migrate_draft_to_project(apps, schema_editor):
    WebsiteConfig = apps.get_model('api', 'WebsiteConfig')
    Section = apps.get_model('api', 'Section')
    Project = apps.get_model('api', 'Project')

    draft_project = Project.objects.filter(name='__draft__').first()
    if draft_project is not None:
        return

    cfg = WebsiteConfig.objects.first()
    if cfg is None:
        return

    section_map = {s.id: s for s in Section.objects.all()}
    sections = []
    order = cfg.section_order or []
    if isinstance(order, list):
        for item in order:
            if isinstance(item, dict) and item.get('id'):
                s = section_map.get(str(item['id']))
                if s:
                    sections.append({'id': s.id, 'type': s.section_type, 'data': s.data})
            elif isinstance(item, str):
                s = section_map.get(f"{item}_1") or section_map.get(item)
                if s:
                    sections.append({'id': s.id, 'type': s.section_type, 'data': s.data})

    if not sections:
        for s in Section.objects.all():
            sections.append({'id': s.id, 'type': s.section_type, 'data': s.data})

    Project.objects.create(
        name='__draft__',
        theme={},
        sections=sections,
        original_prompt=cfg.original_prompt or '',
    )


def reverse_migration(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_product_description_product_stock_order_orderline'),
    ]

    operations = [
        migrations.RunPython(migrate_draft_to_project, reverse_migration),
    ]
