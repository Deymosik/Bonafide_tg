// frontend/src/components/InfoCarousel.js
import React from 'react';
import './InfoCarousel.css';

const InfoCarousel = ({ images }) => {
    if (!images || images.length === 0) { return null; }

    return (
        <div className="info-carousel-container">
            {images.map((img, index) => (
                <div key={index} className="info-carousel-slide">
                    {/* Используем превью для отображения */}
                    <img src={img.thumbnail_url} alt={img.caption || `Shop image ${index + 1}`} />
                    {img.caption && <p className="info-carousel-caption">{img.caption}</p>}
                </div>
            ))}
        </div>
    );
};

export default InfoCarousel;