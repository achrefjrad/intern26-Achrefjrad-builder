from django.urls import path
from .views import (
    ConfigView,
    GenerateView,
    GenerateHomepageView,
    GenerateCatalogView,
    ChatView,
    UploadImagesView,
    ProjectView,
    ProjectDetailView,
    OrderView,
)

urlpatterns = [
    path('config/', ConfigView.as_view(), name='config'),
    path('generate/', GenerateView.as_view(), name='generate'),
    path('generate-homepage/', GenerateHomepageView.as_view(), name='generate-homepage'),
    path('generate-catalog/', GenerateCatalogView.as_view(), name='generate-catalog'),
    path('chat/', ChatView.as_view(), name='chat'),
    path('upload-images/', UploadImagesView.as_view(), name='upload-images'),
    path('projects/', ProjectView.as_view(), name='projects'),
    path('projects/<str:project_name>/', ProjectDetailView.as_view(), name='project-detail'),
    path('orders/', OrderView.as_view(), name='orders'),
]
