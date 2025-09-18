// проект/frontend/src/utils/telegram.js

const tg = window.Telegram ? window.Telegram.WebApp : undefined;

const tgMock = {
    ready: () => console.log('Mock TG: ready'),
    expand: () => console.log('Mock TG: expand'),
    close: () => console.log('Mock TG: close'),
    openTelegramLink: (url) => {
        console.log(`Mock TG: Попытка открыть ссылку: ${url}`);
        window.open(url, '_blank'); // Для удобства в браузере
    },
    showAlert: (message) => alert(message),
    isVersionAtLeast: (version) => true,
    HapticFeedback: {
        notificationOccurred: (type) => console.log(`Mock Haptic: ${type}`),
    },
    BackButton: {
        show: () => console.log('Mock BackButton: show'),
        hide: () => console.log('Mock BackButton: hide'),
        onClick: (cb) => { console.log('Mock BackButton: onClick handler set'); },
        offClick: () => console.log('Mock BackButton: onClick handler removed'),
    },
    // ИЗМЕНЕНИЕ: Добавляем initData в заглушку
    initData: '', // В режиме разработки initData пуст
    initDataUnsafe: {
        user: {
            id: 123456789, // ID для заглушки
            first_name: 'Test',
            last_name: 'User'
        }
    }
};

export const useTelegram = () => {
    return tg || tgMock;
};