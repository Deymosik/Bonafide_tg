// frontend/src/pages/CartPage.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { SettingsProvider } from '../context/SettingsContext';
import CartPage from './CartPage';
import { useTelegram } from '../utils/telegram';

// --- Моки ---
// Нам нужны только эти, так как SVG и Lottie мокаются глобально в setupTests.js
jest.mock('../utils/telegram');
jest.mock('../context/SettingsContext', () => ({
    useSettings: () => ({
        free_shipping_threshold: '1500',
        manager_username: 'test_manager',
        cart_lottie_url: 'lottie.json',
    }),
    SettingsProvider: ({ children }) => <>{children}</>,
}));

const mockTg = {
    openTelegramLink: jest.fn(),
    close: jest.fn(),
    initDataUnsafe: { user: { first_name: 'Tester' } },
    BackButton: { show: jest.fn(), hide: jest.fn(), onClick: jest.fn(), offClick: jest.fn() },
};

// Вспомогательная функция для рендеринга с кастомным состоянием
const renderWithProviders = (ui, { providerProps }) => {
    return render(
        <MemoryRouter>
            <SettingsProvider>
                <CartContext.Provider {...providerProps}>
                    {ui}
                </CartContext.Provider>
            </SettingsProvider>
        </MemoryRouter>
    );
};

describe('CartPage Integration', () => {
    beforeEach(() => {
        useTelegram.mockReturnValue(mockTg);
    });

    it('should display empty cart message', () => {
        const providerProps = {
            value: {
                cartItems: [],
                discountInfo: { final_total: 0 },
            }
        };
        renderWithProviders(<CartPage />, { providerProps });
        expect(screen.getByText('Ваша корзина пуста')).toBeInTheDocument();
    });

    it('should display items and handle checkout', async () => {
        const providerProps = {
            value: {
                cartItems: [{ id: 1, name: 'Тестовый Товар 1', price: '1000.00', quantity: 1, main_image_thumbnail_url: 'img.jpg' }],
                updateQuantity: jest.fn(),
                clearCart: jest.fn(),
                discountInfo: {
                    subtotal: '1000.00',
                    discount_amount: '100.00',
                    final_total: '900.00',
                    applied_rule: 'Скидка 10%',
                },
            }
        };
        renderWithProviders(<CartPage />, { providerProps });

        expect(screen.getByText('Тестовый Товар 1')).toBeInTheDocument();
        expect(screen.getByText('900.00 ₽')).toBeInTheDocument();

        await userEvent.click(screen.getByText('Оформить заказ'));
        await userEvent.type(screen.getByPlaceholderText('Номер телефона'), '123456789');
        await userEvent.type(screen.getByPlaceholderText(/Адрес доставки/), 'Тестовый адрес');
        await userEvent.click(screen.getByText('Готово'));

        expect(mockTg.openTelegramLink).toHaveBeenCalledTimes(1);
    });
});