// frontend/src/components/SearchBar.js
import React from 'react';
import { ReactComponent as SearchIcon } from '../assets/search-icon.svg';
import './SearchBar.css';

const SearchBar = ({ value, onChange, placeholder, inputRef }) => {
    return (
        <div className="search-bar-wrapper">
            <SearchIcon className="search-bar-icon"/>
            <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                className="search-bar-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
};

export default SearchBar;