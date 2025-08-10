// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <SettingsProvider>
        <NotificationProvider>
            <CartProvider>
                <App />
            </CartProvider>
        </NotificationProvider>
        </SettingsProvider>
    </React.StrictMode>
);