// frontend/src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from './components/MainLayout';
import Notification from './components/Notification';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import SearchPage from './pages/SearchPage';
import LegalPage from './pages/LegalPage';
import FaqPage from './pages/FaqPage';
import { useTelegram } from './utils/telegram';
import { useNotification } from './context/NotificationContext';
import CheckoutPage from './pages/CheckoutPage';
import './App.css';


function App() {
    const tg = useTelegram();
    const { notification } = useNotification();
    useEffect(() => {
        // Проверяем, что объект tg вообще существует (т.е. мы внутри Telegram)
        if (tg) {
            // Сообщаем Telegram, что приложение готово к отображению
            tg.ready();

            // --- ВОТ ИЗМЕНЕНИЕ ---
            // Отключаем жест вертикального свайпа для закрытия приложения
            tg.disableVerticalSwipes();
        }
    }, [tg]); // Зависимость от [tg] гарантирует, что код выполнится один раз, когда tg станет доступен

    const futureFlags = {
        v7_startTransition: true,
        v7_relativeSplatPath: true,
    };

    return (
        <Router future={futureFlags}>
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
                <Route path="/offer" element={<main className="page-content"><LegalPage /></main>} />
                <Route path="/privacy" element={<main className="page-content"><LegalPage /></main>} />

                <Route path="/checkout" element={
                    <main className="page-content">
                        <CheckoutPage />
                    </main>
                } />


            </Routes>
        </Router>
    );
}

export default App;