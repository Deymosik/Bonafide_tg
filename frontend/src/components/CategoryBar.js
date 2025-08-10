// frontend/src/components/CategoryBar.js
import React, { useState, useMemo, useEffect } from 'react';
import './CategoryBar.css';
import { ReactComponent as BackIcon } from '../assets/back-arrow-icon.svg';

const CategoryBar = ({ categories, selectedCategory, onSelectCategory }) => {
    const [activePath, setActivePath] = useState([]);
    const [animationClass, setAnimationClass] = useState('slide-in-right');

    const { displayedCategories, parentCategory } = useMemo(() => {
        // ... (этот хук без изменений)
        if (activePath.length === 0) {
            return { displayedCategories: categories, parentCategory: null };
        }
        let currentLevel = categories;
        let parent = null;
        for (const categoryId of activePath) {
            parent = currentLevel.find(cat => cat.id === categoryId);
            if (!parent) return { displayedCategories: [], parentCategory: null };
            currentLevel = parent.subcategories;
        }
        return { displayedCategories: currentLevel, parentCategory: parent };
    }, [categories, activePath]);

    const handleCategoryClick = (category) => {
        if (category.subcategories && category.subcategories.length > 0) {
            setAnimationClass('slide-in-right');
            setActivePath([...activePath, category.id]);
            // При входе в подкатегорию, сбрасываем фильтр, так как выбрана родительская категория
            onSelectCategory(category.id.toString());
        } else {
            onSelectCategory(category.id.toString());
        }
    };

    const handleBackClick = () => {
        setAnimationClass('slide-in-left');
        const newPath = [...activePath];
        newPath.pop();
        setActivePath(newPath);
        const parentId = newPath.length > 0 ? newPath[newPath.length - 1] : null;
        onSelectCategory(parentId ? parentId.toString() : null);
    };

    const handleReset = () => {
        setAnimationClass('slide-in-left');
        setActivePath([]);
        onSelectCategory(null);
    };

    // --- ИЗМЕНЕНИЕ ЗДЕСЬ: Добавляем корневой div-обертку ---
    return (
        <div className="category-bar-wrapper">
            {activePath.length > 0 ? (
                <button className="category-bar-button" onClick={handleBackClick}>
                    <BackIcon />
                </button>
            ) : (
                <div
                    className={`category-chip ${!selectedCategory ? 'active' : ''}`}
                    onClick={handleReset}
                >
                    Все
                </div>
            )}

            <div className="categories-scroll-container">
                <div className="categories-scroll-inner" key={parentCategory ? parentCategory.id : 'root'}>
                    {parentCategory && (
                        <div className="category-chip current-parent-chip" onClick={handleBackClick}>
                            {parentCategory.name}
                        </div>
                    )}
                    {displayedCategories.map(cat => (
                        <div
                            key={cat.id}
                            className={`category-chip ${selectedCategory === cat.id.toString() ? 'active' : ''}`}
                            onClick={() => handleCategoryClick(cat)}
                        >
                            {cat.name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoryBar;