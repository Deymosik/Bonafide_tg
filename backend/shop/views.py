# backend/shop/views.py
from django.conf import settings
from django.utils import timezone
from django.db.models import Prefetch
from decimal import Decimal

from rest_framework import generics, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    Product, Category, PromoBanner, DiscountRule,
    ShopSettings, FaqItem
)
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, CategorySerializer,
    PromoBannerSerializer, ShopSettingsSerializer, FaqItemSerializer,
    DealOfTheDaySerializer
)

# --- Существующие классы (без изменений) ---

def parse_init_data(init_data: str, bot_token: str):
    """
    Validates and parses the initData string from a Telegram Web App.
    Returns user data dictionary if valid, otherwise None.
    """
    try:
        # Разбираем строку на параметры
        parsed_data = dict(parse_qsl(init_data))
        hash_from_telegram = parsed_data.pop("hash", None)

        if not hash_from_telegram:
            return None

        # Формируем строку для проверки хеша
        data_check_string = "\n".join(
            f"{key}={value}" for key, value in sorted(parsed_data.items())
        )

        # Генерируем секретный ключ из токена бота
        secret_key = hmac.new(
            key=b"WebAppData", msg=bot_token.encode(), digestmod=hashlib.sha256
        ).digest()

        # Генерируем наш хеш
        calculated_hash = hmac.new(
            key=secret_key, msg=data_check_string.encode(), digestmod=hashlib.sha256
        ).hexdigest()

        # Сравниваем хеши
        if calculated_hash == hash_from_telegram:
            # Данные валидны, возвращаем информацию о пользователе
            user_data = json.loads(parsed_data.get("user", "{}"))
            return user_data
    except Exception:
        return None
    return None


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(parent__isnull=True)
    serializer_class = CategorySerializer
    pagination_class = None

class PromoBannerListView(generics.ListAPIView):
    queryset = PromoBanner.objects.filter(is_active=True).order_by('order')
    serializer_class = PromoBannerSerializer
    pagination_class = None

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ProductListView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter
    ]
    search_fields = ['name', 'description']
    # ИЗМЕНЕНИЕ 1: Сортировка по 'price' теперь будет сортировать по 'regular_price'.
    # Это предсказуемо и не требует сложных запросов к БД.
    ordering_fields = ['created_at', 'regular_price']

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True)\
            .select_related('category')\
            .prefetch_related('info_panels')\
            .order_by('-created_at')

        product_ids_str = self.request.query_params.getlist('ids')
        if product_ids_str:
            product_ids = [int(pid) for pid in product_ids_str if pid.isdigit()]
            if product_ids:
                queryset = queryset.filter(id__in=product_ids)
                return queryset

        category_id = self.request.query_params.get('category')
        if category_id:
            try:
                category = Category.objects.get(pk=category_id)
                def get_all_children_ids(category_obj):
                    children_ids = []
                    children = category_obj.subcategories.all()
                    for child in children:
                        children_ids.append(child.id)
                        children_ids.extend(get_all_children_ids(child))
                    return children_ids
                categories_ids_to_filter = [category.id] + get_all_children_ids(category)
                queryset = queryset.filter(category__id__in=categories_ids_to_filter)
            except Category.DoesNotExist:
                return Product.objects.none()

        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(self.request, queryset, self)

        return queryset


class ProductDetailView(generics.RetrieveAPIView):
    # 3. ОПТИМИЗАЦИЯ: Заменяем атрибут queryset на метод get_queryset для сложного запроса.
    serializer_class = ProductDetailSerializer

    def get_queryset(self):
        """
        Создаем максимально оптимизированный запрос, который "жадно" загружает
        все необходимые связанные данные для детальной страницы товара.
        """
        # Создаем специальный Prefetch для сопутствующих товаров,
        # чтобы для них тоже сразу подгружались инфо-панельки.
        # Это предотвращает N+1 запросы внутри сериализатора сопутствующих товаров.
        related_products_prefetch = Prefetch(
            'related_products',
            queryset=Product.objects.filter(is_active=True).prefetch_related('info_panels')
        )

        return Product.objects.filter(is_active=True).select_related(
            'category',       # Загружаем категорию (связь один-ко-многим)
            'color_group'     # Загружаем группу цветов
        ).prefetch_related(
            'info_panels',    # Загружаем все инфо-панели (многие-ко-многим)
            'images',         # Загружаем все доп. изображения
            'info_cards',     # Загружаем все инфо-карточки
            related_products_prefetch, # Используем наш специальный prefetch
            Prefetch(
                'color_group__products', # Загружаем все товары из той же группы цветов
                queryset=Product.objects.filter(is_active=True),
                to_attr='color_variations_prefetched' # Сохраняем результат в отдельный атрибут
            )
        )


class CalculateCartView(APIView):
    def post(self, request, *args, **kwargs):
        cart_items = request.data.get('cartItems', [])
        if not cart_items:
            return Response({"error": "Cart is empty"}, status=400)
        subtotal = Decimal('0')
        total_quantity = 0
        product_quantities = {}
        category_quantities = {}
        product_ids = [item['id'] for item in cart_items]

        # --- ИЗМЕНЕНИЕ 1: Оптимизируем загрузку товаров вместе с их категориями ---
        # Вместо .in_bulk() мы загружаем товары и сразу их категории,
        # чтобы избежать лишних запросов к БД внутри цикла.
        products_from_db = Product.objects.filter(id__in=product_ids).select_related('category')
        products_in_cart = {product.id: product for product in products_from_db}

        for item in cart_items:
            product = products_in_cart.get(item['id'])
            if not product: continue

            price = product.current_price
            quantity = item['quantity']
            subtotal += price * quantity
            total_quantity += quantity
            product_quantities[product.id] = quantity

            # --- ИЗМЕНЕНИЕ 2: Новая логика подсчета количества по категориям ---
            # Мы будем учитывать не только прямую категорию товара, но и всех ее "родителей".
            current_category = product.category
            while current_category is not None:
                category_quantities[current_category.id] = category_quantities.get(current_category.id, 0) + quantity
                # Переходим к родительской категории
                current_category = current_category.parent
        best_discount_amount = Decimal('0')
        applied_rule = None
        active_rules = DiscountRule.objects.filter(is_active=True).select_related('product_target', 'category_target')
        for rule in active_rules:
            current_discount = Decimal('0')
            if rule.discount_type == DiscountRule.DiscountType.TOTAL_QUANTITY and total_quantity >= rule.min_quantity:
                current_discount = subtotal * (rule.discount_percentage / 100)
            elif rule.discount_type == DiscountRule.DiscountType.PRODUCT_QUANTITY and rule.product_target_id in product_quantities:
                if product_quantities[rule.product_target_id] >= rule.min_quantity:
                    current_discount = subtotal * (rule.discount_percentage / 100)
            elif rule.discount_type == DiscountRule.DiscountType.CATEGORY_QUANTITY and rule.category_target_id in category_quantities:
                if category_quantities[rule.category_target_id] >= rule.min_quantity:
                    current_discount = subtotal * (rule.discount_percentage / 100)
            if current_discount > best_discount_amount:
                best_discount_amount = current_discount
                applied_rule = rule
        upsell_hint = None
        if not applied_rule:
            min_needed_for_hint = float('inf')
            for rule in active_rules:
                needed = 0
                current_hint = ""
                if rule.discount_type == DiscountRule.DiscountType.TOTAL_QUANTITY:
                    needed = rule.min_quantity - total_quantity
                    if 0 < needed:
                        current_hint = f"Добавьте еще {needed} шт. любого товара, чтобы получить скидку {rule.discount_percentage}%!"
                elif rule.discount_type == DiscountRule.DiscountType.PRODUCT_QUANTITY and rule.product_target:
                    current_qty = product_quantities.get(rule.product_target.id, 0)
                    needed = rule.min_quantity - current_qty
                    if 0 < needed:
                        product_name = rule.product_target.name
                        current_hint = f"Добавьте еще {needed} шт. товара «{product_name}», чтобы получить скидку {rule.discount_percentage}%!"
                elif rule.discount_type == DiscountRule.DiscountType.CATEGORY_QUANTITY and rule.category_target:
                    current_qty = category_quantities.get(rule.category_target.id, 0)
                    needed = rule.min_quantity - current_qty
                    if 0 < needed:
                        category_name = rule.category_target.name
                        current_hint = f"Добавьте еще {needed} шт. из категории «{category_name}», чтобы получить скидку {rule.discount_percentage}%!"
                if current_hint and needed < min_needed_for_hint:
                    min_needed_for_hint = needed
                    upsell_hint = current_hint
        final_total = subtotal - best_discount_amount
        response_data = {
            'subtotal': subtotal.quantize(Decimal("0.01")),
            'discount_amount': best_discount_amount.quantize(Decimal("0.01")),
            'final_total': final_total.quantize(Decimal("0.01")),
            'applied_rule': applied_rule.name if applied_rule else None,
            'upsell_hint': upsell_hint
        }
        return Response(response_data)

class ShopSettingsView(APIView):
    def get(self, request, *args, **kwargs):
        settings = ShopSettings.load()
        serializer = ShopSettingsSerializer(settings, context={'request': request})
        return Response(serializer.data)

class FaqListView(generics.ListAPIView):
    queryset = FaqItem.objects.filter(is_active=True).order_by('order')
    serializer_class = FaqItemSerializer
    pagination_class = None

class DealOfTheDayView(generics.RetrieveAPIView):
    serializer_class = DealOfTheDaySerializer

    def get_object(self):
        now = timezone.now()
        # ИЗМЕНЕНИЕ: Запрос теперь напрямую проверяет цену и дату,
        # а не удаленное поле is_deal_of_the_day.
        deal_product = Product.objects.filter(
            is_active=True,
            deal_price__isnull=False,  # Проверяем, что акционная цена задана
            deal_ends_at__gt=now       # Проверяем, что срок акции не истек
        ).order_by('deal_ends_at').first()
        return deal_product
