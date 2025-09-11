// frontend/src/pages/CheckoutForm.js

import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useTelegram } from '../utils/telegram';
import { useSettings } from '../context/SettingsContext';
import './CartPage.css';

const CheckoutForm = ({ onBack }) => {
    const tg = useTelegram();
    const settings = useSettings();

    // --- ИСПРАВЛЕНИЕ: Получаем selectionInfo вместо selectionTotals ---
    const { cartItems, selectedItems, selectionInfo } = useCart();

    const [formData, setFormData] = useState({
        name: tg.initDataUnsafe?.user?.first_name ?? '',
        phone: '',
        address: '',
        shipping: 'Почта'
    });

    const isFormValid = formData.name && formData.phone && formData.address;

    // Эффект для кнопки "Назад" (без изменений)
    useEffect(() => {
        tg.BackButton.show();
        tg.BackButton.onClick(onBack);
        return () => {
            tg.BackButton.offClick(onBack);
        };
    }, [onBack, tg]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckout = () => {
        const itemsToOrder = cartItems.filter(item => selectedItems.has(item.product.id));
        const orderDetails = itemsToOrder.map(item =>
            `${item.product.name} (x${item.quantity})`
        ).join('\n');

        // --- ИСПРАВЛЕНИЕ: Используем данные из selectionInfo ---
        const summary = `
    -----------------
    Сумма: ${selectionInfo.subtotal} ₽
    Скидка (${selectionInfo.applied_rule || 'нет'}): ${selectionInfo.discount_amount} ₽
    **Итого к оплате: ${selectionInfo.final_total} ₽**
            `.trim();

        const fullMessage = `
    Привет! Хочу сделать заказ.

    **Клиент:** ${formData.name}
    **Телефон:** ${formData.phone}
    **Доставка:** ${formData.shipping}, ${formData.address}

    **Состав заказа:**
    ${orderDetails}

    ${summary}
            `.trim();

        const managerUsername = settings.manager_username || 'username';
        const encodedText = encodeURIComponent(fullMessage);
        const telegramLink = `https://t.me/${managerUsername}?text=${encodedText}`;

        tg.openTelegramLink(telegramLink);
        tg.close();
    };

    return (
        <div className="cart-page">
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
        </div>
    );
};

export default CheckoutForm;