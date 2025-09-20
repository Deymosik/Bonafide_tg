# backend/shop/models.py
from django.db import models
from django.utils import timezone
from django_ckeditor_5.fields import CKEditor5Field
from django.db.models import Case, When, F, DecimalField
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFit
from colorfield.fields import ColorField

# --- Модель InfoPanel (без изменений) ---
class InfoPanel(models.Model):
    name = models.CharField("Название", max_length=50)
    color = ColorField("Цвет фона", default="#444444")
    # Заменяем CharField на ColorField
    text_color = ColorField("Цвет текста", default="#FFFFFF")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Информационная панелька"
        verbose_name_plural = "Информационные панельки"


# --- Модель Category (без изменений) ---
class Category(models.Model):
    name = models.CharField("Название категории", max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories', verbose_name="Родительская категория")

    def __str__(self):
        full_path = [self.name]
        k = self.parent
        while k is not None:
            full_path.append(k.name)
            k = k.parent
        return ' -> '.join(full_path[::-1])

    class Meta:
        verbose_name = "Категория"
        verbose_name_plural = "Категории"

# --- Модель ColorGroup (без изменений) ---
class ColorGroup(models.Model):
    name = models.CharField("Название группы (например, 'Чехол для iPhone 15 Pro')", max_length=200, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Группа цветов"
        verbose_name_plural = "Группы цветов"


class Feature(models.Model):
    """Модель для описания Функционала (особенностей) товара."""
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='features')
    name = models.CharField("Название особенности", max_length=200)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Особенность (функционал)"
        verbose_name_plural = "Особенности (функционал)"
        ordering = ['order']

    def __str__(self):
        return self.name

class CharacteristicCategory(models.Model):
    """Категория для группировки характеристик (например, 'Основные', 'Габариты')."""
    name = models.CharField("Название категории", max_length=100, unique=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Категория характеристики"
        verbose_name_plural = "Категории характеристик"
        ordering = ['order']

    def __str__(self):
        return self.name

class Characteristic(models.Model):
    """Справочник всех возможных названий характеристик (Вес, Цвет, Материал)."""
    name = models.CharField("Название характеристики", max_length=100, unique=True)
    category = models.ForeignKey(CharacteristicCategory, on_delete=models.CASCADE, related_name='characteristics')

    class Meta:
        verbose_name = "Характеристика (справочник)"
        verbose_name_plural = "Характеристики (справочник)"
        ordering = ['category__order', 'name']

    def __str__(self):
        return f"{self.category.name} - {self.name}"

class ProductCharacteristic(models.Model):
    """Связь конкретного товара с характеристикой и ее значением."""
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='characteristics')
    characteristic = models.ForeignKey(Characteristic, on_delete=models.CASCADE, verbose_name="Характеристика")
    value = models.CharField("Значение", max_length=255)

    class Meta:
        verbose_name = "Характеристика товара"
        verbose_name_plural = "Характеристики товара"
        ordering = ['characteristic']
        unique_together = ('product', 'characteristic') # Одна характеристика на один товар

    def __str__(self):
        return f"{self.product.name}: {self.characteristic.name} = {self.value}"


# --- Модель Product (С КЛЮЧЕВЫМИ ИЗМЕНЕНИЯМИ) ---
class Product(models.Model):
    name = models.CharField("Название товара", max_length=200)

    # 1. ИЗМЕНЕНИЕ: Переименовали 'price' в 'regular_price'
    regular_price = models.DecimalField("Обычная цена", max_digits=10, decimal_places=2)

    # --- Поля для "Товара дня" ---
    deal_price = models.DecimalField(
        "Акционная цена ('Товар дня')",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Укажите цену, которая будет действовать во время акции 'Товар дня'. Оставьте пустым, если скидки нет."
    )

    deal_ends_at = models.DateTimeField(
        "Акция 'Товар дня' действует до",
        null=True,
        blank=True,
        help_text="Укажите дату и время окончания акции. После этого товар перестанет быть 'Товаром дня'."
    )
    description = CKEditor5Field("Описание", config_name='default')

    # 2. ИЗМЕНЕНИЕ: Удалено дублирующееся поле 'price'

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products", verbose_name="Категория")
    info_panels = models.ManyToManyField(InfoPanel, blank=True, verbose_name="Информационные панельки")
    is_active = models.BooleanField("Активен (виден клиенту)", default=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    main_image = models.ImageField("Главное фото (оригинал)", upload_to='products/main/original/')
    main_image_thumbnail = ImageSpecField(source='main_image',
                                          processors=[ResizeToFit(width=600)],
                                          format='WEBP',
                                          options={'quality': 85})
    audio_sample = models.FileField("Пример аудио (MP3, WAV)", upload_to='products/audio/', null=True, blank=True)

    related_products = models.ManyToManyField('self', blank=True, symmetrical=False, verbose_name="Сопутствующие товары")
    color_group = models.ForeignKey(ColorGroup, on_delete=models.SET_NULL, related_name='products', null=True, blank=True, verbose_name="Группа цветов")

    @property
    def is_deal_of_the_day(self):
        """
        Вычисляет, является ли товар 'Товаром дня' в данный момент.
        Возвращает True, если есть акционная цена и срок акции не истек.
        """
        return (
            self.deal_price is not None and
            self.deal_ends_at and
            self.deal_ends_at > timezone.now()
        )

    @property
    def current_price(self):
        """
        Возвращает актуальную цену товара.
        Эта функция теперь будет использовать наше новое свойство is_deal_of_the_day.
        """
        # Этот код остается рабочим благодаря свойству is_deal_of_the_day!
        if self.is_deal_of_the_day:
            return self.deal_price
        return self.regular_price

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Товар"
        verbose_name_plural = "Товары"
        ordering = ['-created_at']

    @classmethod
    def annotate_with_price(cls, queryset):
        """
        Аннотирует queryset новым полем 'price', которое содержит
        актуальную цену (акционную или обычную).
        """
        now = timezone.now()

        # Условие, при котором акция "Товар дня" активна
        deal_active_condition = models.Q(
            deal_price__isnull=False,
            deal_ends_at__gt=now
        )

        # Создаем "виртуальное" поле 'price'
        # Если акция активна -> берем deal_price
        # Иначе -> берем regular_price
        price_annotation = Case(
            When(deal_active_condition, then=F('deal_price')),
            default=F('regular_price'),
            output_field=DecimalField()
        )

        return queryset.annotate(price=price_annotation)

# --- Модель ProductImage (С ИЗМЕНЕНИЯМИ) ---
class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images', verbose_name="Товар")
    image = models.ImageField("Фото (оригинал)", upload_to='products/additional/original/')

    # 3. ИЗМЕНЕНИЕ: Заменяем процессор на ResizeToFit
    image_thumbnail = ImageSpecField(source='image',
                                     processors=[ResizeToFit(width=800, height=800)],
                                     format='WEBP',
                                     options={'quality': 85})

    def __str__(self):
        return f"Фото для {self.product.name}"

    class Meta:
        verbose_name = "Дополнительное фото"
        verbose_name_plural = "Дополнительные фото"

# --- Модель PromoBanner (С ИЗМЕНЕНИЯМИ) ---
class PromoBanner(models.Model):
    title = models.CharField("Название (для админа)", max_length=100)
    image = models.ImageField("Изображение (оригинал)", upload_to='banners/original/')

    # 4. ИЗМЕНЕНИЕ: Заменяем процессор на ResizeToFit
    image_thumbnail = ImageSpecField(source='image',
                                     processors=[ResizeToFit(width=280)],
                                     format='WEBP',
                                     options={'quality': 80})

    link_url = models.URLField("URL-ссылка (куда ведет баннер)", blank=True, null=True)
    text_content = models.CharField("Текст на баннере", max_length=150, blank=True, help_text="Оставьте пустым, если текст не нужен")
    text_color = models.CharField("Цвет текста (HEX)", max_length=7, default="#FFFFFF", help_text="Например, #FFFFFF для белого")
    order = models.IntegerField("Порядок сортировки", default=0, help_text="Чем меньше число, тем левее будет баннер")
    is_active = models.BooleanField("Активен (виден клиенту)", default=True)

    class Meta:
        verbose_name = "Промо-баннер (сторис)"
        verbose_name_plural = "Промо-баннеры (сторис)"
        ordering = ['order']

    def __str__(self):
        return self.title

# --- Модель ProductInfoCard (С ИЗМЕНЕНИЯМИ) ---
class ProductInfoCard(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='info_cards', verbose_name="Товар")
    title = models.CharField("Заголовок (под фото)", max_length=100)
    image = models.ImageField("Фото для карточки (оригинал)", upload_to='products/info_cards/original/')

    # 5. ИЗМЕНЕНИЕ: Заменяем процессор на ResizeToFit
    image_thumbnail = ImageSpecField(source='image',
                                     processors=[ResizeToFit(width=240)],
                                     format='WEBP',
                                     options={'quality': 80})

    link_url = models.URLField("URL для перехода по клику")

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Инфо-карточка (фича)"
        verbose_name_plural = "Инфо-карточки (фичи)"

# --- Модель DiscountRule (без изменений) ---
class DiscountRule(models.Model):
    class DiscountType(models.TextChoices):
        TOTAL_QUANTITY = 'TOTAL_QTY', 'На общее количество товаров в корзине'
        PRODUCT_QUANTITY = 'PRODUCT_QTY', 'На количество конкретного товара'
        CATEGORY_QUANTITY = 'CATEGORY_QTY', 'На количество товаров из конкретной категории'
    name = models.CharField("Название правила (для админа)", max_length=255)
    discount_type = models.CharField("Тип скидки", max_length=20, choices=DiscountType.choices, default=DiscountType.TOTAL_QUANTITY)
    min_quantity = models.PositiveIntegerField("Минимальное количество для активации", default=2)
    discount_percentage = models.DecimalField("Процент скидки", max_digits=5, decimal_places=2, help_text="Например, 10.5 для 10.5%")
    product_target = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Целевой товар")
    category_target = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Целевая категория")
    is_active = models.BooleanField("Правило активно", default=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Правило скидки"
        verbose_name_plural = "Правила скидок"
        ordering = ['-discount_percentage']

# --- Модель ShopSettings (без изменений) ---
class ShopSettings(models.Model):

    manager_username = models.CharField("Юзернейм менеджера в Telegram", max_length=100, help_text="Без @", default="username")
    contact_phone = models.CharField("Контактный телефон", max_length=20, blank=True)
    about_us_section = CKEditor5Field("Блок 'О нас'", blank=True, help_text="Краткий рассказ о магазине", config_name='default')
    delivery_section = CKEditor5Field("Блок 'Условия доставки'", blank=True, config_name='default')
    warranty_section = CKEditor5Field("Блок 'Гарантия и возврат'", blank=True, config_name='default')
    free_shipping_threshold = models.DecimalField("Порог бесплатной доставки", max_digits=10, decimal_places=2, null=True, blank=True, help_text="Оставьте пустым или 0, чтобы отключить эту функцию")
    search_placeholder = models.CharField("Плейсхолдер в строке поиска", max_length=150, default="Найти чехол или наушники...")
    search_initial_text = models.CharField("Текст до начала поиска", max_length=255, default="Начните вводить, чтобы найти товар")
    search_lottie_file = models.FileField(
        "Файл Lottie-анимации (.json) для Поиска", # Уточняем название
        upload_to='lottie/',
        blank=True,
        null=True,
        help_text="Отображается на пустой странице поиска"
    )

    # --- НОВОЕ ПОЛЕ ДЛЯ АНИМАЦИИ В КОРЗИНЕ ---
    cart_lottie_file = models.FileField(
        "Файл Lottie-анимации (.json) для Корзины",
        upload_to='lottie/',
        blank=True,
        null=True,
        help_text="Отображается в пустой корзине"
    )

    privacy_policy = CKEditor5Field("Политика конфиденциальности", blank=True, config_name='default')
    public_offer = CKEditor5Field("Публичная оферта", blank=True, config_name='default')

    def __str__(self):
        return "Настройки магазина"
    def save(self, *args, **kwargs):
        self.pk = 1; super(ShopSettings, self).save(*args, **kwargs)
    def delete(self, *args, **kwargs): pass
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1); return obj

    class Meta:
        verbose_name = "Настройки магазина"
        verbose_name_plural = "Настройки магазина"

# --- Модель FaqItem (без изменений) ---
class FaqItem(models.Model):
    question = models.CharField("Вопрос", max_length=255)
    answer = CKEditor5Field("Ответ", config_name='default')
    order = models.PositiveIntegerField("Порядок сортировки", default=0, help_text="Чем меньше число, тем выше будет вопрос")
    is_active = models.BooleanField("Активен", default=True)

    def __str__(self):
        return self.question

    class Meta:
        verbose_name = "Вопрос-Ответ (FAQ)"
        verbose_name_plural = "Вопросы-Ответы (FAQ)"
        ordering = ['order']

# --- Модель ShopImage (С ИЗМЕНЕНИЯМИ) ---
class ShopImage(models.Model):
    settings = models.ForeignKey(ShopSettings, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField("Изображение (оригинал)", upload_to='shop_images/original/')

    # 6. ИЗМЕНЕНИЕ: Заменяем процессор на ResizeToFit
    image_thumbnail = ImageSpecField(source='image',
                                     processors=[ResizeToFit(width=800)],
                                     format='WEBP',
                                     options={'quality': 85})

    caption = models.CharField("Подпись (опционально)", max_length=200, blank=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Фотография магазина"
        verbose_name_plural = "Фотографии магазина"
        ordering = ['order']

class Cart(models.Model):
    """Модель корзины, привязанная к пользователю Telegram."""
    telegram_id = models.BigIntegerField("Telegram ID пользователя", unique=True, db_index=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    def __str__(self):
        return f"Корзина пользователя {self.telegram_id}"

    class Meta:
        verbose_name = "Корзина пользователя"
        verbose_name_plural = "Корзины пользователей"

class CartItem(models.Model):
    """Модель товара в корзине."""
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items', verbose_name="Корзина")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items', verbose_name="Товар")
    quantity = models.PositiveIntegerField("Количество", default=1)
    added_at = models.DateTimeField("Дата добавления", auto_now_add=True)

    def __str__(self):
        return f"{self.quantity} x {self.product.name} в корзине {self.cart.telegram_id}"

    class Meta:
        verbose_name = "Товар в корзине"
        verbose_name_plural = "Товары в корзине"
        # Гарантируем, что один и тот же товар не будет добавлен в одну корзину дважды
        unique_together = ('cart', 'product')
        ordering = ['added_at']

class Order(models.Model):
    class DeliveryMethod(models.TextChoices):
        POST = 'Почта России', 'Почта России'
        SDEK = 'СДЭК', 'СДЭК'

    class OrderStatus(models.TextChoices):
        NEW = 'new', 'Новый'
        PROCESSING = 'processing', 'В обработке'
        SHIPPED = 'shipped', 'Отправлен'
        COMPLETED = 'completed', 'Выполнен'
        CANCELED = 'canceled', 'Отменен'

    telegram_id = models.BigIntegerField("Telegram ID пользователя", db_index=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    status = models.CharField("Статус заказа", max_length=20, choices=OrderStatus.choices, default=OrderStatus.NEW)

    # Контактные данные
    last_name = models.CharField("Фамилия", max_length=100)
    first_name = models.CharField("Имя", max_length=100)
    patronymic = models.CharField("Отчество", max_length=100, blank=True, default='')
    phone = models.CharField("Номер телефона", max_length=20)

    # --- ОБНОВЛЕННЫЙ БЛОК АДРЕСА ---
    delivery_method = models.CharField("Способ доставки", max_length=50)

    city = models.CharField("Населенный пункт", max_length=100, blank=True)

    # Поля для "Почты России"
    # ИЗМЕНЕНИЕ: Поле 'region' полностью удалено
    district = models.CharField("Район", max_length=150, blank=True)
    street = models.CharField("Улица", max_length=255, blank=True)
    house = models.CharField("Дом", max_length=20, blank=True)
    apartment = models.CharField("Квартира", max_length=20, blank=True)
    postcode = models.CharField("Почтовый индекс", max_length=6, blank=True)

    # Поле для "СДЭК"
    cdek_office_address = models.CharField("Адрес пункта выдачи СДЭК", max_length=255, blank=True)

    # Финансовая информация
    subtotal = models.DecimalField("Сумма (без скидки)", max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField("Размер скидки", max_digits=10, decimal_places=2, default=0)
    final_total = models.DecimalField("Итоговая сумма", max_digits=10, decimal_places=2)
    applied_rule = models.CharField("Примененная скидка", max_length=255, blank=True, null=True)

    def get_full_name(self):
        return f"{self.last_name} {self.first_name} {self.patronymic}".strip()
    get_full_name.short_description = "ФИО клиента"

    def __str__(self):
        return f"Заказ №{self.id} от {self.created_at.strftime('%Y-%m-%d')}"

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ['-created_at']


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', verbose_name="Заказ")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="Товар")
    quantity = models.PositiveIntegerField("Количество", default=1)
    price_at_purchase = models.DecimalField("Цена на момент покупки", max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product.name} (x{self.quantity})"

    class Meta:
        verbose_name = "Товар в заказе"
        verbose_name_plural = "Товары в заказе"