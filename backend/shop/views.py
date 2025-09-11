# backend/shop/views.py
from django.conf import settings
from django.utils import timezone
from django.db.models import Prefetch
from decimal import Decimal

from rest_framework import generics, filters, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    Product, Category, PromoBanner, DiscountRule,
    ShopSettings, FaqItem, Cart, CartItem
)
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, CategorySerializer,
    PromoBannerSerializer, ShopSettingsSerializer, FaqItemSerializer,
    DealOfTheDaySerializer, CartSerializer, DetailedCartItemSerializer
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
        filters.SearchFilter,
    ]
    search_fields = ['name', 'description']

    # 1. РАЗРЕШАЕМ СОРТИРОВКУ ПО 'price'
    # Фронтенд уже отправляет 'price', так что теперь все будет совпадать.
    ordering_fields = ['created_at', 'price']

    def get_queryset(self):
        # 2. СОЗДАЕМ БАЗОВЫЙ QUERYSET
        # Здесь мы выбираем только активные товары и подгружаем связанные данные.
        base_queryset = Product.objects.filter(is_active=True)\
            .select_related('category')\
            .prefetch_related('info_panels')

        # 3. АННОТИРУЕМ QUERYSET АКТУАЛЬНОЙ ЦЕНОЙ
        # Используем метод, который мы добавили в модель Product.
        # Теперь у каждого товара есть "виртуальное" поле 'price',
        # по которому OrderingFilter сможет работать.
        queryset_with_price = Product.annotate_with_price(base_queryset)

        # --- Далее идет ВАША СУЩЕСТВУЮЩАЯ ЛОГИКА ФИЛЬТРАЦИИ, ---
        # --- но теперь она применяется к новому queryset_with_price. ---

        # Фильтрация по конкретным ID (если переданы)
        product_ids_str = self.request.query_params.getlist('ids')
        if product_ids_str:
            product_ids = [int(pid) for pid in product_ids_str if pid.isdigit()]
            if product_ids:
                # ВАЖНО: фильтруем queryset_with_price
                queryset_with_price = queryset_with_price.filter(id__in=product_ids)
                return queryset_with_price

        # Фильтрация по категории
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
                # ВАЖНО: фильтруем queryset_with_price
                queryset_with_price = queryset_with_price.filter(category__id__in=categories_ids_to_filter)
            except Category.DoesNotExist:
                return Product.objects.none()

        # 4. ВАЖНАЯ ЧАСТЬ: ПРИМЕНЯЕМ СОРТИРОВКУ И ПОИСК
        # Мы убрали эту логику из вашего кода, но она должна быть здесь.
        # DRF filter_backends должны применяться к финальному queryset.
        for backend in list(self.filter_backends):
             queryset_with_price = backend().filter_queryset(self.request, queryset_with_price, self)

        return queryset_with_price

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



def calculate_detailed_discounts(items):
    """
    Рассчитывает скидки и возвращает ДЕТАЛИЗИРОВАННЫЙ список товаров.
    'items' должен быть списком CartItem.
    """
    if not items:
        return {
            'items': [],
            'subtotal': '0.00', 'discount_amount': '0.00', 'final_total': '0.00',
            'applied_rule': None, 'upsell_hint': None
        }

    subtotal = Decimal('0')
    total_quantity = 0
    product_quantities = {}
    category_quantities = {}

    # Конвертируем queryset в простой список для удобства
    item_list = [{'product': item.product, 'quantity': item.quantity, 'id': item.id} for item in items]

    for item in item_list:
        product = item['product']
        quantity = item['quantity']
        price = product.current_price
        subtotal += price * quantity
        total_quantity += quantity
        product_quantities[product.id] = quantity
        current_category = product.category
        while current_category is not None:
            category_quantities[current_category.id] = category_quantities.get(current_category.id, 0) + quantity
            current_category = current_category.parent

    best_discount_amount = Decimal('0')
    applied_rule = None
    active_rules = DiscountRule.objects.filter(is_active=True).select_related('product_target', 'category_target')

    for rule in active_rules:
        current_discount = Decimal('0')
        if rule.discount_type == DiscountRule.DiscountType.TOTAL_QUANTITY:
            if total_quantity >= rule.min_quantity:
                current_discount = subtotal * (rule.discount_percentage / 100)
        elif rule.discount_type == DiscountRule.DiscountType.PRODUCT_QUANTITY and rule.product_target_id in product_quantities:
            if product_quantities[rule.product_target_id] >= rule.min_quantity:
                target_subtotal = item_list[0]['product'].current_price * item_list[0]['quantity'] # Пример упрощен
                for item in item_list:
                    if item['product'].id == rule.product_target_id:
                        target_subtotal = item['product'].current_price * item['quantity']
                current_discount = target_subtotal * (rule.discount_percentage / 100)
        elif rule.discount_type == DiscountRule.DiscountType.CATEGORY_QUANTITY and rule.category_target_id in category_quantities:
            if category_quantities[rule.category_target_id] >= rule.min_quantity:
                target_subtotal = Decimal('0')
                target_category_id = rule.category_target_id
                for item in item_list:
                    is_in_target_category = False
                    cat = item['product'].category
                    while cat is not None:
                        if cat.id == target_category_id: is_in_target_category = True; break
                        cat = cat.parent
                    if is_in_target_category: target_subtotal += item['product'].current_price * item['quantity']
                current_discount = target_subtotal * (rule.discount_percentage / 100)
        if current_discount > best_discount_amount:
            best_discount_amount = current_discount
            applied_rule = rule

    # --- 2. "РАСКРАШИВАЕМ" ТОВАРЫ ПОСЛЕ НАХОЖДЕНИЯ ЛУЧШЕЙ СКИДКИ ---
    final_items = []
    if applied_rule:
        for item in item_list:
            product = item['product']
            quantity = item['quantity']
            original_price = product.current_price
            discounted_price = None

            is_discounted = False
            if applied_rule.discount_type == DiscountRule.DiscountType.TOTAL_QUANTITY:
                is_discounted = True
            elif applied_rule.discount_type == DiscountRule.DiscountType.PRODUCT_QUANTITY:
                if product.id == applied_rule.product_target_id: is_discounted = True
            elif applied_rule.discount_type == DiscountRule.DiscountType.CATEGORY_QUANTITY:
                cat = product.category
                while cat is not None:
                    if cat.id == applied_rule.category_target_id: is_discounted = True; break
                    cat = cat.parent

            if is_discounted:
                discounted_price = original_price * (Decimal('100') - applied_rule.discount_percentage) / Decimal('100')

            final_items.append({
                'id': item['id'],
                'product': product,
                'quantity': quantity,
                'original_price': original_price,
                'discounted_price': discounted_price.quantize(Decimal("0.01")) if discounted_price else None
            })
    else:
        # Если скидки нет, просто форматируем данные
        for item in item_list:
            final_items.append({
                'id': item['id'],
                'product': item['product'],
                'quantity': item['quantity'],
                'original_price': item['product'].current_price,
                'discounted_price': None
            })


    # --- Логика подсказок остается той же, она уже работает правильно ---
    upsell_hint = None
    if not applied_rule:
        # ... (здесь вся ваша существующая логика для upsell_hint без изменений)
        min_needed_for_hint = float('inf')
        for rule in active_rules:
            needed = 0
            current_hint = ""
            if rule.discount_type == DiscountRule.DiscountType.TOTAL_QUANTITY:
                needed = rule.min_quantity - total_quantity
                if 0 < needed: current_hint = f"Добавьте еще {needed} шт. любого товара, чтобы получить скидку {rule.discount_percentage}%!"
            elif rule.discount_type == DiscountRule.DiscountType.PRODUCT_QUANTITY and rule.product_target:
                current_qty = product_quantities.get(rule.product_target.id, 0)
                needed = rule.min_quantity - current_qty
                if 0 < needed: current_hint = f"Добавьте еще {needed} шт. товара «{rule.product_target.name}», чтобы получить скидку {rule.discount_percentage}%!"
            elif rule.discount_type == DiscountRule.DiscountType.CATEGORY_QUANTITY and rule.category_target:
                current_qty = category_quantities.get(rule.category_target.id, 0)
                needed = rule.min_quantity - current_qty
                if 0 < needed: current_hint = f"Добавьте еще {needed} шт. из категории «{rule.category_target.name}», чтобы получить скидку {rule.discount_percentage}%!"

            if current_hint and needed < min_needed_for_hint:
                min_needed_for_hint = needed
                upsell_hint = current_hint

    # --- Финальный расчет ---
    final_total = subtotal - best_discount_amount

    return {
        'items': final_items,
        'subtotal': subtotal.quantize(Decimal("0.01")),
        'discount_amount': best_discount_amount.quantize(Decimal("0.01")),
        'final_total': final_total,
        'applied_rule': applied_rule.name if applied_rule else None,
        'upsell_hint': upsell_hint,
    }


# --- 2. НОВЫЙ VIEW ДЛЯ ДИНАМИЧЕСКОГО РАСЧЕТА ---
class CalculateSelectionView(APIView):
    """
    Рассчитывает итоги и скидки для произвольного набора товаров (выбранных).
    """
    def post(self, request, *args, **kwargs):
        selection = request.data.get('selection', [])

        # Конвертируем selection в queryset CartItem-ов "на лету"
        # Это хак, но он позволяет переиспользовать код
        cart_items_mock = []
        for item_data in selection:
            try:
                product = Product.objects.select_related('category').get(id=item_data['product_id'])
                cart_item = CartItem(product=product, quantity=item_data['quantity'])
                cart_items_mock.append(cart_item)
            except Product.DoesNotExist:
                continue

        detailed_data = calculate_detailed_discounts(cart_items_mock)
        # Сериализуем "раскрашенные" товары
        detailed_data['items'] = DetailedCartItemSerializer(detailed_data['items'], many=True, context={'request': request}).data
        return Response(detailed_data)

# --- 3. ОБНОВЛЯЕМ CartView, ЧТОБЫ ОН ИСПОЛЬЗОВАЛ НОВУЮ ФУНКЦИЮ ---
class CartView(APIView):
    def get(self, request, *args, **kwargs):
        telegram_id = request.headers.get('X-Telegram-ID')
        if not telegram_id:
            return Response({"error": "Telegram ID не предоставлен"}, status=status.HTTP_400_BAD_REQUEST)

        cart, _ = Cart.objects.prefetch_related('items__product__category', 'items__product__info_panels').get_or_create(telegram_id=telegram_id)

        detailed_data = calculate_detailed_discounts(cart.items.all())
        # Сериализуем "раскрашенные" товары
        detailed_data['items'] = DetailedCartItemSerializer(detailed_data['items'], many=True, context={'request': request}).data

        return Response(detailed_data)

    def post(self, request, *args, **kwargs):
        """Добавить/обновить/удалить товар и вернуть обновленную корзину с расчетами."""
        telegram_id = request.headers.get('X-Telegram-ID')
        if not telegram_id:
            return Response({"error": "Telegram ID не предоставлен"}, status=status.HTTP_400_BAD_REQUEST)

        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        if not product_id:
            return Response({"error": "Product ID не предоставлен"}, status=status.HTTP_400_BAD_REQUEST)

        cart, created = Cart.objects.get_or_create(telegram_id=telegram_id)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"error": "Товар не найден"}, status=status.HTTP_404_NOT_FOUND)

        if quantity > 0:
            # Используем update_or_create для более чистого кода
            cart_item, created = CartItem.objects.update_or_create(
                cart=cart,
                product=product,
                defaults={'quantity': quantity}
            )
        else:
            # Если количество 0 или меньше, удаляем товар из корзины
            CartItem.objects.filter(cart=cart, product=product).delete()

        # Возвращаем обновленное состояние всей корзины с расчетами
        cart.refresh_from_db()
        detailed_data = calculate_detailed_discounts(cart.items.all())
        detailed_data['items'] = DetailedCartItemSerializer(detailed_data['items'], many=True, context={'request': request}).data
        return Response(detailed_data, status=status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        """Удалить несколько товаров из корзины по их ID."""
        telegram_id = request.headers.get('X-Telegram-ID')
        if not telegram_id:
            return Response({"error": "Telegram ID не предоставлен"}, status=status.HTTP_400_BAD_REQUEST)

        # Ожидаем список ID товаров для удаления
        product_ids = request.data.get('product_ids', [])
        if not isinstance(product_ids, list):
            return Response({"error": "Ожидается список product_ids"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cart = Cart.objects.get(telegram_id=telegram_id)
            # Удаляем все CartItem, связанные с этой корзиной и переданными ID товаров
            CartItem.objects.filter(cart=cart, product_id__in=product_ids).delete()
        except Cart.DoesNotExist:
            # Если корзины нет, значит, и удалять нечего. Просто возвращаем успех.
            pass

        # Возвращаем обновленное состояние всей корзины с расчетами
        cart, _ = Cart.objects.get_or_create(telegram_id=telegram_id)
        detailed_data = calculate_detailed_discounts(cart.items.all())
        detailed_data['items'] = DetailedCartItemSerializer(detailed_data['items'], many=True, context={'request': request}).data
        return Response(detailed_data, status=status.HTTP_200_OK)


