from django.urls import path
from .views import ConfigView, GenerateView, ChatView, UploadImagesView, ProjectView, ProjectDetailView, OrderView

urlpatterns = [
    path('config/', ConfigView.as_view(), name='config'),
    path('generate/', GenerateView.as_view(), name='generate'),
    path('chat/', ChatView.as_view(), name='chat'),
    path('upload-images/', UploadImagesView.as_view(), name='upload-images'),
    path('projects/', ProjectView.as_view(), name='projects'),
    path('projects/<str:project_name>/', ProjectDetailView.as_view(), name='project-detail'),
    path('orders/', OrderView.as_view(), name='orders'),
]
