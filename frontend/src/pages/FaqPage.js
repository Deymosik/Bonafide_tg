// frontend/src/pages/FaqPage.js
import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import FaqItem from '../components/FaqItem';
import { useSettings } from '../context/SettingsContext';
import InfoCarousel from '../components/InfoCarousel';
import './FaqPage.css';

const FaqPage = () => {
    const [faqItems, setFaqItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const settings = useSettings();

    useEffect(() => {
        apiClient.get(`/faq/`)
            .then(response => {
                setFaqItems(response.data);
            })
            .catch(error => console.error("Ошибка при загрузке FAQ:", error))
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Компонент для рендеринга секций остается, но теперь он будет внутри карточки
    const InfoSection = ({ title, content, isCard = true }) => {
        if (!content) return null;

        const contentHtml = <div className="info-section-content" dangerouslySetInnerHTML={{ __html: content }} />;

        if (!isCard) {
            return (
                <div className="info-section">
                    <h2 className="info-section-title">{title}</h2>
                    {contentHtml}
                </div>
            )
        }

        return (
            <div className="info-card">
                <h2 className="info-section-title">{title}</h2>
                {contentHtml}
            </div>
        );
    };

    return (
        <div className="faq-page">
            <h1 className="faq-title">Информация</h1>

            <InfoCarousel images={settings.images} />

            <div className="info-grid">
                {/* Рендерим наши информационные блоки как карточки */}
                <InfoSection title="О нас" content={settings.about_us_section} />
                <InfoSection title="Условия доставки" content={settings.delivery_section} />
                <InfoSection title="Гарантия и возврат" content={settings.warranty_section} />

                {(settings.contact_phone || settings.manager_username) && (
                    <div className="info-card">
                        <h2 className="info-section-title">Контакты</h2>
                        <div className="info-section-content contact-section">
                            {settings.contact_phone && (
                                <p><strong>Телефон:</strong> {settings.contact_phone}</p>
                            )}
                            {settings.manager_username && (
                                <p><strong>Поддержка:</strong> <a href={`https://t.me/${settings.manager_username}`}>@{settings.manager_username}</a></p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {(loading || faqItems.length > 0) && (
                <div className="faq-section">
                    <h2 className="faq-section-title">Частые вопросы</h2>
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