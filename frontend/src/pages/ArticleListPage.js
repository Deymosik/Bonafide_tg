// frontend/src/pages/ArticleListPage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api';
import ArticleCard from '../components/ArticleCard';
import './ArticleListPage.css';

const ArticleListPage = () => {
    // 1. ИЗМЕНЕНИЕ: Разделяем состояния для разных частей страницы
    const [categories, setCategories] = useState([]);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nextPage, setNextPage] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // 2. ИЗМЕНЕНИЕ: Состояния для управления фильтрами и сортировкой
    const [searchParams, setSearchParams] = useSearchParams();
    const activeCategory = searchParams.get('category') || 'all';
    const activeSort = searchParams.get('sort') || 'new';

    // 3. ИЗМЕНЕНИЕ: Основной эффект для загрузки данных
    useEffect(() => {
        setLoading(true);
        setArticles([]);
        setNextPage(null);

        const params = new URLSearchParams();
        if (activeCategory !== 'all') {
            params.append('category', activeCategory);
        }
        if (activeSort === 'popular') {
            params.append('ordering', '-views_count');
        } else {
            params.append('ordering', '-published_at');
        }

        apiClient.get(`/articles/?${params.toString()}`)
            .then(response => {
                // API теперь возвращает комплексный объект
                setCategories(response.data.categories);
                setArticles(response.data.articles.results);
                setNextPage(response.data.articles.next);
            })
            .catch(error => console.error("Ошибка при загрузке блога:", error))
            .finally(() => setLoading(false));
    }, [activeCategory, activeSort]); // Перезагрузка при смене фильтра или сортировки

    // 4. ИЗМЕНЕНИЕ: Логика бесконечного скролла (без изменений, но важна)
    const observer = useRef();
    const loadMoreArticles = useCallback(() => {
        if (!nextPage || loadingMore) return;
        setLoadingMore(true);
        apiClient.get(nextPage)
            .then(response => {
                // ВАЖНО: данные теперь вложены в .articles
                setArticles(prev => [...prev, ...response.data.articles.results]);
                setNextPage(response.data.articles.next);
            })
            .finally(() => setLoadingMore(false));
    }, [nextPage, loadingMore]);

    const lastArticleElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && nextPage) loadMoreArticles();
        });
        if (node) observer.current.observe(node);
    }, [loading, nextPage, loadMoreArticles]);

    // 5. ИЗМЕНЕНИЕ: Функции-обработчики для кликов
    const handleCategorySelect = (slug) => {
        setSearchParams(prev => {
            prev.set('category', slug);
            return prev;
        }, { replace: true });
    };

    const handleSortSelect = (sortType) => {
        setSearchParams(prev => {
            prev.set('sort', sortType);
            return prev;
        }, { replace: true });
    };

    return (
            <div className="article-list-page">

                {/* 6. ИЗМЕНЕНИЕ: Новый блок навигации */}
                <div className="blog-nav">
                    <div className="categories-scroll-container">
                        <div className="categories-scroll-inner">
                            <button
                                className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`}
                                onClick={() => handleCategorySelect('all')}
                            >
                                Все
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.slug}
                                    className={`category-chip ${activeCategory === cat.slug ? 'active' : ''}`}
                                    onClick={() => handleCategorySelect(cat.slug)}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="sort-tabs">
                        <button
                            className={`sort-tab ${activeSort === 'new' ? 'active' : ''}`}
                            onClick={() => handleSortSelect('new')}
                        >
                            Новые
                        </button>
                        <button
                            className={`sort-tab ${activeSort === 'popular' ? 'active' : ''}`}
                            onClick={() => handleSortSelect('popular')}
                        >
                            Популярные
                        </button>
                    </div>
                </div>

                <div className="articles-grid">
                    {loading ? (
                        <p>Загрузка статей...</p>
                    ) : articles.length > 0 ? (
                        articles.map((article, index) => (
                            <div ref={articles.length === index + 1 ? lastArticleElementRef : null} key={article.slug}>
                                <ArticleCard article={article} />
                            </div>
                        ))
                    ) : (
                        <p className="not-found-message">Статьи не найдены.</p>
                    )}
                    {loadingMore && <p>Загружаем ещё...</p>}
                </div>
            </div>
    );
};

export default ArticleListPage;