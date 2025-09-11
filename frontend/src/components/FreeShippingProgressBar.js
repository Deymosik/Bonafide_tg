// frontend/src/components/FreeShippingProgressBar.js
import React, { useState, useEffect } from 'react';
import './FreeShippingProgressBar.css';
import { ReactComponent as TruckIcon } from '../assets/truck-icon.svg';
import { ReactComponent as CheckIcon } from '../assets/check-icon.svg'; // Нам понадобится иконка галочки

const FreeShippingProgressBar = ({ currentAmount, threshold }) => {
    // Состояние, чтобы отследить, когда мы ВПЕРВЫЕ достигли цели, для анимации
    const [isGoalReached, setIsGoalReached] = useState(false);

    const isThresholdSet = threshold && threshold > 0;

    useEffect(() => {
        // Если порог достигнут, обновляем состояние
        if (isThresholdSet && currentAmount >= threshold) {
            setIsGoalReached(true);
        }
        // Если сумма уменьшилась, сбрасываем состояние
        if (isThresholdSet && currentAmount < threshold) {
            setIsGoalReached(false);
        }
    }, [currentAmount, threshold, isThresholdSet]);


    // Если порог не установлен, ничего не показываем
    if (!isThresholdSet) {
        return null;
    }

    // --- РЕНДЕР СОСТОЯНИЯ "ЦЕЛЬ ДОСТИГНУТА" ---
    if (isGoalReached) {
        return (
            // Добавляем класс 'animate-in' для красивого появления
            <div className="shipping-progress-bar success animate-in">
                <div className="shipping-icon-wrapper success-icon">
                    <CheckIcon />
                </div>
                <div className="shipping-text-wrapper">
                    <span className="shipping-title">Бесплатная доставка!</span>
                    <span className="shipping-subtitle">Ваш заказ будет доставлен бесплатно.</span>
                </div>
            </div>
        );
    }

    // --- РЕНДЕР СОСТОЯНИЯ "В ПРОЦЕССЕ" ---
    const remainingAmount = threshold - currentAmount;
    const progressPercentage = (currentAmount / threshold) * 100;

    return (
        <div className="shipping-progress-bar animate-in">
            <div className="shipping-icon-wrapper">
                <TruckIcon />
            </div>
            <div className="shipping-text-wrapper">
                <span className="shipping-title">
                    Добавьте еще на <strong>{remainingAmount.toFixed(0)} ₽</strong>
                </span>
                <span className="shipping-subtitle">до бесплатной доставки</span>
            </div>
            <div className="progress-track">
                <div
                    className="progress-fill"
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div>
        </div>
    );
};

export default FreeShippingProgressBar;