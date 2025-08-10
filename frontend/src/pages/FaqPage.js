// frontend/src/pages/FaqPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import apiClient from '../api';
import FaqItem from '../components/FaqItem';
import { useSettings } from '../context/SettingsContext'; // 1. Импортируем хук настроек
import './FaqPage.css';
import InfoCarousel from '../components/InfoCarousel';


const FaqPage = () => {
    const [faqItems, setFaqItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const settings = useSettings(); // 2. Получаем все настройки магазина

    useEffect(() => {
        apiClient.get(`/faq/`)
            .then(response => {
                setFaqItems(response.data);
            })
            .catch(error => {
                console.error("Ошибка при загрузке FAQ:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // 3. Создаем "умный" компонент для рендеринга секций, чтобы не дублировать код
    const InfoSection = ({ title, content }) => {
        // Не рендерим секцию, если контент пустой
        if (!content) return null;
        return (
            <div className="info-section">
                <h2 className="info-section-title">{title}</h2>
                <div
                    className="info-section-content"
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </div>
        );
    };

    return (
        <div className="faq-page">
            <h1 className="faq-title">Информация</h1>
            <InfoCarousel images={settings.images} />
            {/* 4. Рендерим наши новые информационные блоки */}
            <InfoSection title="О нас" content={settings.about_us_section} />
            <InfoSection title="Условия доставки" content={settings.delivery_section} />
            <InfoSection title="Гарантия и возврат" content={settings.warranty_section} />

            {/* Рендерим блок контактов, только если есть телефон */}
            {settings.contact_phone && (
                <div className="info-section">
                    <h2 className="info-section-title">Контакты</h2>
                    <div className="info-section-content">
                        <p><strong>Телефон:</strong> {settings.contact_phone}</p>
                        <p><strong>Поддержка в Telegram:</strong> <a href={`https://t.me/${settings.manager_username}`}>@{settings.manager_username}</a></p>
                    </div>
                </div>
            )}


            {/* Рендерим блок с вопросами, только если они есть */}
            {(loading || faqItems.length > 0) && (
                <div className="faq-section">
                    <h2 className="info-section-title">Частые вопросы</h2>
                    {loading ? (
                        <div className="faq-list">
                            {[...Array(3)].map((_, i) => <div key={i} className="faq-skeleton"></div>)}
                        </div>
                    ) : (
                        <div className="faq-list">
                            {faqItems.map(item => (
                                <FaqItem key={item.id} question={item.question} answer={item.answer} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FaqPage;