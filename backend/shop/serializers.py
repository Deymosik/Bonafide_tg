# backend/shop/serializers.py
from rest_framework import serializers
from .models import (
    InfoPanel, Category, Product, ProductImage, PromoBanner,
    ProductInfoCard, ColorGroup, ShopSettings, FaqItem, ShopImage
)


# --- Вспомогательные сериализаторы ---

class InfoPanelSerializer(serializers.ModelSerializer):
    class Meta:
        model = InfoPanel
        fields = ('name', 'color', 'text_color')

class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'subcategories')

    def get_subcategories(self, obj):
        serializer = CategorySerializer(obj.subcategories.all(), many=True)
        return serializer.data


# Сериализатор для дополнительных фото товара (в слайдере)
class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ('image_url', 'thumbnail_url')

    def get_image_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.image.url) if obj.image else None

    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.image_thumbnail.url) if hasattr(obj, 'image_thumbnail') and obj.image_thumbnail else None

# Сериализатор для инфо-карточек (фич)
class ProductInfoCardSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(method_name='get_thumbnail_url') # Используем thumbnail для отображения

    class Meta:
        model = ProductInfoCard
        fields = ('title', 'image_url', 'link_url')

    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.image_thumbnail.url) if hasattr(obj, 'image_thumbnail') and obj.image_thumbnail else None

# Сериализатор для промо-баннеров (сторис)
class PromoBannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(method_name='get_thumbnail_url') # Используем thumbnail

    class Meta:
        model = PromoBanner
        fields = ('id', 'image_url', 'link_url', 'text_content', 'text_color')

    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.image_thumbnail.url) if hasattr(obj, 'image_thumbnail') and obj.image_thumbnail else None

# Сериализатор для фото магазина на странице FAQ
class ShopImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = ShopImage
        fields = ('image_url', 'thumbnail_url', 'caption')

    def get_image_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.image.url) if obj.image else None

    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.image_thumbnail.url) if hasattr(obj, 'image_thumbnail') and obj.image_thumbnail else None


# --- Основные сериализаторы ---

# Сериализатор для превью в списке товаров
class ProductListSerializer(serializers.ModelSerializer):
    info_panels = InfoPanelSerializer(many=True, read_only=True)
    # Отдаем только превью для быстрой загрузки
    main_image_thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ('id', 'name', 'price', 'main_image_thumbnail_url', 'info_panels')

    def get_main_image_thumbnail_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.main_image_thumbnail.url) if hasattr(obj, 'main_image_thumbnail') and obj.main_image_thumbnail else None

# Сериализатор для цветовых вариаций (квадратики)
class ColorVariationSerializer(serializers.ModelSerializer):
    main_image_thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ('id', 'main_image_thumbnail_url')

    def get_main_image_thumbnail_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.main_image_thumbnail.url) if hasattr(obj, 'main_image_thumbnail') and obj.main_image_thumbnail else None

# Сериализатор для детальной страницы товара
class ProductDetailSerializer(serializers.ModelSerializer):
    info_panels = InfoPanelSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    info_cards = ProductInfoCardSerializer(many=True, read_only=True)
    related_products = ProductListSerializer(many=True, read_only=True)

    # Отдаем и оригинал, и превью для главной картинки
    main_image_url = serializers.SerializerMethodField()
    main_image_thumbnail_url = serializers.SerializerMethodField()

    audio_sample = serializers.SerializerMethodField()
    functionality = serializers.JSONField()
    characteristics = serializers.JSONField()
    color_variations = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'description', 'price', 'main_image_url', 'main_image_thumbnail_url',
            'images', 'audio_sample', 'info_panels', 'info_cards', 'functionality',
            'characteristics', 'related_products', 'color_variations'
        )

    def get_main_image_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.main_image.url) if obj.main_image else None

    def get_main_image_thumbnail_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.main_image_thumbnail.url) if hasattr(obj, 'main_image_thumbnail') and obj.main_image_thumbnail else None

    def get_audio_sample(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.audio_sample.url) if obj.audio_sample else None

    def get_color_variations(self, obj):
        if not obj.color_group:
            return []
        queryset = Product.objects.filter(color_group=obj.color_group).exclude(id=obj.id)
        return ColorVariationSerializer(queryset, many=True, context={'request': self.context.get('request')}).data

# Сериализатор для глобальных настроек
class ShopSettingsSerializer(serializers.ModelSerializer):
    images = ShopImageSerializer(many=True, read_only=True)
    search_lottie_url = serializers.SerializerMethodField()
    cart_lottie_url = serializers.SerializerMethodField()

    class Meta:
        model = ShopSettings
        fields = (
            'shop_name', 'manager_username', 'contact_phone', 'about_us_section',
            'delivery_section', 'warranty_section', 'images', 'free_shipping_threshold',
            'search_placeholder', 'search_initial_text', 'search_lottie_url', 'cart_lottie_url'
        )

    def get_search_lottie_url(self, obj):
        request = self.context.get('request')
        if obj.search_lottie_file and hasattr(obj.search_lottie_file, 'url'):
            return request.build_absolute_uri(obj.search_lottie_file.url)
        return None

    def get_cart_lottie_url(self, obj):
        request = self.context.get('request')
        if obj.cart_lottie_file and hasattr(obj.cart_lottie_file, 'url'):
            return request.build_absolute_uri(obj.cart_lottie_file.url)
        return None

# Сериализатор для FAQ
class FaqItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaqItem
        fields = ('id', 'question', 'answer')

class DealOfTheDaySerializer(serializers.ModelSerializer):
    # Берем поле с превью из ProductListSerializer
    main_image_thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        # Включаем все поля, которые нужны компоненту DealOfTheDay.js
        fields = (
            'id',
            'name',
            'price',
            'deal_price',
            'main_image_thumbnail_url',
            'deal_ends_at' # <-- САМОЕ ВАЖНОЕ: добавляем поле с датой
        )

    def get_main_image_thumbnail_url(self, obj):
        request = self.context.get('request')
        if hasattr(obj, 'main_image_thumbnail') and obj.main_image_thumbnail:
            return request.build_absolute_uri(obj.main_image_thumbnail.url)
        return None