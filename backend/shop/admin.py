# backend/shop/admin.py
import csv
from django.contrib import admin, messages
from django.http import HttpResponse
from django.utils.html import format_html
from .models import (
    InfoPanel, Category, Product, ProductImage, PromoBanner, ProductInfoCard,
    DiscountRule, ColorGroup, ShopSettings, FaqItem, ShopImage,
    Feature, CharacteristicCategory, Characteristic, ProductCharacteristic, Cart, CartItem, Order, OrderItem
)

class FeatureInline(admin.TabularInline):
    model = Feature
    extra = 1
    verbose_name = "Особенность (функционал)"
    verbose_name_plural = "Особенности (функционал)"
    fields = ('name', 'order')

class ProductCharacteristicInline(admin.TabularInline):
    model = ProductCharacteristic
    extra = 1
    verbose_name = "Характеристика"
    verbose_name_plural = "Характеристики"
    # Позволяет выбрать характеристику из выпадающего списка
    autocomplete_fields = ['characteristic']

# --- Все классы Inline остаются без изменений ---
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

class ShopImageInline(admin.TabularInline):
    model = ShopImage
    extra = 1
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
    search_fields = ('name', 'description', 'characteristics__characteristic__name', 'characteristics__value')

    # 3. ДОБАВЛЯЕМ НОВЫЕ ИНЛАЙНЫ
    inlines = [
        ProductImageInline,
        ProductInfoCardInline,
        FeatureInline,
        ProductCharacteristicInline,
    ]
    list_editable = ('is_active',)

    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'color_group', 'category', 'regular_price', 'description', 'is_active')
        }),
        ("Акция 'Товар дня'", {
            'classes': ('collapse',),
            'fields': ('deal_ends_at', 'deal_price')
        }),
        ('Медиафайлы', {
            'fields': ('main_image', 'audio_sample')
        }),
        ('Связи и опции', {
            'fields': ('related_products', 'info_panels')
        }),
    )

    filter_horizontal = ('related_products', 'info_panels',)

    @admin.display(description='Товар дня?', boolean=True)
    def display_deal_status(self, obj):
        return obj.is_deal_of_the_day

    # --- 1. ДОБАВЛЯЕМ НОВЫЙ ЭКШЕН ---
    actions = ['make_active', 'make_inactive', 'duplicate_product']

    def make_active(self, request, queryset):
        queryset.update(is_active=True)
    make_active.short_description = "Сделать выделенные товары активными"

    def make_inactive(self, request, queryset):
        queryset.update(is_active=False)
    make_inactive.short_description = "Сделать выделенные товары неактивными"

    # --- 2. ДОБАВЛЯЕМ ЛОГИКУ КОПИРОВАНИЯ ---
    @admin.action(description='Дублировать выбранные товары')
    def duplicate_product(self, request, queryset):
        if queryset.count() > 5:
            self.message_user(
                request,
                "Можно дублировать не более 5 товаров за раз.",
                messages.WARNING
            )
            return

        for product in queryset:
            # --- Сохраняем связи ManyToMany ---
            related_products = list(product.related_products.all())
            info_panels = list(product.info_panels.all())

            # --- Сохраняем связанные дочерние объекты (Inlines) ---
            images_to_copy = list(product.images.all())
            cards_to_copy = list(product.info_cards.all())

            # --- Создаем копию ---
            product.pk = None  # Это "магический" трюк, который говорит Django, что это новый объект
            product.name = f"{product.name} (копия)"
            product.is_active = False # Новую копию лучше сделать неактивной по умолчанию
            product.save() # Сохраняем новый товар, чтобы получить его ID

            # --- Восстанавливаем связи ManyToMany ---
            product.related_products.set(related_products)
            product.info_panels.set(info_panels)

            # --- Копируем связанные дочерние объекты ---
            for image in images_to_copy:
                image.pk = None # Создаем новый объект
                image.product = product # Привязываем к новому товару
                image.save()

            for card in cards_to_copy:
                card.pk = None
                card.product = product
                card.save()

        self.message_user(
            request,
            f"Успешно создано {queryset.count()} копий товаров.",
            messages.SUCCESS
        )

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

@admin.register(CharacteristicCategory)
class CharacteristicCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'order')
    list_editable = ('order',)

@admin.register(Characteristic)
class CharacteristicAdmin(admin.ModelAdmin):
    list_display = ('name', 'category')
    list_filter = ('category',)
    search_fields = ('name',)

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
            'fields': ('manager_username', 'contact_phone')
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

class CartItemInline(admin.TabularInline):
    """Инлайн для отображения товаров прямо на странице корзины."""
    model = CartItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'added_at')
    can_delete = False
    verbose_name = "Товар в корзине"
    verbose_name_plural = "Товары в корзине"

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('telegram_id', 'created_at', 'updated_at')
    search_fields = ('telegram_id',)
    inlines = [CartItemInline]
    # Запрещаем создание и изменение корзин вручную через админку
    readonly_fields = ('telegram_id', 'created_at', 'updated_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        # Разрешаем просмотр, но запрещаем редактирование
        return False if obj else True

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'price_at_purchase')
    can_delete = False
    verbose_name = "Товар в заказе"
    verbose_name_plural = "Товары в заказе"

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'get_full_name', 'delivery_method', 'city', 'final_total', 'created_at')
    list_filter = ('status', 'delivery_method', 'created_at')
    search_fields = ('id', 'first_name', 'last_name', 'phone', 'city', 'cdek_office_address')

    readonly_fields = (
        'id', 'created_at', 'telegram_id', 'get_full_name', 'phone',
        'subtotal', 'discount_amount', 'final_total', 'applied_rule'
    )
    inlines = [OrderItemInline]
    actions = ['export_as_csv']

    fieldsets = (
        ('Основная информация', {'fields': ('id', 'status', 'created_at', 'telegram_id')}),
        ('Данные клиента', {'fields': ('get_full_name', 'phone')}),
        ('Финансы', {'fields': ('subtotal', 'discount_amount', 'final_total', 'applied_rule')}),
        ('Адрес доставки', {
            # ИЗМЕНЕНИЕ: Поле 'region' удалено из списка
            'fields': (
                'delivery_method',
                'city',
                'district',
                'street',
                'house',
                'apartment',
                'postcode',
                'cdek_office_address'
            )
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:
            base_readonly = list(self.readonly_fields)
            all_fields = [field.name for field in self.model._meta.fields]
            editable_fields = {'status'}
            return base_readonly + [f for f in all_fields if f not in editable_fields]
        return self.readonly_fields

    def has_add_permission(self, request):
        return False

    @admin.action(description='Экспортировать выбранные заказы в CSV')
    def export_as_csv(self, request, queryset):
        meta = self.model._meta
        # ИЗМЕНЕНИЕ: Поле 'region' удалено из списка
        field_names = [
            'id', 'status', 'last_name', 'first_name', 'patronymic', 'phone',
            'delivery_method', 'city', 'district', 'street', 'house',
            'apartment', 'postcode', 'cdek_office_address', 'final_total', 'created_at'
        ]
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename={meta.verbose_name_plural}.csv'
        writer = csv.writer(response)
        writer.writerow(field_names)
        for obj in queryset:
            writer.writerow([getattr(obj, field) for field in field_names])
        return response