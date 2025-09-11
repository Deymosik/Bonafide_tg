// frontend/src/components/ProductGallery.js
import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

import './ProductGallery.css';

const ProductGallery = ({ images, productName }) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const openLightbox = (index) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
    };

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
                        <img src={image.thumbnail_url} alt={`${productName} - вид ${index + 1}`}/>
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

ProductGallery.defaultProps = {
    productName: 'Товар'
};

export default ProductGallery;