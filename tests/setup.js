const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set up window and document
const { JSDOM } = require('jsdom');
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
    <textarea id="agenda"></textarea>
    <div id="controls-wrapper">
        <button id="run-meeting-button">GO!</button>
        <button id="theme-toggle">Toggle Theme</button>
        <button id="share-url-button">Share URL</button>
        <a id="lightning-talk" href="#">Lightning Talk</a>
        <a id="45-minute-talk" href="#">45 Minute Talk</a>
        <a id="absolute-example" href="#">Sample Agenda</a>
    </div>
    <div id="ticker"></div>
    <div id="share-message"></div>
    <a id="close-ticker" href="#">Close</a>
</body>
</html>`, {
    url: 'http://localhost',
    referrer: 'http://localhost',
    contentType: 'text/html',
    includeNodeLocations: true,
    storageQuota: 10000000,
    pretendToBeVisual: true,
    runScripts: 'dangerously'
});

// Set up global window and document
global.window = dom.window;
global.document = dom.window.document;

// Mock localStorage
const store = {};
const storageMock = {
    getItem: jest.fn(key => {
        const value = store[key];
        return value !== undefined ? value : null;
    }),
    setItem: jest.fn((key, value) => {
        store[key] = value ? value.toString() : '';
    }),
    clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
    }),
    removeItem: jest.fn(key => {
        delete store[key];
    }),
    key: jest.fn(index => Object.keys(store)[index] || null),
    get length() {
        return Object.keys(store).length;
    }
};

// Set up global storage
Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    writable: true,
    configurable: true,
    enumerable: true
});
global.localStorage = storageMock;

// Mock URL
class URLMock {
    constructor(url) {
        this.url = url;
        this._hash = '';
    }
    get hash() {
        return this._hash;
    }
    set hash(value) {
        this._hash = value ? '#' + value : '';
    }
    toString() {
        return this.url + this.hash;
    }
}
global.URL = URLMock;

// Mock clipboard
const clipboardMock = {
    writeText: jest.fn().mockImplementation(text => Promise.resolve(true))
};

// Set up navigator with clipboard
Object.defineProperty(window, 'navigator', {
    value: {
        userAgent: 'node.js',
        clipboard: clipboardMock
    },
    writable: true,
    configurable: true
});

// Ensure global navigator is updated
global.navigator = window.navigator;

// Mock jQuery
const jQueryMock = (selector) => {
    const elements = typeof selector === 'string' 
        ? document.querySelectorAll(selector)
        : [selector];
    
    const jQueryObject = {
        length: elements.length,
        val: jest.fn(function(value) {
            if (elements.length === 0) return '';
            if (value === undefined) {
                return elements[0].value || '';
            }
            elements.forEach(el => {
                if (el && typeof el.value !== 'undefined') {
                    el.value = value;
                }
            });
            return this;
        }),
        html: jest.fn(function(value) {
            if (elements.length === 0) return '';
            if (value === undefined) {
                return elements[0].innerHTML || '';
            }
            elements.forEach(el => {
                if (el) {
                    el.innerHTML = value;
                }
            });
            return this;
        }),
        text: jest.fn(function(value) {
            if (elements.length === 0) return '';
            if (value === undefined) {
                return elements[0].textContent || '';
            }
            elements.forEach(el => {
                if (el) {
                    el.textContent = value;
                }
            });
            return this;
        }),
        click: jest.fn(function(handler) {
            if (handler) {
                elements.forEach(el => {
                    if (el) {
                        el.addEventListener('click', handler);
                    }
                });
            } else {
                elements.forEach(el => {
                    if (el) {
                        el.click();
                    }
                });
            }
            return this;
        }),
        on: jest.fn(function(event, handler) {
            elements.forEach(el => {
                if (el) {
                    el.addEventListener(event, handler);
                }
            });
            return this;
        })
    };

    return jQueryObject;
};

// Add static methods to jQuery mock
jQueryMock.fn = {};
jQueryMock.extend = () => {};

global.$ = jest.fn(jQueryMock);
global.jQuery = global.$;

// Mock console methods
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};
