// frontend/src/components/AccordionItem.js
import React, { useState, useRef, useEffect } from 'react';
import './AccordionItem.css';

const AccordionItem = ({ title, children, startOpen = false }) => {
    const [isOpen, setIsOpen] = useState(startOpen);
    const contentRef = useRef(null); // Ссылка на наш контент
    const [contentHeight, setContentHeight] = useState(0);

    // Этот useEffect будет измерять высоту контента каждый раз, когда он меняется
    useEffect(() => {
        if (contentRef.current) {
            // scrollHeight - это реальная высота контента, даже если он скрыт
            setContentHeight(contentRef.current.scrollHeight);
        }
    }, [children]); // Пересчитываем высоту, если дочерний контент изменился

    return (
        <div className="accordion-item-wrapper">
            <button className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
                <span>{title}</span>
                <span className={`accordion-arrow ${isOpen ? 'open' : ''}`}>›</span>
            </button>

            <div
                className="accordion-answer-panel"
                // --- ВОТ ГЛАВНОЕ ИЗМЕНЕНИЕ ---
                // Мы устанавливаем max-height напрямую в стилях,
                // используя наше измеренное значение.
                style={{ maxHeight: isOpen ? `${contentHeight}px` : '0px' }}
            >
                {/* Оборачиваем children в div с ref, чтобы его можно было измерить */}
                <div ref={contentRef} className="accordion-content-inner">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AccordionItem;