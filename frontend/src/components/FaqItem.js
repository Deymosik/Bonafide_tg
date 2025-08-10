// frontend/src/components/FaqItem.js
import React, { useState } from 'react';
import './FaqItem.css';

// 1. Компонент теперь будет принимать 'answer_html' вместо 'answer'
const FaqItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="faq-item">
            <button className="faq-question" onClick={() => setIsOpen(!isOpen)}>
                <span>{question}</span>
                <span className={`faq-arrow ${isOpen ? 'open' : ''}`}>›</span>
            </button>
            <div className={`faq-answer ${isOpen ? 'open' : ''}`}>
                <div
                    className="faq-answer-content"
                    dangerouslySetInnerHTML={{__html: answer}} // Используем 'answer'
                />
            </div>
        </div>
    );
};

export default FaqItem;