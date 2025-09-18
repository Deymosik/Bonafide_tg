// frontend/src/components/ProductCard.js
import React from 'react';
import './ProductCard.css';

const ProductCard = ({ product }) => {

    const imageUrl = product.main_image_thumbnail_url;
    const price = parseFloat(product.price);
    const regularPrice = parseFloat(product.regular_price);
    const hasDiscount = regularPrice > price;

    return (
        <div className="product-card">
            <div className="product-image-container">
                {/*
                  2. Проверяем, существует ли imageUrl. Если да - показываем картинку.
                  Это защищает приложение от ошибок, если у какого-то товара по какой-то причине нет картинки.
                */}
                {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="product-image" />
                ) : (
                    // Если картинки нет, показываем нейтральный серый плейсхолдер.
                    <div className="product-image-placeholder"></div>
                )}
                {/* Блок с инфо-панельками остается без изменений */}
                <div className="info-panels">
                    {(product.info_panels || []).map(panel => (
                        <span key={panel.name} className="info-panel" style={{ backgroundColor: panel.color, color: panel.text_color }}>
                            {panel.name}
                        </span>
                    ))}
                </div>
            </div>

            <div className="product-info">
                <h3 className="product-name">{product.name}</h3>

                <div className="price-container">
                    {hasDiscount ? (
                        <>
                            <span className="price-current">{price.toFixed(0)} ₽</span>
                            <span className="price-old">{regularPrice.toFixed(0)} ₽</span>
                        </>
                    ) : (
                        <span className="price-regular">{regularPrice.toFixed(0)} ₽</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductCard;