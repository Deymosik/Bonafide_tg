// frontend/src/components/BottomSheet.js
import React, { useEffect } from 'react';
import './BottomSheet.css';

const BottomSheet = ({ isOpen, onClose, children }) => {
    useEffect(() => {
        // Блокируем скролл основной страницы, когда меню открыто
        document.body.style.overflow = isOpen ? 'hidden' : 'unset';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="bottom-sheet-overlay" onClick={onClose}>
            <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};

export default BottomSheet;