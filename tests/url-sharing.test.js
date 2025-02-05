const UrlSharing = require('../scripts/url-sharing.js');
const Analytics = require('../scripts/analytics.js');

describe('URL Sharing Module', () => {
    let urlSharing;
    const mockText = 'Test agenda\n15:00 First item\n15:15 Second item';

    beforeAll(() => {
        // Set up spies
        jest.spyOn(window.localStorage, 'getItem');
        jest.spyOn(window.localStorage, 'setItem');
        jest.spyOn(window.localStorage, 'clear');
        jest.spyOn(window.localStorage, 'removeItem');

        // Mock clipboard API
        Object.defineProperty(window.navigator, 'clipboard', {
            value: {
                writeText: jest.fn().mockResolvedValue(true)
            },
            writable: true
        });

        // Set up spies
        jest.spyOn(window.localStorage, 'getItem');
        jest.spyOn(window.localStorage, 'setItem');
        jest.spyOn(window.localStorage, 'clear');
        jest.spyOn(window.localStorage, 'removeItem');
    });

    beforeEach(() => {
        // Reset modules before tests
        jest.resetModules();

        // Clear mocks and storage
        jest.clearAllMocks();
        localStorage.clear();
        window.location.hash = '';

        // Set up fetch mock
        global.fetch = jest.fn(() => 
            Promise.resolve({
                ok: true,
                text: () => Promise.resolve('')
            })
        );

        // Set up DOM with minimal required elements
        document.body.innerHTML = `
            <textarea id="agenda"></textarea>
            <div id="controls-wrapper">
                <div id="blurb">
                    <ul>
                        <li><a id="lightning-talk" href="#">Lightning Talk</a></li>
                        <li><a id="45-minute-talk" href="#">45 Minute Talk</a></li>
                        <li><a id="absolute-example" href="#">Sample Agenda</a></li>
                    </ul>
                </div>
                <div class="button-group">
                    <button id="share-url">Share URL</button>
                    <input type="submit" value="GO!" id="run-meeting-button" />
                </div>
            </div>
            <div id="ticker"></div>
        `;

        // Set up localStorage with initial content for tests that need it
        localStorage.setItem('agenda_text', mockText);

        // Set readyState to complete to ensure immediate initialization
        Object.defineProperty(document, 'readyState', {value: 'complete', writable: true});

        // Load and initialize the module
        urlSharing = require('../scripts/url-sharing.js');
    });

    afterEach(() => {
        if (global.fetch) {
            global.fetch.mockClear();
        }

        window.location.hash = '';
    });

    afterAll(() => {
        delete global.fetch;
    });

    describe('Core Functionality', () => {
        test('should expose necessary properties and methods', () => {
            expect(urlSharing.saveToUrlHash).toBeDefined();
            expect(urlSharing.loadUrlHash).toBeDefined();
            expect(urlSharing.saveToStorage).toBeDefined();
            expect(urlSharing.loadFromStorage).toBeDefined();
            expect(urlSharing.copyToClipboard).toBeDefined();
        });

        test('should encode text to URL hash', () => {
            const text = 'Test text with spaces';
            window.location.hash = '';
            const url = urlSharing.saveToUrlHash(text);
            expect(url).toContain('#');
            expect(url).toContain(btoa(encodeURIComponent(text)));
        });

        test('should handle text larger than MAX_TEXT_SIZE', () => {
            const largeText = 'a'.repeat(urlSharing.MAX_TEXT_SIZE + 1000);
            window.location.hash = '';
            const url = urlSharing.saveToUrlHash(largeText);
            expect(url).toBeNull();
        });

        test('should load text from URL hash', () => {
            const text = 'Test text';
            const encoded = btoa(encodeURIComponent(text));
            window.location.hash = encoded;
            const result = urlSharing.loadUrlHash();
            expect(result).toBe(text);
        });

        test('should handle invalid URL hash', () => {
            window.location.hash = '#%%%';
            const result = urlSharing.loadUrlHash();
            expect(result).toBeNull();
        });
    });

    describe('URL Operations', () => {
        test('should generate and save URL hash', () => {
            const url = urlSharing.saveToUrlHash(mockText);
            expect(url).toBeTruthy();
            const hash = url.split('#')[1];
            expect(hash).toBeTruthy();
            expect(decodeURIComponent(atob(hash))).toBe(mockText);
        });

        test('should handle URL generation errors', () => {
            const longText = 'x'.repeat(9000); // Exceeds MAX_TEXT_SIZE
            const url = urlSharing.saveToUrlHash(longText);
            expect(url).toBeNull();
        });
    });

    describe('Storage Operations', () => {
        test('should save text to localStorage', () => {
            urlSharing.saveToStorage(mockText);
            expect(localStorage.setItem).toHaveBeenCalledWith(urlSharing.STORAGE_KEY, mockText);
        });

        test('should load text from localStorage', () => {
            localStorage.setItem(urlSharing.STORAGE_KEY, mockText);
            const result = urlSharing.loadFromStorage();
            expect(result).toBe(mockText);
            expect(localStorage.getItem).toHaveBeenCalledWith(urlSharing.STORAGE_KEY);
        });

        test('should handle localStorage errors', () => {
            const originalGetItem = localStorage.getItem;
            localStorage.getItem = jest.fn(() => {
                throw new Error('Storage error');
            });

            const result = urlSharing.loadFromStorage();
            expect(result).toBeNull();

            // Restore original getItem
            localStorage.getItem = originalGetItem;
        });
    });

    describe('Clipboard Operations', () => {
        test('should copy text to clipboard', async () => {
            const result = await urlSharing.copyToClipboard(mockText);
            expect(result).toBe(true);
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockText);
        });

        test('should handle clipboard errors', async () => {
            navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Clipboard error'));
            const result = await urlSharing.copyToClipboard(mockText);
            expect(result).toBe(false);
        });
    });

    describe('URL Shortening', () => {
        beforeEach(() => {
            // Mock fetch API
            global.fetch = jest.fn();
        });

        afterEach(() => {
            global.fetch.mockClear();
            delete global.fetch;
        });

        test('should shorten URL and track event', async () => {
            const longUrl = 'http://example.com/very/long/url';
            const shortUrl = 'http://tinyurl.com/abc123';

            global.fetch.mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(shortUrl)
                })
            );

            const result = await urlSharing.shortenUrl(longUrl);
            expect(result).toBe(shortUrl);
        });

        test('should handle shortening errors and track them', async () => {
            global.fetch.mockImplementationOnce(() =>
                Promise.resolve({
                    ok: false
                })
            );

            const result = await urlSharing.shortenUrl('http://example.com');
            expect(result).toBeNull();
        });

        test('should handle network errors', async () => {
            global.fetch.mockImplementationOnce(() =>
                Promise.reject(new Error('Network error'))
            );

            const result = await urlSharing.shortenUrl('http://example.com');
            expect(result).toBeNull();
        });
    });

    describe('DOM Integration', () => {
        test('should find share button and create message element', () => {
            const shareButton = document.getElementById('share-url');
            const message = document.getElementById('share-message');

            expect(shareButton).toBeTruthy();
            expect(shareButton.textContent).toBe('Share URL');
            expect(message).toBeTruthy();
            expect(message.style.display).toBe('none');
        });

        test('should save to localStorage on textarea input', () => {
            const textarea = document.getElementById('agenda');
            textarea.value = mockText;
            textarea.dispatchEvent(new Event('input'));

            expect(localStorage.setItem).toHaveBeenCalledWith(urlSharing.STORAGE_KEY, mockText);
        });

        test('should save to localStorage when clicking GO button', () => {
            const textarea = document.getElementById('agenda');
            const goButton = document.getElementById('run-meeting-button');

            textarea.value = mockText;
            goButton.click();

            expect(localStorage.setItem).toHaveBeenCalledWith(urlSharing.STORAGE_KEY, mockText);
        });

        test('should load initial content from URL hash', async () => {
            const encoded = btoa(encodeURIComponent(mockText));
            window.location.hash = encoded;

            // Load the module again to trigger initialization
            jest.resetModules();
            urlSharing = require('../scripts/url-sharing.js');

            const textarea = document.getElementById('agenda');
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(textarea.value).toBe(mockText);
        });

        test('should load initial content from localStorage when no URL hash', async () => {
            // Reset modules and clear storage
            jest.resetModules();
            localStorage.clear();
            window.location.hash = '';

            // Set up DOM with minimal required elements
            document.body.innerHTML = `
                <textarea id="agenda"></textarea>
                <div id="controls-wrapper">
                    <div id="blurb">
                        <ul>
                            <li><a id="lightning-talk" href="#">Lightning Talk</a></li>
                            <li><a id="45-minute-talk" href="#">45 Minute Talk</a></li>
                            <li><a id="absolute-example" href="#">Sample Agenda</a></li>
                        </ul>
                    </div>
                    <div class="button-group">
                        <button id="share-url">Share URL</button>
                        <input type="submit" value="GO!" id="run-meeting-button" />
                    </div>
                </div>
                <div id="ticker"></div>
            `;

            // Set up localStorage with initial content
            localStorage.setItem('agenda_text', mockText);

            // Get the textarea element and verify it exists
            const textarea = document.getElementById('agenda');
            expect(textarea).toBeTruthy();

            // Verify localStorage has the correct content
            expect(localStorage.getItem('agenda_text')).toBe(mockText);

            // Set readyState to complete and initialize module
            Object.defineProperty(document, 'readyState', {value: 'complete', writable: true});
            urlSharing = require('../scripts/url-sharing.js');

            // Wait for any async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify the content is loaded
            expect(textarea.value).toBe(mockText);
        });

        test('should show success message when sharing URL', async () => {
            // Set up DOM elements
            const textarea = document.getElementById('agenda');
            const shareButton = document.getElementById('share-url');
            const message = document.getElementById('share-message');

            // Mock successful URL shortening
            global.fetch.mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('https://tinyurl.com/abc123')
                })
            );

            // Set textarea value
            textarea.value = mockText;

            // Click the share button and wait for async operations
            shareButton.click();
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(message.style.display).toBe('block');
            expect(message.textContent).toContain('Short URL copied to clipboard!');
        });
    });
});
