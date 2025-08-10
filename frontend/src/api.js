// frontend/src/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    // Здесь можно будет добавить другие настройки, например, заголовки
});

export default apiClient;