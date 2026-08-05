import json

from django.db import migrations, models
from api.models import default_hero_images, default_section_order


def convert_hero_images(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('SELECT id, hero_images FROM api_websiteconfig')
        for row_id, value in cursor.fetchall():
            cursor.execute(
                'UPDATE api_websiteconfig SET hero_images = %s WHERE id = %s',
                [json.dumps([value]) if value else json.dumps([]), row_id],
            )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_herobanner_hero_first'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='herobanner',
            new_name='websiteconfig',
        ),
        migrations.CreateModel(
            name='BackgroundOverlay',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bg_image', models.ImageField(blank=True, null=True, upload_to='overlay/')),
                ('title', models.CharField(blank=True, default='', max_length=255)),
                ('subtitle', models.TextField(blank=True, default='')),
                ('config', models.OneToOneField(on_delete=models.CASCADE, related_name='overlay', to='api.websiteconfig')),
            ],
        ),
        migrations.RenameField(
            model_name='websiteconfig',
            old_name='image',
            new_name='hero_images',
        ),
        migrations.RunPython(convert_hero_images, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='websiteconfig',
            name='hero_images',
            field=models.JSONField(blank=True, default=default_hero_images),
        ),
        migrations.AddField(
            model_name='websiteconfig',
            name='section_order',
            field=models.JSONField(blank=True, default=default_section_order),
        ),
    ]