# backend/shop/models.py
from django.db import models
from django.utils import timezone
from django_ckeditor_5.fields import CKEditor5Field
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFit

# --- Модель InfoPanel (без изменений) ---
class InfoPanel(models.Model):
    name = models.CharField("Название", max_length=50)
    color = models.CharField("Цвет фона (HEX, например #FF0000)", max_length=7, default="#444444")
    text_color = models.CharField("Цвет текста (HEX, например #FFFFFF)", max_length=7, default="#FFFFFF")

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
    functionality = models.JSONField("Функционал", default=dict, blank=True, help_text="Ключевые особенности...")
    characteristics = models.JSONField("Тех. характеристики", default=dict, blank=True, help_text="Физические и технические данные...")
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
    shop_name = models.CharField("Название магазина", max_length=100, default="Мой Магазин")
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