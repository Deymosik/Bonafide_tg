// проект/frontend/src/pages/HomePage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import CategoryBar from '../components/CategoryBar';
import PromoCarousel from '../components/PromoCarousel';
import BottomSheet from '../components/BottomSheet';
import { ReactComponent as SortIcon } from '../assets/sort-icon.svg';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import DealOfTheDay from '../components/DealOfTheDay';

import './HomePage.css';

const HomePage = () => {
    // --- БЛОК СОСТОЯНИЙ (БЕЗ ИЗМЕНЕНИЙ) ---
    const [banners, setBanners] = useState([]);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [dealProduct, setDealProduct] = useState(null);
    const [nextPage, setNextPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedCategory = searchParams.get('category');
    const currentOrdering = searchParams.get('ordering') || '-created_at';

    const observer = useRef();

    // --- ИЗМЕНЕНИЕ: Загрузка "статичного" контента (баннеры, категории) вынесена в отдельный useEffect ---
    useEffect(() => {
        // Устанавливаем флаг загрузки в true только для самого первого рендера
        setLoading(true);

        // Загружаем все параллельно для ускорения
        Promise.all([
            apiClient.get(`/banners/`),
            apiClient.get(`/categories/`),
            apiClient.get(`/deal-of-the-day/`)
        ]).then(([bannersRes, categoriesRes, dealRes]) => {
            setBanners(bannersRes.data);
            setCategories(categoriesRes.data);
            if (dealRes.status === 200 && dealRes.data) {
                setDealProduct(dealRes.data);
            }
        }).catch(error => {
            console.error("Ошибка при загрузке начальных данных:", error);
        });
        // Этот useEffect должен выполняться только один раз при монтировании компонента
    }, []);

    // --- ИЗМЕНЕНИЕ: Полностью переработанная логика загрузки продуктов ---
    // Этот useEffect отвечает за НАЧАЛЬНУЮ загрузку и СБРОС при смене фильтров.
    useEffect(() => {
        setLoading(true);
        // При смене фильтра мы всегда сбрасываем товары и начинаем с первой страницы
        setProducts([]);

        const params = new URLSearchParams();
        if (selectedCategory) params.append('category', selectedCategory);
        if (currentOrdering) params.append('ordering', currentOrdering);

        const initialUrl = `/products/?${params.toString()}`;

        apiClient.get(initialUrl)
            .then(response => {
                setProducts(response.data.results); // ЗАМЕНЯЕМ старый список на новый
                setNextPage(response.data.next);   // Устанавливаем ссылку на следующую страницу
            })
            .catch(error => console.error("Ошибка при начальной загрузке товаров:", error))
            .finally(() => setLoading(false));

        // Этот хук будет перезапускаться только при изменении категории или сортировки.
    }, [selectedCategory, currentOrdering]);


    // --- ИЗМЕНЕНИЕ: Новая, отдельная функция для ПОДГРУЗКИ следующих страниц ---
    const loadMoreProducts = useCallback(() => {
        // Двойная проверка, чтобы избежать лишних запросов
        if (!nextPage || loading) return;

        setLoading(true);
        apiClient.get(nextPage)
            .then(response => {
                // ДОБАВЛЯЕМ новые товары к существующему списку
                setProducts(prev => [...prev, ...response.data.results]);
                setNextPage(response.data.next);
            })
            .catch(error => console.error("Ошибка при подгрузке товаров:", error))
            .finally(() => setLoading(false));
    }, [nextPage, loading]); // Эта функция пересоздается только когда меняется nextPage или loading


    // --- ИЗМЕНЕНИЕ: Intersection Observer теперь вызывает новую функцию loadMoreProducts ---
    const lastProductElementRef = useCallback(node => {
        if (loading) return; // Не привязываем наблюдатель во время загрузки
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && nextPage) {
                loadMoreProducts(); // Вызываем функцию подгрузки
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, nextPage, loadMoreProducts]);


    // --- Обработчики смены фильтров (остаются БЕЗ ИЗМЕНЕНИЙ) ---
    const handleSelectCategory = (categoryId) => {
        setSearchParams(prev => {
            if (categoryId) {
                prev.set('category', categoryId);
            } else {
                prev.delete('category');
            }
            // Сбрасываем сортировку при смене категории для консистентности
            prev.delete('ordering');
            return prev;
        }, { replace: true });
    };

    const handleSortChange = (newOrdering) => {
        setSearchParams(prev => {
            prev.set('ordering', newOrdering || '-created_at');
            return prev;
        }, { replace: true });
        setIsSortMenuOpen(false);
    };

    const sortOptions = [
        { key: '-created_at', label: 'По умолчанию (новые)' },
        { key: 'price', label: 'Сначала дешевле' },
        { key: '-price', label: 'Сначала дороже' },
    ];

    // --- JSX-разметка (остается БЕЗ ИЗМЕНЕНИЙ) ---
    return (
        <div className="home-page sticky-top-safe">
            <PromoCarousel banners={banners} />
            {dealProduct && <DealOfTheDay product={dealProduct} />}
            <div className="filters-bar">
                <button className="sort-button" onClick={() => setIsSortMenuOpen(true)}>
                    <SortIcon />
                </button>
                <CategoryBar
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleSelectCategory}
                />
            </div>

            <div className="products-grid">
                {products.map((product, index) => (
                    // Обертка <Link> больше не нужна, она мешает ref.
                    // <Link> нужно будет перенести внутрь ProductCard, если он еще не там.
                    // Но для исправления бага ее нужно убрать отсюда.
                    <div ref={products.length === index + 1 ? lastProductElementRef : null} key={product.id}>
                        <Link to={`/product/${product.id}`} className="product-link">
                            <ProductCard product={product} />
                        </Link>
                    </div>
                ))}

                {loading && (
                    [...Array(4)].map((_, i) => (
                        <ProductCardSkeleton key={`skeleton-${i}`} />
                    ))
                )}
            </div>

            {/* --- ИЗМЕНЕНИЕ: Условие для сообщения "нет товаров" стало проще --- */}
            {!loading && products.length === 0 && (
                <div className="no-products-message">
                    В этой категории пока нет товаров
                </div>
            )}

            <BottomSheet isOpen={isSortMenuOpen} onClose={() => setIsSortMenuOpen(false)}>
                <div className="sort-menu">
                    <h3>Сортировка</h3>
                    {sortOptions.map(option => (
                        <div
                            key={option.key}
                            className={`sort-option ${currentOrdering === option.key ? 'active' : ''}`}
                            onClick={() => handleSortChange(option.key)}
                        >
                            {option.label}
                            {currentOrdering === option.key && '✔'}
                        </div>
                    ))}
                </div>
            </BottomSheet>
        </div>
    );
};

export default HomePage;