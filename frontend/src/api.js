// frontend/src/api/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api',
});

// Добавляем перехватчик (interceptor) для всех исходящих запросов
apiClient.interceptors.request.use(
    (config) => {
        const tg = window.Telegram?.WebApp;
        let telegramId = null;

        // --- ВОТ ГЛАВНОЕ ИЗМЕНЕНИЕ ---

        // 1. Проверяем, есть ли реальные данные Telegram
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
            telegramId = tg.initDataUnsafe.user.id;
        }
        // 2. Если реальных данных нет, И мы в режиме разработки...
        else if (process.env.NODE_ENV === 'development') {
            // ...подставляем фейковый ID для тестов.
            // Любое число, которое не будет мешать реальным пользователям.
            console.warn("Telegram ID not found, using mock ID 123456789 for development.");
            telegramId = 123456789;
        }

        // 3. Если ID был найден (реальный или фейковый), добавляем его в заголовок.
        if (telegramId) {
            config.headers['X-Telegram-ID'] = telegramId;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;