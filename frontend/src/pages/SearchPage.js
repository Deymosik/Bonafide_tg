// frontend/src/pages/SearchPage.js
import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import useDebounce from '../utils/useDebounce';
import { useSettings } from '../context/SettingsContext'; // 1. Импортируем хук настроек
import LottieAnimation from '../components/LottieAnimation'; // 2. Импортируем компонент анимации

import './SearchPage.css';
import { ReactComponent as SearchIcon } from '../assets/search-icon.svg';

const SearchPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const settings = useSettings(); // 3. Получаем настройки

    // 4. Используем тексты из настроек. Добавляем fallback на случай, если они еще не загрузились.
    const placeholderText = settings.search_placeholder || "Поиск...";
    const initialText = settings.search_initial_text || "Начните вводить, чтобы найти товар";
    const [message, setMessage] = useState(initialText);

    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // 5. Обновляем стартовое сообщение, когда настройки загрузятся
    useEffect(() => {
        if (!searchTerm) {
            setMessage(initialText);
        }
    }, [initialText, searchTerm]);

    useEffect(() => {
        if (debouncedSearchTerm) {
            setLoading(true);
            setResults([]);
            setMessage('');
            apiClient.get(`/products/?search=${debouncedSearchTerm}`)
                .then(response => {
                    if (response.data.results.length === 0) {
                        setMessage('Ничего не найдено. Попробуйте другой запрос.');
                    }
                    setResults(response.data.results);
                })
                .catch(error => {
                    console.error("Ошибка при поиске:", error);
                    setMessage('Произошла ошибка при поиске');
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setResults([]);
            setMessage(initialText);
        }
    }, [debouncedSearchTerm, initialText]);

    return (
        <div className="search-page">
            <div className="search-bar-container">
                <div className="search-input-wrapper">
                    <SearchIcon className="search-input-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={placeholderText} // Используем текст из настроек
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="search-results">
                {loading && (
                    <div className="products-grid">
                        {[...Array(6)].map((_, i) => <ProductCardSkeleton key={`skeleton-${i}`} />)}
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div className="products-grid">
                        {results.map(product => (
                            <Link to={`/product/${product.id}`} key={product.id} className="product-link">
                                <ProductCard product={product} />
                            </Link>
                        ))}
                    </div>
                )}

                {!loading && message && (
                    <div className="search-message">
                        {/* 6. Добавляем анимацию */}
                        <LottieAnimation src={settings.search_lottie_url} />
                        <p>{message}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;