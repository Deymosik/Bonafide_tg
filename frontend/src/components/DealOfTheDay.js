// frontend/src/components/DealOfTheDay.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useCountdown } from '../utils/useCountdown';
import './DealOfTheDay.css';

const CountdownItem = ({ value, label }) => (
    <div className="countdown-item">
        <span className="countdown-value">{value < 10 ? `0${value}` : value}</span>
        <span className="countdown-label">{label}</span>
    </div>
);

const DealOfTheDay = ({ product }) => {
    const [days, hours, minutes, seconds] = useCountdown(product?.deal_ends_at);

    if (!product || !product.deal_ends_at || (days + hours + minutes + seconds <= 0)) {
        return null;
    }

    // --- НОВАЯ ЛОГИКА ДЛЯ ЦЕНЫ И СКИДКИ ---
    const hasDealPrice = product.deal_price && parseFloat(product.deal_price) > 0;
    const price = parseFloat(product.price);
    const dealPrice = hasDealPrice ? parseFloat(product.deal_price) : price;
    const discountPercent = hasDealPrice ? Math.round(((price - dealPrice) / price) * 100) : 0;

    return (
        <Link to={`/product/${product.id}`} className="deal-container">
            <div className="deal-image" style={{ backgroundImage: `url(${product.main_image_thumbnail_url})` }}>
                {/* Показываем значок скидки, только если она есть */}
                {discountPercent > 0 && (
                    <div className="deal-discount-badge">-{discountPercent}%</div>
                )}
            </div>
            <div className="deal-info">
                <p className="deal-badge">🔥 Товар дня</p>
                <h3 className="deal-name">{product.name}</h3>

                {/* --- НОВЫЙ БЛОК ДЛЯ ОТОБРАЖЕНИЯ ЦЕНЫ --- */}
                <div className="deal-price-wrapper">
                    <span className="deal-new-price">{dealPrice.toFixed(0)} ₽</span>
                    {/* Показываем старую цену, только если есть акционная */}
                    {hasDealPrice && (
                        <span className="deal-old-price">{price.toFixed(0)} ₽</span>
                    )}
                </div>

                <div className="deal-countdown">
                    <CountdownItem value={days} label="дней" />
                    <CountdownItem value={hours} label="часов" />
                    <CountdownItem value={minutes} label="минут" />
                    <CountdownItem value={seconds} label="секунд" />
                </div>
            </div>
        </Link>
    );
};

export default DealOfTheDay;