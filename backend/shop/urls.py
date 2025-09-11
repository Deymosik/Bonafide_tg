# backend/shop/urls.py
from django.urls import path
from .views import (
    ProductListView, ProductDetailView, CategoryListView, PromoBannerListView,
    ShopSettingsView, FaqListView, DealOfTheDayView, CartView, CalculateSelectionView,
    OrderCreateView # <-- ДОБАВИТЬ ИМПОРТ
)

urlpatterns = [
    # 2. ДОБАВЛЯЕМ НОВЫЙ ПУТЬ
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('banners/', PromoBannerListView.as_view(), name='banner-list'),
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('settings/', ShopSettingsView.as_view(), name='shop-settings'),
    path('faq/', FaqListView.as_view(), name='faq-list'),
    path('deal-of-the-day/', DealOfTheDayView.as_view(), name='deal-of-the-day'),
    path('cart/', CartView.as_view(), name='cart-detail'),
    path('calculate-selection/', CalculateSelectionView.as_view(), name='calculate-selection'),
    path('orders/create/', OrderCreateView.as_view(), name='order-create'),
]