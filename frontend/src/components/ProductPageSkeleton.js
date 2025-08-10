// frontend/src/components/ProductPageSkeleton.js
import React from 'react';
import './ProductPageSkeleton.css'; // Стили для этого компонента

const ProductPageSkeleton = () => {
    return (
        <div className="skeleton-product-page">
            {/* Скелетон для слайдера */}
            <div className="skeleton-item skeleton-slider"></div>

            <div className="skeleton-product-details">
                {/* Скелетон для заголовка */}
                <div className="skeleton-item skeleton-line skeleton-h1"></div>

                {/* Скелетон для палитры цветов (несколько маленьких квадратов) */}
                <div className="skeleton-swatches">
                    <div className="skeleton-item skeleton-swatch"></div>
                    <div className="skeleton-item skeleton-swatch"></div>
                    <div className="skeleton-item skeleton-swatch"></div>
                </div>

                {/* Скелетон для цены */}
                <div className="skeleton-item skeleton-line skeleton-price-main"></div>

                {/* Скелетон для нескольких строк описания */}
                <div className="skeleton-item skeleton-line"></div>
                <div className="skeleton-item skeleton-line" style={{ width: '90%' }}></div>
                <div className="skeleton-item skeleton-line" style={{ width: '70%' }}></div>
            </div>
        </div>
    );
};

export default ProductPageSkeleton;