// frontend/src/components/MainHeader.js
import React from 'react';
import { useSettings } from '../context/SettingsContext';
import './MainHeader.css';

const MainHeader = () => {
    const { shop_name } = useSettings();

    return (
        <header className="main-header">
            <h1>{shop_name}</h1>
        </header>
    );
};

export default MainHeader;