// frontend/src/utils/telegram.js

const tg = window.Telegram.WebApp;

const tgMock = {
    ready: () => console.log('Mock TG: ready'),
    expand: () => console.log('Mock TG: expand'),
    close: () => console.log('Mock TG: close'),

    // ИЗМЕНЕНИЕ: Заменяем sendData на openTelegramLink для соответствия новой логике
    openTelegramLink: (url) => {
        console.log(`Mock TG: Попытка открыть ссылку: ${url}`);
        alert(`В реальном Telegram эта ссылка бы открылась:\n${url}`);
        // Для более удобной отладки можно открывать ссылку в новой вкладке
        // window.open(url, '_blank');
    },

    showAlert: (message) => alert(message),
    isVersionAtLeast: (version) => true, // Для отладки считаем, что все версии поддерживаются
    HapticFeedback: {
        notificationOccurred: (type) => console.log(`Mock Haptic: ${type}`),
    },
    BackButton: {
        show: () => console.log('Mock BackButton: show'),
        hide: () => console.log('Mock BackButton: hide'),
        onClick: (cb) => { console.log('Mock BackButton: onClick handler set'); },
        offClick: () => console.log('Mock BackButton: onClick handler removed'),
    },
    initDataUnsafe: {
        user: {
            first_name: 'Test',
            last_name: 'User'
        }
    }
};

export const useTelegram = () => {
    // Включаем заглушку, если tg объекта нет (например, в обычном браузере)
    return tg ? tg : tgMock;
};