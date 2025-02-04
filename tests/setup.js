// Mock jQuery
global.$ = jest.fn((selector) => ({
    html: jest.fn(),
    val: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    click: jest.fn(),
    on: jest.fn(),
    width: jest.fn(() => 100),
    css: jest.fn(),
    append: jest.fn(),
    addClass: jest.fn()
}));

// Mock window
global.window = {
    addEventListener: jest.fn(),
    innerHeight: 1000,
    matchMedia: jest.fn(() => ({
        matches: false,
        addEventListener: jest.fn()
    }))
};

// Mock document
global.document = {
    documentElement: {
        getAttribute: jest.fn(),
        setAttribute: jest.fn(),
        classList: {
            toggle: jest.fn()
        }
    },
    on: jest.fn()
};

// Mock localStorage
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn()
};

// Mock console methods
global.console = {
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};