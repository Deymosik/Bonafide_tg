// frontend/src/components/ArticleCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import './ArticleCard.css';

const ArticleCard = ({ article }) => {
    const publicationDate = new Date(article.published_at).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <Link to={`/articles/${article.slug}`} className="article-card-link">
            <div className="article-card">
                <div className="article-card-image-wrapper">
                    {article.cover_image_url ? (
                        <img src={article.cover_image_url} alt={article.title} className="article-card-image" />
                    ) : (
                        <div className="article-card-image-placeholder" />
                    )}
                </div>
                <div className="article-card-info">
                    {article.category && <p className="article-card-category">{article.category.name}</p>}
                    <h3 className="article-card-title">{article.title}</h3>
                    <p className="article-card-date">{publicationDate}</p>
                </div>
            </div>
        </Link>
    );
};

export default ArticleCard;