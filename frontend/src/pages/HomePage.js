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
import PromoCarouselSkeleton from '../components/PromoCarouselSkeleton';

import './HomePage.css';

const HomePage = () => {
    // --- ИЗМЕНЕНИЕ: Полное разделение состояний загрузки ---
    const [loadingInitialData, setLoadingInitialData] = useState(true); // Для баннеров, категорий, товара дня
    const [loadingProducts, setLoadingProducts] = useState(true); // Только для списка товаров
    const [loadingMore, setLoadingMore] = useState(false); // Только для подгрузки (бесконечный скролл)

    // --- Остальные состояния без изменений ---
    const [banners, setBanners] = useState([]);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [dealProduct, setDealProduct] = useState(null);
    const [nextPage, setNextPage] = useState(null);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedCategory = searchParams.get('category');
    const currentOrdering = searchParams.get('ordering') || '-created_at';

    const observer = useRef();

    // useEffect №1: Загрузка "статичного" контента (баннеры, категории, товар дня)
    // Эта логика теперь полностью независима.
    useEffect(() => {
        setLoadingInitialData(true);
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
        }).finally(() => {
            setLoadingInitialData(false); // Завершаем ТОЛЬКО эту загрузку
        });
    }, []); // Выполняется один раз

    // useEffect №2: Загрузка товаров при смене фильтров (категория или сортировка)
    useEffect(() => {
        setLoadingProducts(true); // Включаем скелетоны для товаров
        setProducts([]); // Обязательно сбрасываем товары
        setNextPage(null); // Сбрасываем следующую страницу

        const params = new URLSearchParams();
        if (selectedCategory) params.append('category', selectedCategory);
        if (currentOrdering) params.append('ordering', currentOrdering);
        const initialUrl = `/products/?${params.toString()}`;

        apiClient.get(initialUrl)
            .then(response => {
                setProducts(response.data.results);
                setNextPage(response.data.next);
            })
            .catch(error => console.error("Ошибка при начальной загрузке товаров:", error))
            .finally(() => setLoadingProducts(false)); // Выключаем скелетоны для товаров
    }, [selectedCategory, currentOrdering]);

    // Функция для подгрузки следующих страниц (бесконечный скролл)
    const loadMoreProducts = useCallback(() => {
        if (!nextPage || loadingMore) return;

        setLoadingMore(true); // Используем отдельный флаг, чтобы не показывать скелетоны
        apiClient.get(nextPage)
            .then(response => {
                setProducts(prev => [...prev, ...response.data.results]);
                setNextPage(response.data.next);
            })
            .catch(error => console.error("Ошибка при подгрузке товаров:", error))
            .finally(() => setLoadingMore(false));
    }, [nextPage, loadingMore]);

    // Intersection Observer для вызова loadMoreProducts
    const lastProductElementRef = useCallback(node => {
        // ИЗМЕНЕНИЕ: Не блокируем наблюдатель во время основной загрузки,
        // но функция loadMoreProducts сама себя заблокирует, если нужно.
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && nextPage) {
                loadMoreProducts();
            }
        });
        if (node) observer.current.observe(node);
    }, [nextPage, loadMoreProducts]);


    // Обработчики (без изменений)
    const handleSelectCategory = (categoryId) => {
        setSearchParams(prev => {
            if (categoryId) prev.set('category', categoryId);
            else prev.delete('category');
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

    return (
        <div className="home-page sticky-top-safe">

            {loadingInitialData && <PromoCarouselSkeleton/>}
            {!loadingInitialData && banners.length > 0 && <PromoCarousel banners={banners}/>}

            {/* Товар дня зависит только от своего наличия */}
            {dealProduct && <DealOfTheDay product={dealProduct}/>}

            <div className="filters-bar">
                <button className="sort-button" onClick={() => setIsSortMenuOpen(true)}>
                    <SortIcon/>
                </button>
                <CategoryBar
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleSelectCategory}
                />
            </div>

            <div className="products-grid">
                {products.map((product, index) => (
                    <div ref={products.length === index + 1 ? lastProductElementRef : null} key={product.id}>
                        <Link to={`/product/${product.id}`} className="product-link">
                            <ProductCard product={product}/>
                        </Link>
                    </div>
                ))}

                {/* Скелетоны товаров зависят ТОЛЬКО от loadingProducts */}
                {loadingProducts && (
                    [...Array(4)].map((_, i) => (
                        <ProductCardSkeleton key={`skeleton-${i}`}/>
                    ))
                )}
            </div>

            {/* Сообщение "нет товаров" также зависит от loadingProducts */}
            {!loadingProducts && products.length === 0 && (
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