// frontend/src/api.js
import axios from 'axios';

//const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";


//const apiClient = axios.create({
//    baseURL: `${API_BASE_URL}/api`,
    // Здесь можно будет добавить другие настройки, например, заголовки
//});

const apiClient = axios.create({
    // Мы убираем baseURL. Теперь Axios будет использовать
    // тот же домен, с которого загружено приложение.
    // Путь к API (/api) теперь будет правильно обрабатываться Nginx.
    baseURL: '/api', // Используем относительный путь
});

export default apiClient;