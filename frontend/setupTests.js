// frontend/src/setupTests.js
import '@testing-library/jest-dom';

// --- Глобальные моки ---

// 1. Мокируем axios
jest.mock('axios');

// 2. Мокируем window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// 3. Мокируем SVG-файлы
// Этот мок будет работать для всех импортов вида `import { ReactComponent as ... } from '.svg'`
jest.mock(
    /\.svg$/,
    () => {
        const React = require('react');
        const SvgMock = React.forwardRef((props, ref) => <svg ref={ref} {...props} />);
        return {
            ReactComponent: SvgMock,
            default: 'test-file-stub',
        };
    }
);

// 4. Мокируем Lottie Player
// Этот мок перехватит импорт Player и заменит его на пустой div
jest.mock('@lottiefiles/react-lottie-player', () => ({
    Player: () => <div data-testid="lottie-mock" />,
}));