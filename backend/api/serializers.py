from rest_framework import serializers
from .models import WebsiteConfig, Column, BackgroundOverlay


class BackgroundOverlaySerializer(serializers.ModelSerializer):
    class Meta:
        model = BackgroundOverlay
        fields = ['id', 'bg_image', 'overlay_images', 'title', 'subtitle', 'font_size', 'text_color', 'font_family']


class WebsiteConfigSerializer(serializers.ModelSerializer):
    hero_images = serializers.ListField(
        child=serializers.CharField(allow_blank=True),
        required=False,
        allow_empty=True,
    )
    overlay = BackgroundOverlaySerializer(required=False)

    class Meta:
        model = WebsiteConfig
        fields = [
            'id', 'hero_type', 'hero_images', 'hero_title', 'hero_subtitle',
            'hero_text_color', 'hero_font_family', 'hero_font_size',
            'column_count', 'hero_first', 'section_order', 'original_prompt', 'overlay',
        ]

    def validate_hero_images(self, value):
        if value is None:
            return value
        if len(value) > 3:
            raise serializers.ValidationError("hero_images cannot contain more than 3 images.")
        return value


class ColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = Column
        fields = ['id', 'position', 'content_type', 'image', 'images', 'text']


class ConfigSerializer(serializers.Serializer):
    hero_banner = WebsiteConfigSerializer()
    columns = ColumnSerializer(many=True)