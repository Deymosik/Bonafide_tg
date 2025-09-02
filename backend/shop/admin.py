# backend/shop/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import InfoPanel, Category, Product, ProductImage, PromoBanner, ProductInfoCard, DiscountRule, ColorGroup, ShopSettings, FaqItem, ShopImage

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    verbose_name = "Дополнительное фото"
    verbose_name_plural = "Дополнительные фото"

class ProductInfoCardInline(admin.TabularInline):
    model = ProductInfoCard
    extra = 0
    verbose_name = "Инфо-карточка (фича)"
    verbose_name_plural = "Инфо-карточки (фичи)"
    fields = ('image', 'title', 'link_url')

# 2. Создайте класс Inline для изображений
class ShopImageInline(admin.TabularInline):
    model = ShopImage
    extra = 1 # Показываем одну пустую форму для загрузки
    verbose_name = "Фотография для страницы 'Информация'"
    verbose_name_plural = "Фотографии для страницы 'Информация'"
    fields = ('image', 'caption', 'order')

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'regular_price', 'is_active', 'display_deal_status')
    list_filter = ('category', 'is_active', 'info_panels', 'color_group')
    search_fields = ('name', 'description')
    inlines = [ProductImageInline, ProductInfoCardInline]
    list_editable = ('is_active',)


    # --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
    # Мы объединяем две последние секции в одну и убираем дубликат 'info_panels'.
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'color_group', 'category', 'regular_price', 'description', 'is_active')
        }),
        # --- НОВАЯ СЕКЦИЯ ДЛЯ АКЦИИ ---
        ("Акция 'Товар дня'", {
            'classes': ('collapse',), # Делаем секцию сворачиваемой
            'fields': ('deal_ends_at', 'deal_price')
        }),
        ('Медиафайлы', {
            'fields': ('main_image', 'audio_sample')
        }),
        ('Характеристики и Функционал', {
            'fields': ('functionality', 'characteristics')
        }),
        # Новая, объединенная и исправленная секция
        ('Связи и опции', {
            'fields': ('related_products', 'info_panels')
        }),
    )

    filter_horizontal = ('related_products', 'info_panels',)

    # 3. ИЗМЕНЕНИЕ: Новый метод для красивого отображения статуса в списке
    @admin.display(description='Товар дня?', boolean=True)
    def display_deal_status(self, obj):
        return obj.is_deal_of_the_day

    actions = ['make_active', 'make_inactive']
    def make_active(self, request, queryset):
        queryset.update(is_active=True)
    make_active.short_description = "Сделать выделенные товары активными"

    def make_inactive(self, request, queryset):
        queryset.update(is_active=False)
    make_inactive.short_description = "Сделать выделенные товары неактивными"


# --- Остальные классы вашей админ-панели остаются без изменений ---

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('__str__',)
    search_fields = ('name',)

@admin.register(ColorGroup)
class ColorGroupAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(InfoPanel)
class InfoPanelAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'text_color')

# --- ЗАМЕНЯЕМ АДМИНКУ ДЛЯ ПРОМО-БАННЕРОВ ---
@admin.register(PromoBanner)
class PromoBannerAdmin(admin.ModelAdmin):
    list_display = ('title', 'order', 'is_active', 'display_image')
    list_editable = ('order', 'is_active')
    search_fields = ('title',)

    # Добавляем новые поля в форму редактирования
    fieldsets = (
        (None, {
            'fields': ('title', 'is_active', 'order')
        }),
        ('Содержимое баннера', {
            'fields': ('image', 'link_url')
        }),
        ('Текст поверх изображения (опционально)', {
            'fields': ('text_content', 'text_color')
        }),
    )

    # Функция для красивого отображения картинки в списке
    def display_image(self, obj):
        if obj.image:
            # Делаем превью квадратным
            return format_html('<img src="{}" width="60" height="60" style="object-fit:cover; border-radius: 8px;" />', obj.image.url)
        return "Нет фото"
    display_image.short_description = 'Превью'

@admin.register(DiscountRule)
class DiscountRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'discount_type', 'min_quantity', 'discount_percentage', 'is_active')
    list_filter = ('discount_type', 'is_active')
    list_editable = ('is_active',)
    search_fields = ('name',)

    fieldsets = (
        (None, {
            'fields': ('name', 'is_active')
        }),
        ('Условие', {
            'fields': ('discount_type', 'min_quantity')
        }),
        ('Результат', {
            'fields': ('discount_percentage',)
        }),
        ('Цель (заполнять, если нужно)', {
            'description': "Укажите 'Целевой товар' для скидки на товар. Укажите 'Целевую категорию' для скидки на категорию. Оставьте пустым для скидки на всю корзину.",
            'fields': ('product_target', 'category_target')
        }),
    )


@admin.register(ShopSettings)
class ShopSettingsAdmin(admin.ModelAdmin):
    inlines = [ShopImageInline]

    fieldsets = (
        ('Основные настройки', {
            'fields': ('shop_name', 'manager_username', 'contact_phone')
        }),
        # --- НОВАЯ ГРУППИРОВКА ---
        ('Настройки страниц', {
            'classes': ('collapse',),
            'description': "Здесь настраиваются тексты и анимации для разных страниц.",
            'fields': (
                'search_placeholder',
                'search_initial_text',
                'search_lottie_file',
                'cart_lottie_file', # <-- Новое поле
            )
        }),
        ('Настройки страницы "Информация" (FAQ)', {
            'classes': ('collapse',),
            'fields': ('about_us_section', 'delivery_section', 'warranty_section')
        }),
        ('Коммерческие настройки', {
            'classes': ('collapse',),
            'fields': ('free_shipping_threshold',)
        }),
    )

    def has_add_permission(self, request):
        return False
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(FaqItem)
class FaqItemAdmin(admin.ModelAdmin):
    list_display = ('question', 'order', 'is_active')
    list_editable = ('order', 'is_active')
    search_fields = ('question', 'answer')