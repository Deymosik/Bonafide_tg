// frontend/src/components/ProductCardSkeleton.js
import React from 'react';
import './ProductCardSkeleton.css';

const ProductCardSkeleton = () => {
    return (
        <div className="skeleton-product-card">
            {/* 1. Теперь блок с картинкой содержит в себе и панельку */}
            <div className="skeleton-image-container">
                <div className="skeleton-item skeleton-panel-on-image"></div>
            </div>
            <div className="skeleton-info">
                <div className="skeleton-item skeleton-title"></div>
                <div className="skeleton-item skeleton-price"></div>
            </div>
        </div>
    );
};

export default ProductCardSkeleton;