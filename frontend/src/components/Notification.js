// frontend/src/components/Notification.js
import React from 'react';
import './Notification.css';

const Notification = ({ message, type, isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className={`notification-container ${type} ${isVisible ? 'show' : ''}`}>
            <p>{message}</p>
        </div>
    );
};

export default Notification;