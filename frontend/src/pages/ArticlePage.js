// frontend/src/pages/ArticlePage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import apiClient from '../api';
import { useSettings } from '../context/SettingsContext';
import RelatedProductCard from '../components/RelatedProductCard';
import { ReactComponent as ThemeIcon } from '../assets/theme-icon.svg';
import { ReactComponent as EyeIcon } from '../assets/eye-icon.svg';
import './ArticlePage.css';

const ArticlePage = () => {
    const { slug } = useParams();
    const settings = useSettings();

    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        setLoading(true);
        apiClient.get(`/articles/${slug}/`)
            .then(response => setArticle(response.data))
            .catch(err => setError("Статья не найдена"))
            .finally(() => setLoading(false));
    }, [slug]);

    const isDataReady = !loading && !!article;

    useEffect(() => {
        // Убедимся, что статья загружена и это не внешний ресурс
        if (article && article.content_type === 'INTERNAL') {
            // 1. Устанавливаем время задержки (10 минут в миллисекундах)
            const VIEW_COOLDOWN_MS = 10 * 60 * 1000;
            const now = Date.now();

            try {
                // 2. Получаем все временные метки из localStorage
                const timestamps = JSON.parse(localStorage.getItem('articleViewTimestamps')) || {};

                // 3. Получаем время последнего просмотра для ТЕКУЩЕЙ статьи
                const lastViewTimestamp = timestamps[article.slug];

                // 4. Проверяем условие: если записи нет ИЛИ прошло больше 10 минут
                if (!lastViewTimestamp || (now - lastViewTimestamp > VIEW_COOLDOWN_MS)) {
                    console.log(`Засчитываем просмотр для статьи: ${article.slug}`);

                    // Отправляем запрос на увеличение счётчика
                    apiClient.post(`/articles/${slug}/increment-view/`)
                        .catch(err => console.error("Не удалось увеличить счетчик просмотров", err));

                    // 5. Обновляем временную метку для этой статьи
                    timestamps[article.slug] = now;
                    localStorage.setItem('articleViewTimestamps', JSON.stringify(timestamps));
                } else {
                    console.log(`Просмотр для "${article.slug}" не засчитан (cooldown).`);
                }

            } catch (e) {
                console.error("Ошибка при работе с localStorage:", e);
            }
        }
    }, [article, slug]);


    useEffect(() => {
        if (article && article.content_type === 'EXTERNAL') {
            window.location.replace(article.external_url);
        }
    }, [article]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    if (loading) return <div className="article-page-loader">Загрузка...</div>;
    if (error) return <div className="article-page-error">{error}</div>;
    if (!article || article.content_type === 'EXTERNAL') {
        return <div className="article-page-loader">Перенаправление...</div>;
    }

    const publicationDate = new Date(article.published_at).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const fontStyle = {
        fontFamily: settings?.article_font_family || 'Exo 2, sans-serif'
    };

    const pageClassName = `article-page theme-${theme}`;

    return (
        <>
            {isDataReady && (
                <Helmet>
                    <title>{article.meta_title || article.title}</title>
                    <meta name="description" content={article.meta_description} />
                </Helmet>
            )}
            <div className={pageClassName} style={fontStyle}>
                <div className="article-header">
                    {article.cover_image_url && (
                        <img src={article.cover_image_url} alt={article.title} className="article-cover-image" />
                    )}
                    <h1 className="article-title">{article.title}</h1>
                    <div className="article-meta">
                        <div className="meta-info-group">
                            {article.author &&
                                <span>{`${article.author.first_name} ${article.author.last_name}`.trim()}</span>}
                            <span>{publicationDate}</span>
                            {article.reading_time > 0 && <span className="meta-item"><span
                                className="meta-icon">🕒</span>{article.reading_time} мин</span>}
                            <span className="meta-item"><EyeIcon
                                className="meta-icon eye-icon"/>{article.views_count}</span>
                        </div>
                        <button onClick={toggleTheme} className="theme-toggle-btn">
                            <ThemeIcon/>
                        </button>
                    </div>
                </div>

                <div
                    className="article-content"
                    dangerouslySetInnerHTML={{__html: article.content}}
                />

                {article.related_products && article.related_products.length > 0 && (
                    <div className="related-products-section">
                        <h2 className="section-title">Рекомендуемые товары</h2>
                        <div className="related-products-container">
                            {article.related_products.map(product => (
                                <RelatedProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ArticlePage;