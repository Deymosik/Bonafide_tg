// frontend/src/components/ImageSlider.js
import React, { useState, useEffect } from 'react';
import './ImageSlider.css';

const ImageSlider = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        setCurrentIndex(0);
    }, [images]);

    const goToPrevious = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLastSlide = currentIndex === images.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    // Проверка на случай, если массив картинок пуст
    if (!images || images.length === 0) {
        return <div className="slider-container empty-slider"></div>;
    }

    return (
        <div className="slider-container">
            {/* Стрелки для навигации */}
            <div className="arrow left-arrow" onClick={goToPrevious}>❮</div>
            <div className="arrow right-arrow" onClick={goToNext}>❯</div>

            <div className="slide" style={{ backgroundImage: `url(${images[currentIndex]})` }}></div>

            <div className="dots-container">
                {images.map((_, slideIndex) => (
                    <div
                        key={slideIndex}
                        className={`dot ${currentIndex === slideIndex ? 'active' : ''}`}
                        onClick={() => setCurrentIndex(slideIndex)}
                    >
                        ●
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ImageSlider;