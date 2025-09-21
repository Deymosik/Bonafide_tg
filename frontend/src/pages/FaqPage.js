// frontend/src/pages/FaqPage.js

import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import AccordionItem from '../components/AccordionItem';
import { useSettings } from '../context/SettingsContext';
import InfoCarousel from '../components/InfoCarousel';
import './FaqPage.css';

const FaqPage = () => {
    const [faqItems, setFaqItems] = useState([]);
    const [loadingFaq, setLoadingFaq] = useState(true);
    const settings = useSettings();

    // 1. По умолчанию открываем вкладку "О нас"
    const [activeTab, setActiveTab] = useState('about');

    useEffect(() => {
        // Загрузка вопросов остается без изменений
        apiClient.get(`/faq/`)
            .then(response => {
                setFaqItems(response.data);
            })
            .catch(error => console.error("Ошибка при загрузке FAQ:", error))
            .finally(() => setLoadingFaq(false));
    }, []);

    // 2. Убираем "Вопросы" из массива вкладок
    const tabs = [
        { id: 'about', title: 'О нас' },
        { id: 'delivery', title: 'Доставка' },
        { id: 'warranty', title: 'Гарантия' },
    ];

    const SectionContent = ({ content }) => {
        if (!content) return <p className="info-section-placeholder">Информация скоро появится.</p>;
        return <div className="info-section-content" dangerouslySetInnerHTML={{ __html: content }} />;
    };

    return (
        <div className="faq-page sticky-top-safe">

            {/* Блок с переключателем и контентом вкладок */}
            <div className="info-tabs-section">
                <div className="segmented-control">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`segment-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.title}
                        </button>
                    ))}
                </div>

                <div className="content-container">
                    {activeTab === 'about' && (
                        <div className="content-tab active" key="about">
                            <InfoCarousel images={settings.images} />
                            <SectionContent content={settings.about_us_section} />
                        </div>
                    )}
                    {activeTab === 'delivery' && (
                        <div className="content-tab active" key="delivery">
                            <SectionContent content={settings.delivery_section} />
                        </div>
                    )}
                    {activeTab === 'warranty' && (
                        <div className="content-tab active" key="warranty">
                            <SectionContent content={settings.warranty_section} />
                        </div>
                    )}
                </div>
            </div>

            {/* 3. БЛОК С FAQ ТЕПЕРЬ НАХОДИТСЯ ЗДЕСЬ, ОТДЕЛЬНО И ВСЕГДА ВИДИМ */}
            <div className="faq-accordion-section">
                <h2 className="info-section-title">Частые вопросы</h2>
                {loadingFaq ? (
                    <div className="faq-list">
                        {[...Array(4)].map((_, i) => <div key={i} className="faq-skeleton"></div>)}
                    </div>
                ) : faqItems.length > 0 ? (
                    <div className="faq-list">
                        {faqItems.map(item => (
                            <AccordionItem key={item.id} title={item.question}>
                                <div dangerouslySetInnerHTML={{ __html: item.answer }} />
                            </AccordionItem>
                        ))}
                    </div>
                ) : (
                    <p className="info-section-placeholder">Пока здесь нет частых вопросов.</p>
                )}
            </div>

            {/* Блок с контактами остается в конце */}
            <div className="contacts-section">
                <h2 className="info-section-title">Остались вопросы?</h2>
                <div className="contacts-content">
                    <p>Свяжитесь с нашим менеджером в Telegram для быстрой консультации.</p>
                    <a
                        href={`https://t.me/${settings.manager_username}`}
                        className="contact-button"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Написать менеджеру
                    </a>
                </div>
            </div>
        </div>
    );
};

export default FaqPage;