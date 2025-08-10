// frontend/src/components/MainLayout.js
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TabBar from './TabBar';
import MainHeader from './MainHeader';
import './MainLayout.css';

const MainLayout = () => {
    const location = useLocation();

    // Показываем хедер только на главной
    const showHeader = location.pathname === '/';

    // Определяем, на каких страницах НЕ нужно показывать TabBar
    const hideTabBarOnRoutes = ['/product/'];
    const showTabBar = !hideTabBarOnRoutes.some(route => location.pathname.startsWith(route));

    return (
        <div className="app-layout-container">
            {showHeader && <MainHeader />}
            <main className="layout-content">
                <Outlet />
            </main>
            {showTabBar && <TabBar />}
        </div>
    );
};

export default MainLayout;