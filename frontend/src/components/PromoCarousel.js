// frontend/src/components/PromoCarousel.js
import React from 'react';
import { useTelegram } from '../utils/telegram';
import './PromoCarousel.css';

const PromoCarousel = ({ banners }) => {
    const tg = useTelegram();

    const handleClick = (url) => {
        if (url) {
            // Используем нативный метод Telegram для открытия ссылок
            tg.openLink(url);
        }
    };

    // Если баннеров нет, не рендерим компонент
    if (!banners || banners.length === 0) {
        return null;
    }

    return (
        <div className="promo-carousel-container sticky-top-safe">
            {banners.map(banner => {
                // 1. ГЛАВНОЕ ИЗМЕНЕНИЕ: Используем новое поле 'image_url' от API.
                // Оно содержит ссылку на легкое, сжатое webp-превью.
                const imageUrl = banner.image_url;

                return (
                    <div
                        key={banner.id}
                        // Добавляем проверку, чтобы карточка была кликабельной, только если есть ссылка
                        className={`promo-card ${banner.link_url ? 'clickable' : ''}`}
                        onClick={() => handleClick(banner.link_url)}
                        // 2. Используем imageUrl. Если его нет, фон будет пустым (обработается в CSS).
                        style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : 'none' }}
                    >
                        {/* Текст отображается, только если он есть */}
                        {banner.text_content && (
                            <p
                                className="promo-card-text"
                                style={{ color: banner.text_color }}
                            >
                                {banner.text_content}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default PromoCarousel;