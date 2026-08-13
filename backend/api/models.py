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
        ('gallery', 'Photo Gallery'),
        ('testimonials', 'Testimonials'),
        ('stats', 'Stats & Metrics'),
        ('overlay', 'Background Overlay'),
        ('navbar', 'Navigation Bar'),
        ('footer', 'Footer'),
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


class Project(models.Model):
    """Projet nommé : contient le thème, toutes les sections (8 types) et le prompt d'origine."""
    name = models.CharField(max_length=255, unique=True)
    theme = models.JSONField(default=dict, blank=True)
    sections = models.JSONField(default=list, blank=True)  # Holds all 8 section types safely
    original_prompt = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Category(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    price = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    stock = models.IntegerField(default=0)
    image_url = models.URLField(max_length=1000, blank=True, null=True)

    def __str__(self):
        return self.name


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('shipped', 'Shipped'),
        ('cancelled', 'Cancelled'),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='orders')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=50)
    address = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.project.name}"


class OrderLine(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.quantity}x {self.product.name}"