// frontend/src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from './components/MainLayout';
import Notification from './components/Notification';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import SearchPage from './pages/SearchPage';
import FaqPage from './pages/FaqPage';
import { useTelegram } from './utils/telegram';
import { useNotification } from './context/NotificationContext';
import './App.css';


function App() {
    const tg = useTelegram();
    const { notification } = useNotification();
    useEffect(() => { tg.ready(); }, [tg]);

    return (
        <BrowserRouter>
            <Notification
                message={notification.message}
                type={notification.type}
                isVisible={notification.isVisible}
            />
            <Routes>
                {/* Все страницы, у которых должен быть TabBar, теперь "вложены" в MainLayout */}
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="search" element={<SearchPage />} />
                    <Route path="cart" element={<CartPage />} />
                    <Route path="faq" element={<FaqPage />} />
                </Route>

                <Route path="product/:id" element={
                    <main className="page-content">
                        <ProductPage />
                    </main>
                } />

                {/* Сюда можно добавлять другие страницы без TabBar, например, страницу логина */}
            </Routes>
        </BrowserRouter>
    );
}

export default App;