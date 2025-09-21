// проект/frontend/src/components/PromoCarouselSkeleton.js

import React from 'react';
import './PromoCarouselSkeleton.css';

// Количество плашек-скелетонов, которое будет отображаться
const SKELETON_COUNT = 4;

const PromoCarouselSkeleton = () => {
    return (
        <div className="promo-carousel-skeleton-container">
            {/* Создаем массив из N элементов и рендерим по нему скелетоны */}
            {[...Array(SKELETON_COUNT)].map((_, index) => (
                <div key={index} className="promo-card-skeleton"></div>
            ))}
        </div>
    );
};

export default PromoCarouselSkeleton;