// frontend/src/utils/useDebounce.js
import { useState, useEffect } from 'react';

function useDebounce(value, delay) {
    // Состояние для хранения "отложенного" значения
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Устанавливаем таймер, который обновит значение через 'delay' мс
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Сбрасываем таймер при каждом изменении 'value' или 'delay'
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;