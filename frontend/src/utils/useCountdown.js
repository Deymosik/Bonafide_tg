// frontend/src/utils/useCountdown.js
import { useEffect, useState } from 'react';

const useCountdown = (targetDate) => {
    // 1. Проверяем, что targetDate - это валидная строка/число, прежде чем создавать дату
    const countDownDate = targetDate ? new Date(targetDate).getTime() : null;

    const [countDown, setCountDown] = useState(
        // 2. Устанавливаем начальное значение только если дата валидна
        countDownDate ? countDownDate - new Date().getTime() : 0
    );

    useEffect(() => {
        // 3. Запускаем интервал только если дата валидна
        if (!countDownDate) {
            setCountDown(0);
            return;
        }

        const interval = setInterval(() => {
            setCountDown(countDownDate - new Date().getTime());
        }, 1000);

        return () => clearInterval(interval);
    }, [countDownDate]);

    return getReturnValues(countDown);
};

// 4. Добавляем проверку на отрицательные значения, чтобы не показывать -1
const getReturnValues = (countDown) => {
    const days = Math.floor(countDown / (1000 * 60 * 60 * 24));
    const hours = Math.floor((countDown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((countDown % (1000 * 60)) / 1000);

    // Если время вышло, возвращаем нули
    if (countDown < 0) {
        return [0, 0, 0, 0];
    }

    return [days, hours, minutes, seconds];
};

export { useCountdown };