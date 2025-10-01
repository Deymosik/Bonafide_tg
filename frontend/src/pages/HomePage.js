// проект/frontend/src/pages/HomePage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import PromoCarousel from '../components/PromoCarousel';
import BottomSheet from '../components/BottomSheet';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import DealOfTheDay from '../components/DealOfTheDay';
import PromoCarouselSkeleton from '../components/PromoCarouselSkeleton';
import SearchBar from '../components/SearchBar';
import FiltersSheet from '../components/FiltersSheet';
import { ReactComponent as FilterIcon } from '../assets/sort-icon.svg'; // Переиспользуем иконку
import { useSettings } from '../context/SettingsContext';
import useDebounce from '../utils/useDebounce';

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

    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [searchParams, setSearchParams] = useSearchParams();
    const settings = useSettings();

    const currentFilters = {
        category: searchParams.get('category') || null,
        ordering: searchParams.get('ordering') || '-created_at',
        search: searchParams.get('search') || '',
    };

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

    // 4. ИЗМЕНЕНИЕ: Главный эффект для загрузки товаров. Теперь зависит и от поиска.
    useEffect(() => {
        // Синхронизируем значение в input'е с тем, что в URL
        setSearchTerm(currentFilters.search);

        setLoadingProducts(true);
        setProducts([]);
        setNextPage(null);

        const params = new URLSearchParams();
        if (currentFilters.category) params.append('category', currentFilters.category);
        if (currentFilters.ordering) params.append('ordering', currentFilters.ordering);
        // Берем поисковый запрос из currentFilters, а не из debouncedSearchTerm
        if (currentFilters.search) params.append('search', currentFilters.search);

        const initialUrl = `/products/?${params.toString()}`;

        apiClient.get(initialUrl)
            .then(response => {
                setProducts(response.data.results);
                setNextPage(response.data.next);
            })
            .catch(error => console.error("Ошибка при начальной загрузке товаров:", error))
            .finally(() => setLoadingProducts(false));

        // Массив зависимостей теперь полностью основан на "источнике правды" - URL
    }, [currentFilters.category, currentFilters.ordering, currentFilters.search]);

    useEffect(() => {
        // Используем функциональную форму, чтобы не зависеть от searchParams извне.
        // React передаст нам самую свежую версию как 'prevParams'.
        setSearchParams(prevParams => {
            const newParams = new URLSearchParams(prevParams);
            // Используем debouncedSearchTerm, а не searchTerm
            if (debouncedSearchTerm) {
                newParams.set('search', debouncedSearchTerm);
            } else {
                newParams.delete('search');
            }
            return newParams;
        }, { replace: true });

// Теперь хук корректно зависит только от debouncedSearchTerm и setSearchParams
    }, [debouncedSearchTerm, setSearchParams]);

    const observer = useRef();

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
        // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Если идёт основная загрузка, не создаем наблюдатель.
        // Это предотвратит ложное срабатывание сразу после фильтрации.
        if (loadingProducts) return;

        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && nextPage) {
                loadMoreProducts();
            }
        });
        if (node) observer.current.observe(node);
    }, [loadingProducts, nextPage, loadMoreProducts]);



    const handleApplyFilters = (newFilters) => {
        const params = new URLSearchParams(searchParams);

        if (newFilters.category) {
            params.set('category', newFilters.category);
        } else {
            params.delete('category');
        }

        if (newFilters.ordering) {
            params.set('ordering', newFilters.ordering);
        } else {
            params.delete('ordering');
        }

        setSearchParams(params, { replace: true });
        // ИСПРАВЛЕНИЕ: Закрываем правильное окно
        setIsFiltersOpen(false);
    };

    return (
        <div className="home-page sticky-top-safe">

            {loadingInitialData && <PromoCarouselSkeleton/>}
            {!loadingInitialData && banners.length > 0 && <PromoCarousel banners={banners}/>}

            {/* Товар дня зависит только от своего наличия */}
            {dealProduct && <DealOfTheDay product={dealProduct}/>}

            <div className="top-bar">
                <SearchBar
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder={settings.search_placeholder || "Найти товары..."}
                />
                <button className="filter-button" onClick={() => setIsFiltersOpen(true)}>
                    <FilterIcon/>
                </button>
            </div>

            <div className="products-grid">
                {products.map((product, index) => (
                    <div ref={products.length === index + 1 ? lastProductElementRef : null} key={product.id}>
                        <Link to={`/product/${product.id}`} className="product-link">
                            <ProductCard product={product}/>
                        </Link>
                    </div>
                ))}
                {loadingProducts && (
                    [...Array(6)].map((_, i) => <ProductCardSkeleton key={`skeleton-${i}`}/>)
                )}
            </div>

            {!loadingProducts && products.length === 0 && (
                <div className="no-products-message">
                    Товары не найдены
                </div>
            )}

            {/* Сообщение "нет товаров" также зависит от loadingProducts */}
            {!loadingProducts && products.length === 0 && (
                <div className="no-products-message">
                    В этой категории пока нет товаров
                </div>
            )}

            <BottomSheet isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)}>
                <FiltersSheet
                    allCategories={categories}
                    currentFilters={currentFilters}
                    onApply={handleApplyFilters}
                    onClose={() => setIsFiltersOpen(false)}
                />
            </BottomSheet>
        </div>
    );
};

export default HomePage;