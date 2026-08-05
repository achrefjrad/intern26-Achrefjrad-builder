from django.urls import path
from .views import ConfigView, GenerateView, UploadImagesView

urlpatterns = [
    path('config/', ConfigView.as_view(), name='config'),
    path('generate/', GenerateView.as_view(), name='generate'),
    path('upload-images/', UploadImagesView.as_view(), name='upload-images'),
]
