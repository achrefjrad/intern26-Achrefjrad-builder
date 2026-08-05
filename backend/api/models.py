import uuid

from django.db import models


def default_section_id():
    return uuid.uuid4().hex


def default_hero_images():
    return []


def default_section_order():
    return ["hero", "columns", "overlay"]


def default_overlay_images():
    return []


def default_column_images():
    return []


class WebsiteConfig(models.Model):
    HERO_TYPES = [
        ('image', 'Image'),
        ('text', 'Text'),
    ]
    HERO_FONT_SIZES = [
        ('sm', 'Small'),
        ('md', 'Medium'),
        ('lg', 'Large'),
        ('xl', 'Extra Large'),
    ]
    HERO_FONT_FAMILIES = [
        ('sans-serif', 'Sans-Serif (Modern)'),
        ('serif', 'Serif (Classic)'),
        ('monospace', 'Monospace (Code)'),
        ('playfair', 'Playfair (Elegant)'),
    ]
    hero_type = models.CharField(max_length=10, choices=HERO_TYPES, default='image')
    hero_images = models.JSONField(default=default_hero_images, blank=True)
    hero_title = models.CharField(max_length=255, blank=True, default='')
    hero_subtitle = models.CharField(max_length=255, blank=True, default='')
    hero_text_color = models.CharField(max_length=20, default='#ffffff')
    hero_font_family = models.CharField(max_length=20, choices=HERO_FONT_FAMILIES, default='sans-serif')
    hero_font_size = models.CharField(max_length=10, choices=HERO_FONT_SIZES, default='xl')
    column_count = models.IntegerField(default=4)
    hero_first = models.BooleanField(default=True)
    section_order = models.JSONField(default=default_section_order, blank=True)
    original_prompt = models.TextField(blank=True, default='')


class Column(models.Model):
    CONTENT_TYPES = [
        ('both', 'Image and Text'),
        ('image_only', 'Image Only'),
        ('text_only', 'Text Only'),
        ('slider', 'Image Slider'),
    ]
    position = models.IntegerField(unique=True)
    content_type = models.CharField(max_length=10, choices=CONTENT_TYPES, default='both')
    image = models.ImageField(upload_to='columns/', blank=True, null=True)
    images = models.JSONField(default=default_column_images, blank=True)
    text = models.TextField(blank=True, default='')


class Section(models.Model):
    SECTION_TYPES = [
        ('hero', 'Hero Banner'),
        ('columns', 'Feature Columns'),
        ('overlay', 'Background Overlay'),
    ]
    id = models.CharField(max_length=64, primary_key=True, default=default_section_id)
    section_type = models.CharField(max_length=20, choices=SECTION_TYPES)
    data = models.JSONField(default=dict, blank=True)


class BackgroundOverlay(models.Model):
    FONT_SIZES = [
        ('sm', 'Small'),
        ('md', 'Medium'),
        ('lg', 'Large'),
        ('xl', 'Extra Large'),
    ]
    FONT_FAMILIES = [
        ('sans-serif', 'Sans-Serif (Modern)'),
        ('serif', 'Serif (Classic)'),
        ('monospace', 'Monospace (Code)'),
        ('playfair', 'Playfair (Elegant)'),
    ]
    config = models.OneToOneField(WebsiteConfig, on_delete=models.CASCADE, related_name='overlay')
    bg_image = models.ImageField(upload_to='overlay/', blank=True, null=True)
    overlay_images = models.JSONField(default=default_overlay_images, blank=True)
    title = models.CharField(max_length=255, blank=True, default='')
    subtitle = models.TextField(blank=True, default='')
    font_size = models.CharField(max_length=10, choices=FONT_SIZES, default='lg')
    text_color = models.CharField(max_length=20, default='#ffffff')
    font_family = models.CharField(max_length=20, choices=FONT_FAMILIES, default='sans-serif')