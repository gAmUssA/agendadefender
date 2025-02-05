const UrlSharing = require('../scripts/url-sharing.js');

describe('URL Sharing Module', () => {
    let UrlSharing;
    const mockText = 'Test agenda\n15:00 First item\n15:15 Second item';
    const mockHash = '#Test%20agenda%20text';

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
    });

    beforeEach(async () => {
        // Reset modules before tests
        jest.resetModules();
        
        // Clear mocks and storage
        jest.clearAllMocks();
        localStorage.clear();
        window.location.hash = '';
        
        // Set up DOM with minimal required elements
        document.body.innerHTML = `
            <textarea id="agenda"></textarea>
            <div id="controls-wrapper">
                <button id="run-meeting-button">GO!</button>
                <button id="theme-toggle">Toggle Theme</button>
                <a id="lightning-talk" href="#">Lightning Talk</a>
                <a id="45-minute-talk" href="#">45 Minute Talk</a>
                <a id="absolute-example" href="#">Sample Agenda</a>
            </div>
            <div id="ticker"></div>
        `;
        
        // Set up localStorage with initial content for tests that need it
        localStorage.setItem('agenda_text', mockText);
        
        // Set readyState to complete to ensure immediate initialization
        Object.defineProperty(document, 'readyState', { value: 'complete', writable: true });
        
        // Load and initialize the module
        UrlSharing = require('../scripts/url-sharing.js');
        
        // Wait for any async operations to complete
        await new Promise(resolve => setTimeout(resolve, 0));
    });

    afterEach(() => {
        window.location.hash = '';
    });

    describe('Core Functionality', () => {
        test('should expose necessary properties and methods', () => {
            expect(UrlSharing.saveToUrlHash).toBeDefined();
            expect(UrlSharing.loadUrlHash).toBeDefined();
            expect(UrlSharing.saveToStorage).toBeDefined();
            expect(UrlSharing.loadFromStorage).toBeDefined();
            expect(UrlSharing.copyToClipboard).toBeDefined();
        });

        test('should encode text to URL hash', () => {
            const text = 'Test text with spaces';
            window.location.hash = '';
            const url = UrlSharing.saveToUrlHash(text);
            expect(url).toContain('#');
            expect(url).toContain(btoa(encodeURIComponent(text)));
        });

        test('should handle text larger than MAX_TEXT_SIZE', () => {
            const largeText = 'a'.repeat(UrlSharing.MAX_TEXT_SIZE + 1000);
            window.location.hash = '';
            const url = UrlSharing.saveToUrlHash(largeText);
            expect(url).toBeNull();
        });

        test('should load text from URL hash', () => {
            const text = 'Test text';
            const encoded = btoa(encodeURIComponent(text));
            window.location.hash = encoded;
            const result = UrlSharing.loadUrlHash();
            expect(result).toBe(text);
        });

        test('should handle invalid URL hash', () => {
            window.location.hash = '#%%%';
            const result = UrlSharing.loadUrlHash();
            expect(result).toBeNull();
        });
    });

    describe('Storage Operations', () => {
        test('should save text to localStorage', () => {
            UrlSharing.saveToStorage(mockText);
            expect(localStorage.setItem).toHaveBeenCalledWith(UrlSharing.STORAGE_KEY, mockText);
        });

        test('should load text from localStorage', () => {
            localStorage.setItem(UrlSharing.STORAGE_KEY, mockText);
            const result = UrlSharing.loadFromStorage();
            expect(result).toBe(mockText);
            expect(localStorage.getItem).toHaveBeenCalledWith(UrlSharing.STORAGE_KEY);
        });

        test('should handle localStorage errors', () => {
            const originalGetItem = localStorage.getItem;
            localStorage.getItem = jest.fn(() => {
                throw new Error('Storage error');
            });
            
            const result = UrlSharing.loadFromStorage();
            expect(result).toBeNull();
            
            // Restore original getItem
            localStorage.getItem = originalGetItem;
        });
    });

    describe('Clipboard Operations', () => {
        test('should copy text to clipboard', async () => {
            const result = await UrlSharing.copyToClipboard(mockText);
            expect(result).toBe(true);
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockText);
        });

        test('should handle clipboard errors', async () => {
            navigator.clipboard.writeText.mockImplementationOnce(() => Promise.reject('Clipboard error'));
            const result = await UrlSharing.copyToClipboard(mockText);
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

        test('should shorten URL successfully', async () => {
            const longUrl = 'https://example.com/very/long/url';
            const shortUrl = 'https://tinyurl.com/abc123';
            
            global.fetch.mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(shortUrl)
                })
            );

            const result = await UrlSharing.shortenUrl(longUrl);
            expect(result).toBe(shortUrl);
            expect(global.fetch).toHaveBeenCalledWith(
                `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
            );
        });

        test('should handle URL shortening failure', async () => {
            const longUrl = 'https://example.com/very/long/url';
            
            global.fetch.mockImplementationOnce(() =>
                Promise.resolve({
                    ok: false
                })
            );

            const result = await UrlSharing.shortenUrl(longUrl);
            expect(result).toBeNull();
        });

        test('should handle network errors', async () => {
            const longUrl = 'https://example.com/very/long/url';
            
            global.fetch.mockImplementationOnce(() =>
                Promise.reject(new Error('Network error'))
            );

            const result = await UrlSharing.shortenUrl(longUrl);
            expect(result).toBeNull();
        });
    });

    describe('DOM Integration', () => {
        test('should create share button and message elements', () => {
            const shareButton = document.getElementById('share-url-button');
            const message = document.getElementById('share-message');
            
            expect(shareButton).toBeTruthy();
            expect(message).toBeTruthy();
            expect(shareButton.textContent).toBe('Share URL');
            expect(shareButton.classList.contains('share-button')).toBe(true);
            expect(message.classList.contains('share-message')).toBe(true);
        });

        test('should save to localStorage on textarea input', () => {
            const textarea = document.getElementById('agenda');
            textarea.value = mockText;
            textarea.dispatchEvent(new Event('input'));
            
            expect(localStorage.setItem).toHaveBeenCalledWith(UrlSharing.STORAGE_KEY, mockText);
        });

        test('should save to localStorage when clicking GO button', () => {
            const textarea = document.getElementById('agenda');
            const goButton = document.getElementById('run-meeting-button');
            
            textarea.value = mockText;
            goButton.click();
            
            expect(localStorage.setItem).toHaveBeenCalledWith(UrlSharing.STORAGE_KEY, mockText);
        });

        test('should load initial content from URL hash', async () => {
            const encoded = btoa(encodeURIComponent(mockText));
            window.location.hash = encoded;
            
            // Load the module again to trigger initialization
            jest.resetModules();
            UrlSharing = require('../scripts/url-sharing.js');
            
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
                    <button id="run-meeting-button">GO!</button>
                    <button id="theme-toggle">Toggle Theme</button>
                    <a id="lightning-talk" href="#">Lightning Talk</a>
                    <a id="45-minute-talk" href="#">45 Minute Talk</a>
                    <a id="absolute-example" href="#">Sample Agenda</a>
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
            Object.defineProperty(document, 'readyState', { value: 'complete', writable: true });
            UrlSharing = require('../scripts/url-sharing.js');
            
            // Wait for any async operations
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify the content is loaded
            expect(textarea.value).toBe(mockText);
        });

        test('should show success message when sharing URL', async () => {
            // Set up DOM elements
            const textarea = document.getElementById('agenda');
            const shareButton = document.getElementById('share-url-button');
            const message = document.getElementById('share-message');
            
            // Set initial text
            textarea.value = mockText;
            
            // Mock clipboard and URL shortening failure
            navigator.clipboard.writeText.mockImplementation(() => Promise.resolve(true));
            global.fetch = jest.fn().mockImplementation(() =>
                Promise.resolve({
                    ok: false
                })
            );
            
            // Click the share button and wait for async operations
            shareButton.click();
            
            // Wait for the async operations to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify clipboard was called with the correct URL
            const encoded = btoa(encodeURIComponent(mockText));
            const expectedUrl = window.location.href + '#' + encoded;
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedUrl);
            expect(message.textContent).toBe('URL copied to clipboard! (URL shortening failed)');
            expect(message.style.display).toBe('block');
            
            // Wait for message to be hidden
            await new Promise(resolve => setTimeout(resolve, 2100));
            expect(message.style.display).toBe('none');
            
            // Clean up
            delete global.fetch;
        }, 10000);

        test('should show success message when sharing shortened URL', async () => {
            // Set up DOM elements
            const textarea = document.getElementById('agenda');
            const shareButton = document.getElementById('share-url-button');
            const message = document.getElementById('share-message');
            
            // Set initial text
            textarea.value = mockText;
            
            // Mock clipboard and URL shortening
            navigator.clipboard.writeText.mockImplementation(() => Promise.resolve(true));
            global.fetch = jest.fn().mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('https://tinyurl.com/abc123')
                })
            );
            
            // Click the share button and wait for async operations
            shareButton.click();
            
            // Wait for the async operations to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify the short URL was copied
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://tinyurl.com/abc123');
            expect(message.textContent).toBe('Short URL copied to clipboard!');
            expect(message.style.display).toBe('block');
            
            // Wait for message to be hidden
            await new Promise(resolve => setTimeout(resolve, 2100));
            expect(message.style.display).toBe('none');
            
            // Clean up
            delete global.fetch;
        });

        test('should handle URL shortening failure gracefully', async () => {
            // Set up DOM elements
            const textarea = document.getElementById('agenda');
            const shareButton = document.getElementById('share-url-button');
            const message = document.getElementById('share-message');
            
            // Set initial text
            textarea.value = mockText;
            
            // Mock clipboard and URL shortening failure
            navigator.clipboard.writeText.mockImplementation(() => Promise.resolve(true));
            global.fetch = jest.fn().mockImplementation(() =>
                Promise.resolve({
                    ok: false
                })
            );
            
            // Click the share button and wait for async operations
            shareButton.click();
            
            // Wait for the async operations to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify the original URL was copied as fallback
            const encoded = btoa(encodeURIComponent(mockText));
            const expectedUrl = window.location.href + '#' + encoded;
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedUrl);
            expect(message.textContent).toBe('URL copied to clipboard! (URL shortening failed)');
            expect(message.style.display).toBe('block');
            
            // Wait for message to be hidden
            await new Promise(resolve => setTimeout(resolve, 2100));
            expect(message.style.display).toBe('none');
            
            // Clean up
            delete global.fetch;
        });
    });
});
