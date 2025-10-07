// frontend/src/pages/CartPage.js
import React, { useEffect } from 'react';
import { useCart, MAX_QUANTITY  } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../utils/telegram';
import { useSettings } from '../context/SettingsContext';
import FreeShippingProgressBar from '../components/FreeShippingProgressBar';
import LottieAnimation from '../components/LottieAnimation';
import { ReactComponent as CheckIcon } from '../assets/check-icon.svg';
import { ReactComponent as TrashIcon } from '../assets/clear-cart-icon.svg';
import defaultCartAnimation from '../assets/lottie/empty-cart.json';
import './CartPage.css';

const CustomCheckbox = ({ checked, onChange }) => (
    <div className={`custom-checkbox ${checked ? 'checked' : ''}`} onClick={onChange}>
        <CheckIcon />
    </div>
);

const CartPage = () => {
    const tg = useTelegram();
    const navigate = useNavigate();

    // --- ИСПРАВЛЕНИЕ: Получаем ОДИН объект selectionInfo ---
    const {
        cartItems,
        updateQuantity,
        selectedItems,
        toggleItemSelection,
        toggleSelectAll,
        deleteSelectedItems,
        selectionInfo // Используем только этот объект для всех расчетов
    } = useCart();

    const settings = useSettings();

    const formatPrice = (priceString) => {
        // Преобразуем строку в число и проверяем, равно ли оно нулю
        if (parseFloat(priceString) === 0) {
            return '0';
        }
        // Если число не ноль, возвращаем исходную строку (которая может содержать копейки)
        return priceString;
    };

    useEffect(() => {
        // Проверяем, есть ли куда возвращаться в истории.
        // window.history.length > 2 означает, что есть что-то до страницы корзины
        // (учитывая, что начальная страница - это первая запись).
        if (window.history.length > 2) {
            tg.BackButton.show();
            const handleBackButtonClick = () => navigate(-1); // Просто "назад"
            tg.BackButton.onClick(handleBackButtonClick);

            return () => {
                tg.BackButton.offClick(handleBackButtonClick);
                if (tg.BackButton.isVisible) {
                    tg.BackButton.hide();
                }
            };
        } else {
            // Если возвращаться некуда (например, пользователь открыл приложение сразу по ссылке на корзину),
            // кнопку не показываем.
            tg.BackButton.hide();
        }
    }, [navigate, tg]);

    // Рендер пустой корзины (без изменений)
    if (cartItems.length === 0) {
        return (
            <div className="cart-page empty">
                <LottieAnimation
                    src={settings.cart_lottie_url}
                    animationData={defaultCartAnimation}
                />
                <h2 className="empty-cart-title">Ваша корзина пуста</h2>
                <p className="empty-cart-subtitle">Похоже, вы еще ничего не добавили. Давайте это исправим!</p>
                <button className="empty-cart-button" onClick={() => navigate('/')}>
                    Перейти в каталог
                </button>
            </div>
        );
    }

    return (
        <div className="cart-page sticky-top-safe">

            <div className="cart-actions-header">
                <div className="select-all-container" onClick={toggleSelectAll}>
                    <CustomCheckbox
                        checked={cartItems.length > 0 && selectedItems.size === cartItems.length}
                    />
                    <span>Выбрать все</span>
                </div>
                <div className="action-buttons">
                    {selectedItems.size > 0 && (
                        <button onClick={deleteSelectedItems} title="Удалить выбранное">
                            <TrashIcon />
                        </button>
                    )}
                </div>
            </div>

            {/* --- ИСПРАВЛЕНИЕ: Используем subtotal из selectionInfo --- */}
            <FreeShippingProgressBar
                currentAmount={parseFloat(selectionInfo.subtotal)}
                threshold={parseFloat(settings.free_shipping_threshold)}
            />

            <div className="cart-items">
                {cartItems.map(item => (
                    <div key={item.id} className="cart-item">
                        {/* 1. Создаем новый контейнер для верхней части (картинка + инфо) */}
                        <div className="cart-item-main">
                            <div className="cart-item-image-container">
                                <CustomCheckbox
                                    checked={selectedItems.has(item.product.id)}
                                    onChange={() => toggleItemSelection(item.product.id)}
                                />
                                <img src={item.product.main_image_thumbnail_url} alt={item.product.name}
                                     className="cart-item-img"/>
                            </div>
                            <div className="cart-item-info">
                                {/* Название теперь может занимать несколько строк */}
                                <div className="cart-item-name">{item.product.name}</div>
                                <div className="cart-item-price-container">
                                    {item.discounted_price ? (
                                        <>
                                            <span
                                                className="new-price">{parseFloat(item.discounted_price).toFixed(0)} ₽</span>
                                            <span
                                                className="old-price">{parseFloat(item.original_price).toFixed(0)} ₽</span>
                                        </>
                                    ) : (
                                        <span
                                            className="normal-price">{parseFloat(item.original_price).toFixed(0)} ₽</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Блок с количеством теперь находится отдельно, внизу */}
                        <div className="cart-item-controls">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>−</button>
                            <span>{item.quantity}</span>
                            <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                disabled={item.quantity >= MAX_QUANTITY}
                            >
                                +
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="sticky-footer">
                {/* --- ИСПРАВЛЕНИЕ: Используем upsell_hint из selectionInfo --- */}
                {selectionInfo.upsell_hint && (
                    <div className="upsell-hint">
                        ✨ {selectionInfo.upsell_hint}
                    </div>
                )}

                <div className="order-summary">
                    <div className="summary-row">
                        <span>Товары</span>
                        <span>{formatPrice(selectionInfo.subtotal)} ₽</span>
                    </div>
                    {parseFloat(selectionInfo.discount_amount) > 0 && (
                        <div className="summary-row discount">
                            <span>Скидка ({selectionInfo.applied_rule || 'Ваша скидка'})</span>
                            {/* ИЗМЕНЕНИЕ: Применяем нашу новую функцию */}
                            <span>- {formatPrice(selectionInfo.discount_amount)} ₽</span>
                        </div>
                    )}

                    <div className="summary-row final-total">
                        <span>Итого к оплате</span>
                        <span>{formatPrice(selectionInfo.final_total)} ₽</span>
                    </div>
                </div>

                <button
                    className="checkout-btn"
                    onClick={() => navigate('/checkout')}
                    disabled={selectedItems.size === 0}
                >
                    {selectedItems.size > 0 ? `Перейти к оформлению` : 'Выберите товары'}
                </button>
            </div>
        </div>
    );
};

export default CartPage;