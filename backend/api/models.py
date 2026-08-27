import uuid
from django.db import models


# Default functions preserved for historical migration deserialization compatibility
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


class GeneratedSiteCache(models.Model):
    """Persistent reusable website template keyed by normalized user prompt.

    prompt_key  — normalized (lowercase, no accents, collapsed whitespace) version of the
                  original prompt; used as the unique lookup key.
    category    — optional detected business category (e.g. 'coffee_shop', 'bakery').
                  Stored as metadata only; NOT used as a lookup key.
    """
    prompt_key = models.CharField(max_length=512, unique=True, db_index=True)
    category = models.CharField(max_length=100, blank=True, default='', db_index=True)
    theme = models.JSONField(default=dict, blank=True)
    sections = models.JSONField(default=list, blank=True)
    catalog = models.JSONField(default=list, blank=True)
    original_prompt = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        label = self.category or self.prompt_key[:60]
        return f"Template [{label}]"

