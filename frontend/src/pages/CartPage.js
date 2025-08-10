// frontend/src/pages/CartPage.js

import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../utils/telegram';
import { useSettings } from '../context/SettingsContext';
import FreeShippingProgressBar from '../components/FreeShippingProgressBar';
import LottieAnimation from '../components/LottieAnimation';
import { ReactComponent as ClearCartIcon } from '../assets/clear-cart-icon.svg';

import './CartPage.css';

const CartPage = () => {
    const tg = useTelegram();
    const navigate = useNavigate();
    const { cartItems, updateQuantity, clearCart, discountInfo } = useCart();
    const settings = useSettings();

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: tg.initDataUnsafe.user?.first_name ?? '',
        phone: '',
        address: '',
        shipping: 'Почта'
    });

    const isFormValid = formData.name && formData.phone && formData.address;

    useEffect(() => {
        tg.BackButton.show();
        const handleBackButtonClick = () => {
            if (showForm) {
                setShowForm(false);
            } else {
                navigate(-1);
            }
        };
        tg.BackButton.onClick(handleBackButtonClick);

        return () => {
            tg.BackButton.offClick(handleBackButtonClick);
            tg.BackButton.hide();
        };
    }, [navigate, showForm, tg]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckout = () => {
        // --- НАЧАЛО ИЗМЕНЕНИЙ ---

        // 1. Проверяем, достигнут ли порог бесплатной доставки
        const threshold = parseFloat(settings.free_shipping_threshold);
        const subtotal = parseFloat(discountInfo.subtotal);
        const isFreeShipping = threshold > 0 && subtotal >= threshold;

        const orderDetails = cartItems.map(item =>
            `${item.name} (x${item.quantity})`
        ).join('\n');

        // 2. Формируем строку о доставке
        const shippingInfo = isFreeShipping
            ? `**Доставка:** ${formData.shipping} (БЕСПЛАТНО)`
            : `**Доставка:** ${formData.shipping}, ${formData.address}`;

        const summary = `
-----------------
Сумма: ${discountInfo.subtotal} ₽
Скидка (${discountInfo.applied_rule || 'нет'}): ${discountInfo.discount_amount} ₽
**Итого к оплате: ${discountInfo.final_total} ₽**
        `.trim();

        const fullMessage = `
Привет! Хочу сделать заказ.

**Клиент:** ${formData.name}
**Телефон:** ${formData.phone}
${shippingInfo}

**Состав заказа:**
${orderDetails}

${summary}
        `.trim();

        // --- КОНЕЦ ИЗМЕНЕНИЙ ---

        const managerUsername = settings.manager_username || 'username';
        const encodedText = encodeURIComponent(fullMessage);
        const telegramLink = `https://t.me/${managerUsername}?text=${encodedText}`;

        tg.openTelegramLink(telegramLink);
        tg.close();
    };

    if (cartItems.length === 0 && !showForm) {
        return (
            <div className="cart-page empty">
                <LottieAnimation src={settings.cart_lottie_url} />
                <h2 className="empty-cart-title">Ваша корзина пуста</h2>
                <p className="empty-cart-subtitle">Похоже, вы еще ничего не добавили. Давайте это исправим!</p>
                <button className="empty-cart-button" onClick={() => navigate('/')}>
                    Перейти в каталог
                </button>
            </div>
        );
    }

    return (
        <div className="cart-page">
            {!showForm ? (
                <>
                    <div className="cart-header">
                        <h1>Корзина</h1>
                        <button className="clear-cart-btn" onClick={clearCart} title="Очистить корзину">
                            <ClearCartIcon />
                        </button>
                    </div>

                    <FreeShippingProgressBar
                        currentAmount={parseFloat(discountInfo.subtotal)}
                        threshold={parseFloat(settings.free_shipping_threshold)}
                    />

                    <div className="cart-items">
                        {cartItems.map(item => (
                            <div key={item.id} className="cart-item">
                                <img src={item.main_image_thumbnail_url} alt={item.name} className="cart-item-img" />
                                <div className="cart-item-info">
                                    <div className="cart-item-name">{item.name}</div>
                                    <div className="cart-item-price">{parseFloat(item.price).toFixed(0)} ₽</div>
                                </div>
                                <div className="cart-item-controls">
                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="sticky-footer">
                        {discountInfo.upsell_hint && (
                            <div className="upsell-hint">
                                ✨ {discountInfo.upsell_hint}
                            </div>
                        )}

                        <div className="order-summary">
                            <div className="summary-row">
                                <span>Товары</span>
                                <span>{discountInfo.subtotal} ₽</span>
                            </div>
                            {parseFloat(discountInfo.discount_amount) > 0 && (
                                <div className="summary-row discount">
                                    <span>Скидка ({discountInfo.applied_rule || 'Ваша скидка'})</span>
                                    <span>- {discountInfo.discount_amount} ₽</span>
                                </div>
                            )}
                            <div className="summary-row final-total">
                                <span>Итого</span>
                                <span>{discountInfo.final_total} ₽</span>
                            </div>
                        </div>

                        <button className="checkout-btn" onClick={() => setShowForm(true)}>
                            Оформить заказ
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <h1 className="form-title">Оформление</h1>
                    <form className="checkout-form" onSubmit={(e) => e.preventDefault()}>
                        <input type="text" name="name" placeholder="ФИО" value={formData.name} onChange={handleInputChange} required />
                        <input type="tel" name="phone" placeholder="Номер телефона" value={formData.phone} onChange={handleInputChange} required />
                        <input type="text" name="address" placeholder="Адрес доставки (Город, улица, дом, квартира, индекс)" value={formData.address} onChange={handleInputChange} required />
                        <div className="shipping-options">
                            <label className={formData.shipping === 'Почта' ? 'active' : ''}>
                                <input type="radio" name="shipping" value="Почта" checked={formData.shipping === 'Почта'} onChange={handleInputChange} />
                                Почта
                            </label>
                            <label className={formData.shipping === 'СДЭК' ? 'active' : ''}>
                                <input type="radio" name="shipping" value="СДЭК" checked={formData.shipping === 'СДЭК'} onChange={handleInputChange} />
                                СДЭК
                            </label>
                        </div>
                    </form>
                    <div className="sticky-footer">
                        <button className="checkout-btn" onClick={handleCheckout} disabled={!isFormValid}>
                            Готово
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default CartPage;