// frontend/src/context/CartContext.js

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import apiClient from '../api';
import { useTelegram } from '../utils/telegram';
import debounce from 'lodash.debounce';

export const CartContext = createContext();
export const useCart = () => useContext(CartContext);
export const MAX_QUANTITY = 10;

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState(new Set());

    // ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ ДЛЯ РАСЧЕТОВ
    const [selectionInfo, setSelectionInfo] = useState({
        subtotal: '0.00',
        discount_amount: '0.00',
        final_total: '0.00',
        applied_rule: null,
        upsell_hint: null,
    });

    // Используем tg из хука. Важно, что хук возвращает либо объект tg, либо заглушку.
    const tg = useTelegram();
    const userId = tg?.initDataUnsafe?.user?.id;


    // --- 2. ФУНКЦИЯ ДИНАМИЧЕСКОГО РАСЧЕТА С DEBOUNCE ---
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const calculateSelection = useCallback(debounce(async (selection) => {
        try {
            const response = await apiClient.post('/calculate-selection/', { selection });
            setSelectionInfo(response.data);
        } catch (error) {
            console.error("Ошибка при расчете выбора:", error);
        }
    }, 300), []); // Задержка в 300 мс

    // Функция для обновления состояния из ответа сервера (без изменений)
    const updateStateFromServer = (data) => {
        if (data && data.items) {
            // Мы больше НЕ преобразуем `data.items`.
            // Бэкенд уже отдает их в идеальном виде.
            // Просто сохраняем их в состояние "как есть".
            setCartItems(data.items);

            // Остальная логика остается, но она работает с `data`, а не с `formattedItems`
            const allItemIds = new Set(data.items.map(item => item.product.id)); // <-- Исправлено
            setSelectedItems(allItemIds);

            const newTotalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
            setTotalItems(newTotalItems);

            // Информация о скидках теперь приходит в корне ответа API,
            // поэтому мы можем ее просто "пробросить" дальше.
            // Для этого создадим отдельное состояние.
            setSelectionInfo({ // <-- Используем новое состояние
                subtotal: data.subtotal,
                discount_amount: data.discount_amount,
                final_total: data.final_total,
                applied_rule: data.applied_rule,
                upsell_hint: data.upsell_hint,
            });

        } else {
            setCartItems([]);
            setSelectedItems(new Set());
            setSelectionInfo({ // Сбрасываем расчеты при пустой корзине
                subtotal: '0.00',
                discount_amount: '0.00',
                final_total: '0.00',
                applied_rule: null,
                upsell_hint: null
            });
        }

        // Обновляем общее количество товаров (это можно оставить)
        const newTotalItems = (data?.items || []).reduce((sum, item) => sum + item.quantity, 0);
        setTotalItems(newTotalItems);
    };

    useEffect(() => {
        if (cartItems.length > 0) {
            const selection = cartItems
                .filter(item => selectedItems.has(item.product.id))
                .map(item => ({ product_id: item.product.id, quantity: item.quantity }));

            calculateSelection(selection);
        } else {
            // Если корзина пуста, сбрасываем расчеты
            setSelectionInfo({ subtotal: '0.00', discount_amount: '0.00', final_total: '0.00', applied_rule: null, upsell_hint: null });
        }
    }, [selectedItems, cartItems, calculateSelection]);

    // Загрузка корзины при запуске
    useEffect(() => {
        if (userId || process.env.NODE_ENV === 'development') {
            setLoading(true);
            apiClient.get('/cart/')
                .then(response => updateStateFromServer(response.data))
                .catch(error => console.error("Ошибка при загрузке корзины:", error))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // Обертка для запросов, чтобы избежать дублирования кода
    const handleCartAction = async (action) => {
        try {
            const response = await action();
            updateStateFromServer(response.data);
        } catch (error) {
            console.error("Ошибка при обновлении корзины:", error);
        }
    };

    const addToCart = (product) => {
        const existingItem = cartItems.find(item => item.product.id === product.id);
        const newQuantity = existingItem ? existingItem.quantity + 1 : 1;
        if (newQuantity > MAX_QUANTITY) return;
        handleCartAction(() => apiClient.post('/cart/', { product_id: product.id, quantity: newQuantity }));
    };

    // ИЗМЕНЕНИЕ: Полностью переработанная функция с валидацией
    const updateQuantity = (productId, quantity) => {
        // Правило №1: Если количество становится 0 или меньше, удаляем товар (quantity = 0)
        if (quantity < 1) {
            handleCartAction(() => apiClient.post('/cart/', { product_id: productId, quantity: 0 }));
            return;
        }

        // Правило №2: Если количество превышает максимум, ничего не делаем
        if (quantity > MAX_QUANTITY) {
            // Можно добавить уведомление для пользователя, если нужно
            console.warn(`Attempted to set quantity for product ${productId} to ${quantity}, which is over the limit of ${MAX_QUANTITY}.`);
            return;
        }

        // Если все проверки пройдены, отправляем запрос на обновление
        handleCartAction(() => apiClient.post('/cart/', { product_id: productId, quantity: quantity }));
    };

    const toggleItemSelection = (productId) => {
        setSelectedItems(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(productId)) {
                newSelected.delete(productId);
            } else {
                newSelected.add(productId);
            }
            return newSelected;
        });
    };

    // Выбрать/снять выбор со всех
    const toggleSelectAll = () => {
        setSelectedItems(prevSelected => {
            // Если выбраны не все, то выбрать все. Иначе - очистить.
            if (prevSelected.size < cartItems.length) {
                return new Set(cartItems.map(item => item.product.id));
            } else {
                return new Set();
            }
        });
    };

    // Удалить выбранные товары
    const deleteSelectedItems = () => {
        const product_ids = Array.from(selectedItems);
        // Используем новый DELETE-метод нашего API
        handleCartAction(() => apiClient.delete('/cart/', { data: { product_ids } }));
        // Очищаем выбор после удаления
        setSelectedItems(new Set());
    };

    const clearCart = () => {
        cartItems.forEach(item => {
            handleCartAction(() => apiClient.post('/cart/', { product_id: item.product.id, quantity: 0 }));
        });
    };

    const value = {
        cartItems,
        totalItems,
        loading,
        selectedItems,
        selectionInfo, // --- 5. ПЕРЕДАЕМ НОВЫЕ ДАННЫЕ ВМЕСТО СТАРЫХ ---
        addToCart,
        updateQuantity,
        toggleSelectAll,
        toggleItemSelection,
        deleteSelectedItems,
        clearCart,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};