from django.contrib import admin
from .models import Project, Category, Product, Order, OrderLine

admin.site.register(Project)
admin.site.register(Category)
admin.site.register(Product)
admin.site.register(Order)
admin.site.register(OrderLine)

