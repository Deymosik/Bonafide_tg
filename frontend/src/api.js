// проект/frontend/src/api/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api',
});

// ИЗМЕНЕНИЕ: Полностью переработанный перехватчик запросов
apiClient.interceptors.request.use(
    (config) => {
        const tg = window.Telegram?.WebApp;

        // 1. Получаем настоящую строку initData
        const initData = tg?.initData;

        // 2. Если initData существует и не пустая, добавляем ее в заголовок Authorization
        // Это стандартная практика для передачи токенов или подобных данных.
        if (initData) {
            config.headers['Authorization'] = `tma ${initData}`;
        }
        // 3. Старый небезопасный заголовок X-Telegram-ID полностью удален.
        // Бэкенд в режиме DEBUG сам подставит ID, если заголовок Authorization отсутствует.

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;