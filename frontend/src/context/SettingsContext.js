// frontend/src/context/SettingsContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api';


const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({ shop_name: 'Ждём...' });

    useEffect(() => {
        apiClient.get(`/settings/`)
            .then(response => {
                setSettings(response.data);
            })
            .catch(error => {
                console.error("Ошибка при загрузке настроек магазина:", error);
                setSettings({ shop_name: 'Мой Магазин' }); // Запасное название в случае ошибки
            });
    }, []);

    return (
        <SettingsContext.Provider value={settings}>
            {children}
        </SettingsContext.Provider>
    );
};