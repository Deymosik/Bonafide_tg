// frontend/src/components/FiltersSheet.js
import React, { useState, useEffect } from 'react';
import './FiltersSheet.css';

// Вспомогательный рекурсивный компонент для отрисовки дерева категорий
const CategoryNode = ({ category, selectedId, onSelect, level = 0 }) => (
    <div className="category-tree-node" style={{ paddingLeft: `${level * 20}px` }}>
        <p
            className={`category-name ${category.id === selectedId ? 'active' : ''}`}
            onClick={() => onSelect(category.id)}
        >
            {category.name}
        </p>
        {category.subcategories && category.subcategories.map(sub => (
            <CategoryNode key={sub.id} category={sub} selectedId={selectedId} onSelect={onSelect} level={level + 1} />
        ))}
    </div>
);


const FiltersSheet = ({ allCategories, currentFilters, onApply, onClose }) => {
    // Локальное состояние для выбора внутри окна
    const [localOrdering, setLocalOrdering] = useState(currentFilters.ordering);
    const [localCategory, setLocalCategory] = useState(currentFilters.category);

    // Синхронизируем локальное состояние, если пропсы изменились извне
    useEffect(() => {
        setLocalOrdering(currentFilters.ordering);
        setLocalCategory(currentFilters.category);
    }, [currentFilters]);


    const sortOptions = [
        { key: '-created_at', label: 'По умолчанию (новые)' },
        { key: 'price', label: 'Сначала дешевле' },
        { key: '-price', label: 'Сначала дороже' },
    ];

    const handleApply = () => {
        onApply({
            ordering: localOrdering,
            category: localCategory,
        });
        onClose();
    };

    const handleReset = () => {
        setLocalCategory(null);
        setLocalOrdering('-created_at');
    };

    return (
        <div className="filters-sheet">
            <div className="filters-header">
                <button onClick={handleReset} className="header-btn reset">Сбросить</button>
                <h3 className="header-title">Фильтры</h3>
                <button onClick={handleApply} className="header-btn apply">Применить</button>
            </div>

            <div className="filters-section">
                <h4>Сортировка</h4>
                {sortOptions.map(option => (
                    <div
                        key={option.key}
                        className={`sort-option ${localOrdering === option.key ? 'active' : ''}`}
                        onClick={() => setLocalOrdering(option.key)}
                    >
                        {option.label}
                        {localOrdering === option.key && '•'}
                    </div>
                ))}
            </div>

            <div className="filters-section">
                <h4>Категории</h4>
                <div className="category-tree">
                    <p
                        className={`category-name ${!localCategory ? 'active' : ''}`}
                        onClick={() => setLocalCategory(null)}
                    >
                        Все категории
                    </p>
                    {allCategories.map(cat => (
                        <CategoryNode key={cat.id} category={cat} selectedId={localCategory} onSelect={setLocalCategory} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FiltersSheet;