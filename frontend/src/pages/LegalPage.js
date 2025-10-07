// проект/frontend/src/pages/LegalPage.js

import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useTelegram } from '../utils/telegram';
import './LegalPage.css'; // Создадим этот файл на следующем шаге

const LegalPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const tg = useTelegram();
    const settings = useSettings();

    // Определяем, какой документ показывать, на основе URL
    const isPrivacyPage = location.pathname.includes('/privacy');
    const content = isPrivacyPage ? settings.privacy_policy : settings.public_offer;
    const title = isPrivacyPage ? 'Политика конфиденциальности' : 'Публичная оферта';

    // Показываем и настраиваем кнопку "Назад"
    useEffect(() => {
        tg.BackButton.show();
        const handleBackClick = () => navigate(-1);
        tg.BackButton.onClick(handleBackClick);

        return () => {
            tg.BackButton.offClick(handleBackClick);
            tg.BackButton.hide();
        };
    }, [tg, navigate]);

    return (
        <div className="legal-page">
            <h1 className="legal-title">{title}</h1>
            <div className="legal-content">
                {content ? (
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                ) : (
                    <p>Информация загружается...</p>
                )}
            </div>
        </div>
    );
};

export default LegalPage;