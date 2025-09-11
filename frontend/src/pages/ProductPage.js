// frontend/src/pages/ProductPage.js

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api';
import ProductGallery from '../components/ProductGallery'; // 1. Импортируем НОВЫЙ компонент галереи
import { useTelegram } from '../utils/telegram';
import RelatedProductCard from '../components/RelatedProductCard';
import { useCart } from '../context/CartContext';
import ProductPageSkeleton from '../components/ProductPageSkeleton';
import AccordionItem from '../components/AccordionItem';
import './ProductPage.css';

const ProductPage = () => {
    const { id: initialId } = useParams();
    const navigate = useNavigate();
    const tg = useTelegram();
    const { addToCart, cartItems, updateQuantity } = useCart();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSwitchingColor, setIsSwitchingColor] = useState(false);

    // Эта строка остается без изменений
    const itemInCart = cartItems.find(item => item && product && item.product.id === product.id);

    // Эта функция остается без изменений
    const fetchProductData = useCallback((id, isInitialLoad) => {
        if (isInitialLoad) {
            setLoading(true);
        } else {
            setIsSwitchingColor(true);
        }

        apiClient.get(`/products/${id}/`)
            .then(response => {
                setProduct(response.data);
                navigate(`/product/${id}`, { replace: true });
            })
            .catch(error => {
                console.error("Ошибка при загрузке товара:", error);
                setProduct(null);
            })
            .finally(() => {
                if (isInitialLoad) {
                    setLoading(false);
                }
                setIsSwitchingColor(false);
            });
    }, [navigate]);

    // Этот useEffect остается без изменений
    useEffect(() => {
        fetchProductData(initialId, true);

        tg.BackButton.show();
        const handleBackButtonClick = () => navigate(-1);
        tg.BackButton.onClick(handleBackButtonClick);

        return () => {
            tg.BackButton.offClick(handleBackButtonClick);
            tg.BackButton.hide();
        };
    }, [initialId, fetchProductData, navigate, tg]);

    // Эти обработчики остаются без изменений
    const handleAddToCart = () => {
        if (!product) return;
        tg.HapticFeedback.notificationOccurred('success');
        addToCart(product);
    };

    const handleQuantityChange = (newQuantity) => {
        if (!product) return;
        tg.HapticFeedback.impactOccurred('light');
        updateQuantity(product.id, newQuantity);
    };

    // --- 2. ОБНОВЛЯЕМ ЛОГИКУ ФОРМИРОВАНИЯ МАССИВА КАРТИНОК ДЛЯ НОВОЙ ГАЛЕРЕИ ---
    const allImagesForGallery = useMemo(() => {
        if (!product) return [];
        // Собираем массив объектов, содержащих URL на оригинал и на превью
        const imagesArray = [
            // Главное изображение
            { image_url: product.main_image_url, thumbnail_url: product.main_image_thumbnail_url },
            // Дополнительные изображения (product.images теперь содержит объекты с image_url и thumbnail_url)
            ...(product.images || [])
        ];
        // Отфильтровываем элементы, у которых по какой-то причине нет превью
        return imagesArray.filter(img => img && img.thumbnail_url);
    }, [product]);

    // --- 3. ОБНОВЛЯЕМ ЛОГИКУ ФОРМИРОВАНИЯ ЦВЕТОВЫХ ВАРИАНТОВ ДЛЯ ИСПОЛЬЗОВАНИЯ ПРЕВЬЮ ---
    const allColorVariations = useMemo(() => {
        if (!product || !product.color_variations) {
            return [];
        }
        const fullList = [
            // Теперь для текущего товара тоже используем превью
            { id: product.id, main_image_thumbnail_url: product.main_image_thumbnail_url },
            ...product.color_variations
        ];
        return fullList.sort((a, b) => a.id - b.id);
    }, [product]);

    // Этот обработчик остается без изменений
    const handleColorSwitch = (e, newId) => {
        e.preventDefault();
        if (product && newId !== product.id && !isSwitchingColor) {
            fetchProductData(newId, false);
        }
    };

    // Эти условия остаются без изменений
    if (loading) {
        return <ProductPageSkeleton />;
    }

    if (!product) {
        return <div className="loader">Товар не найден</div>;
    }

    // --- НАЧАЛО JSX РЕНДЕРИНГА (ЗДЕСЬ БУДУТ ВСЕ ВАШИ БЛОКИ) ---
    return (
        <div className={`product-page ${isSwitchingColor ? 'switching-color' : ''}`}>
            {/* 4. ЗАМЕНЯЕМ СТАРЫЙ ImageSlider НА НОВЫЙ ProductGallery */}
            <ProductGallery images={allImagesForGallery} />

            <div className="product-details">

                <div className="product-title-header">
                    <h1 className="product-title">{product.name}</h1>
                </div>

                <div className="info-panels-product">
                    {(product.info_panels || []).map(panel => (
                        <span key={panel.name} className="info-panel"
                              style={{backgroundColor: panel.color, color: panel.text_color}}>
                            {panel.name}
                        </span>
                    ))}
                </div>

                {allColorVariations.length > 1 && (
                    <div className="product-section">
                        <h2>Цвет</h2>
                        <div className="color-swatches-container">
                            {allColorVariations.map(variation => (
                                <Link
                                    to={`/product/${variation.id}`}
                                    key={variation.id}
                                    className={`color-swatch ${variation.id === product.id ? 'active' : ''}`}
                                    onClick={(e) => handleColorSwitch(e, variation.id)}
                                >
                                    {/* 5. Используем превью для квадратиков */}
                                    <img src={variation.main_image_thumbnail_url} alt="Color variation"/>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="product-price-main">{parseFloat(product.price).toFixed(0)} ₽</div>

                {product.audio_sample && (
                    <div className="product-section audio-section">
                        <h2>Пример звучания</h2>
                        <audio controls className="audio-player">
                            <source src={product.audio_sample} type="audio/mpeg"/>
                            Ваш браузер не поддерживает воспроизведение аудио.
                        </audio>
                    </div>
                )}

                {itemInCart && product.related_products && product.related_products.length > 0 && (
                    <div className="product-section related-section">
                        <h2>С этим товаром покупают</h2>
                        <div className="related-products-container">
                            {product.related_products.map(related_product => (
                                // 6. Убеждаемся, что RelatedProductCard тоже получает правильные данные
                                <RelatedProductCard
                                    key={related_product.id}
                                    product={related_product}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="product-section">
                    <h2>Описание</h2>
                    <div
                        className="product-description-content"
                        dangerouslySetInnerHTML={{__html: product.description}}
                    />
                </div>

                {product.info_cards && product.info_cards.length > 0 && (
                    <div className="product-section">
                        <div className="info-cards-container">
                            {product.info_cards.map((card, index) => (
                                <a key={index} href={card.link_url} target="_blank" rel="noopener noreferrer"
                                   className="info-card-rectangle">
                                    {/* 7. Используем превью для инфо-карточек */}
                                    <img src={card.image_url} alt={card.title} className="info-card-image-rect"/>
                                    <div className="info-card-text-content">
                                        <h4 className="info-card-title-rect">{card.title}</h4>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className="product-section">
                    {product.features && product.features.length > 0 && (
                        <AccordionItem title="Функционал">
                            <ul className="spec-list simple">
                                {product.features.map((feature, index) => (
                                    <li key={index}>{feature.name}</li>
                                ))}
                            </ul>
                        </AccordionItem>
                    )}

                    {product.grouped_characteristics && product.grouped_characteristics.length > 0 && (
                        product.grouped_characteristics.map((category, index) => (
                            <AccordionItem title={category.name} key={index}>
                                <ul className="spec-list">
                                    {category.characteristics.map((char, charIndex) => (
                                        <li key={charIndex}>
                                            <span className="spec-name">{char.name}</span>
                                            <span className="spec-value">{char.value}</span>
                                        </li>
                                    ))}
                                </ul>
                            </AccordionItem>
                        ))
                    )}
                </div>
            </div>

            <div className="sticky-footer">
                {itemInCart ? (
                    <div className="cart-controls-container">
                        <Link to="/cart" className="go-to-cart-btn">В корзине</Link>
                        <div className="quantity-stepper">
                            <button className="quantity-btn"
                                    onClick={() => handleQuantityChange(itemInCart.quantity - 1)}>−
                            </button>
                            <span className="quantity-display">{itemInCart.quantity}</span>
                            <button className="quantity-btn"
                                    onClick={() => handleQuantityChange(itemInCart.quantity + 1)}>+
                            </button>
                        </div>
                    </div>
                ) : (
                    <button className="add-to-cart-btn" onClick={handleAddToCart}>Добавить в корзину</button>
                )}
            </div>
        </div>
    );
};

export default ProductPage;