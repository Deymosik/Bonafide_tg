// frontend/src/context/SettingsContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api';

// 1. ИЗМЕНЕНИЕ: Устанавливаем null как начальное значение по умолчанию.
// Это явно говорит нам, что данные еще не загружены.
const SettingsContext = createContext(null);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    // Добавляем проверку, чтобы убедиться, что контекст используется внутри провайдера
    if (context === null) {
        // Временное возвращение пустого объекта, чтобы старые компоненты не "упали"
        // во время короткой фазы загрузки.
        return {};
    }
    return context;
};

export const SettingsProvider = ({ children }) => {
    // 2. ИЗМЕНЕНИЕ: Разделяем состояния для данных и для статуса загрузки.
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get(`/settings/`)
            .then(response => {
                setSettings(response.data);
            })
            .catch(error => {
                console.error("Ошибка при загрузке настроек магазина:", error);
                // В случае ошибки можно установить базовые настройки, чтобы приложение не сломалось
                setSettings({ site_name: 'Мой Магазин' });
            })
            .finally(() => {
                // 3. ИЗМЕНЕНИЕ: В любом случае (успех или ошибка) выключаем флаг загрузки.
                setLoading(false);
            });
    }, []);

    // 4. ИЗМЕНЕНИЕ: КЛЮЧЕВАЯ ЛОГИКА.
    // Если данные еще загружаются, мы не рендерим остальное приложение.
    // Вместо этого можно показать глобальный прелоадер или просто пустой экран.
    if (loading) {
        // Можно вернуть красивый компонент-скелетон на весь экран,
        // но для начала достаточно просто ничего не показывать.
        return null;
    }

    // 5. ИЗМЕНЕНИЕ: Только когда loading станет false, мы рендерим Provider с данными
    // и дочерние компоненты (всё ваше приложение).
    return (
        <SettingsContext.Provider value={settings}>
            {children}
        </SettingsContext.Provider>
    );
};