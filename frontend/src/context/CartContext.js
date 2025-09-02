// frontend/src/context/CartContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api';


export const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    // 1. СОЗДАЕМ ОТДЕЛЬНОЕ СОСТОЯНИЕ ДЛЯ КОЛИЧЕСТВА ТОВАРОВ
    const [totalItems, setTotalItems] = useState(0);

    const [discountInfo, setDiscountInfo] = useState({
        subtotal: 0,
        discount_amount: 0,
        final_total: 0,
        applied_rule: null,
        upsell_hint: null
    });

    // 2. ОБНОВЛЯЕМ КОЛИЧЕСТВО КАЖДЫЙ РАЗ, КОГДА МЕНЯЕТСЯ КОРЗИНА
    useEffect(() => {
        // Рассчитываем общее количество товаров
        const newTotalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        setTotalItems(newTotalItems); // Обновляем состояние

        // Отправляем запрос на расчет скидки (эта логика остается)
        if (cartItems.length === 0) {
            setDiscountInfo({ subtotal: 0, discount_amount: 0, final_total: 0, applied_rule: null, upsell_hint: null });
            return;
        }
        const itemsToCalculate = cartItems.map(item => ({ id: item.id, quantity: item.quantity }));
        apiClient.post('/calculate-cart/', { cartItems: itemsToCalculate })
            .then(response => setDiscountInfo(response.data))
            .catch(error => console.error("Ошибка при расчете корзины:", error));

    }, [cartItems]);

    const addToCart = (product) => {
        setCartItems(prevItems => {
            const exist = prevItems.find(item => item.id === product.id);
            if (exist) {
                return prevItems.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId, quantity) => {
        setCartItems(prevItems => {
            if (quantity <= 0) {
                return prevItems.filter(item => item.id !== productId);
            }
            return prevItems.map(item =>
                item.id === productId ? { ...item, quantity } : item
            );
        });
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const value = {
        cartItems,
        addToCart,
        updateQuantity,
        clearCart,
        discountInfo,
        totalItems // 3. ПЕРЕДАЕМ НАШЕ НОВОЕ, НАДЕЖНОЕ СОСТОЯНИЕ
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};