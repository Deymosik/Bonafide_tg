// frontend/src/components/ProductGallery.js
import React, { useState } from 'react';
// 1. Импортируем Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

// 2. Импортируем Лайтбокс
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

import './ProductGallery.css';

const ProductGallery = ({ images }) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const openLightbox = (index) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
    };

    // 3. Формируем массив для лайтбокса (только полноразмерные фото)
    const lightboxSlides = images.map(img => ({ src: img.image_url }));

    return (
        <>
            <Swiper
                modules={[Pagination, A11y]}
                spaceBetween={0}
                slidesPerView={1}
                pagination={{ clickable: true }}
                className="product-swiper"
            >
                {images.map((image, index) => (
                    <SwiperSlide key={index} onClick={() => openLightbox(index)}>
                        {/* В слайдере показываем сжатые превью */}
                        <img src={image.thumbnail_url} alt={`Product image ${index + 1}`} />
                    </SwiperSlide>
                ))}
            </Swiper>

            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={lightboxSlides}
                index={currentIndex}
            />
        </>
    );
};

export default ProductGallery;