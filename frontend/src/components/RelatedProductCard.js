// frontend/src/components/RelatedProductCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import './RelatedProductCard.css';

const RelatedProductCard = ({ product }) => {
    // Используем новое поле
    const imageUrl = product.main_image_thumbnail_url;

    return (
        <Link to={`/product/${product.id}`} className="related-card">
            <div className="related-card-image-wrapper">
                {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="related-card-image" />
                ) : (
                    <div className="related-card-image-placeholder"></div>
                )}
            </div>
            <div className="related-card-info">
                <p className="related-card-name">{product.name}</p>
                <p className="related-card-price">{parseFloat(product.price).toFixed(0)} ₽</p>
            </div>
        </Link>
    );
};

export default RelatedProductCard;