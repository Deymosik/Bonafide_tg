// frontend/src/components/TabBar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './TabBar.css';

// Импортируем наши SVG иконки
import { ReactComponent as HomeIcon } from '../assets/home-icon.svg';
import { ReactComponent as ArticleIcon } from '../assets/article-icon.svg';
import { ReactComponent as CartIcon } from '../assets/cart-icon.svg';
import { ReactComponent as FaqIcon } from '../assets/faq-icon.svg';


const TabBar = () => {
    const { totalItems } = useCart();

    return (
        <nav className="tab-bar">
            <NavLink to="/" className="tab-bar-item">
                <HomeIcon />
                <span>Главная</span>
            </NavLink>
            <NavLink to="/articles" className="tab-bar-item">
                <ArticleIcon />
                <span>Статьи</span>
            </NavLink>
            <NavLink to="/cart" className="tab-bar-item">
                <div className="cart-icon-wrapper">
                    <CartIcon />
                    {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
                </div>
                <span>Корзина</span>
            </NavLink>
            <NavLink to="/faq" className="tab-bar-item">
                <FaqIcon />
                <span>Инфо</span>
            </NavLink>
        </nav>
    );
};

export default TabBar;