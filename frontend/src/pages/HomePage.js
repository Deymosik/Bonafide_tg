// frontend/src/pages/HomePage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import CategoryBar from '../components/CategoryBar';
import PromoCarousel from '../components/PromoCarousel';
import BottomSheet from '../components/BottomSheet';
import { ReactComponent as SortIcon } from '../assets/sort-icon.svg';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import DealOfTheDay from '../components/DealOfTheDay';

import './HomePage.css';

const HomePage = () => {
    const [banners, setBanners] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedCategory = searchParams.get('category');
    const currentOrdering = searchParams.get('ordering') || '-created_at';
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nextPage, setNextPage] = useState(null);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const observer = useRef();
    const [dealProduct, setDealProduct] = useState(null);

    useEffect(() => {
        apiClient.get(`/banners/`)
            .then(response => setBanners(response.data))
            .catch(error => console.error("Ошибка при загрузке баннеров:", error));
        apiClient.get(`/categories/`)
            .then(response => setCategories(response.data))
            .catch(error => console.error("Ошибка при загрузке категорий:", error));
        apiClient.get(`/deal-of-the-day/`)
            .then(response => {
                // API вернет 204 No Content, если товара нет. Проверяем это.
                if (response.status === 200 && response.data) {
                    setDealProduct(response.data);
                }
            })
            .catch(error => console.error("Ошибка при загрузке товара дня:", error));
    }, []);


    const fetchProducts = useCallback((reset = false) => {
        setLoading(true);
        let url = nextPage;
        if (reset) {
            const params = new URLSearchParams();
            if (selectedCategory) {
                params.append('category', selectedCategory);
            }
            if (currentOrdering) {
                params.append('ordering', currentOrdering);
            }
            url = `/products/?${params.toString()}`;
        }
        if (!url) {
            setLoading(false);
            return;
        }
        apiClient.get(url)
            .then(response => {
                setProducts(prev => reset ? response.data.results : [...prev, ...response.data.results]);
                setNextPage(response.data.next);
            })
            .catch(error => console.error("Ошибка при загрузке товаров:", error))
            .finally(() => setLoading(false));
    }, [nextPage, selectedCategory, currentOrdering]);

    useEffect(() => {
        setProducts([]);
        setNextPage(null);
        fetchProducts(true);
    }, [selectedCategory, currentOrdering, fetchProducts]);

    const lastProductElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && nextPage) {
                fetchProducts(false);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, nextPage, fetchProducts]);

    const handleSelectCategory = (categoryId) => {
        setSearchParams(prev => {
            if (categoryId) {
                prev.set('category', categoryId);
            } else {
                prev.delete('category');
            }
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
        // Возвращаем корневой div для правильных отступов
        <div className="home-page">
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
                    <Link to={`/product/${product.id}`} key={product.id} className="product-link">
                        <div ref={products.length === index + 1 ? lastProductElementRef : null}>
                            <ProductCard product={product} />
                        </div>
                    </Link>
                ))}

                {loading && (
                    [...Array(4)].map((_, i) => (
                        <ProductCardSkeleton key={`skeleton-${i}`} />
                    ))
                )}
            </div>

            {!nextPage && !loading && products.length === 0 && <div className="no-products-message">В этой категории пока нет товаров</div>}

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