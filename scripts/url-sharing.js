// URL Sharing Module
const UrlSharing = (() => {
    const MAX_TEXT_SIZE = 8000; // 8KB
    const STORAGE_KEY = 'agenda_text';

    // Save text to URL hash
    const saveToUrlHash = (text) => {
        try {
            if (text.length > MAX_TEXT_SIZE) {
                throw new Error('Text is too large for URL sharing');
            }
            const encoded = btoa(encodeURIComponent(text));
            const url = new URL(window.location.href);
            url.hash = encoded;
            Analytics.trackUrlGenerated(text.length);
            return url.toString();
        } catch (error) {
            console.error('Error encoding text:', error);
            Analytics.trackError('url_encoding', error.message);
            return null;
        }
    };

    // Load text from URL hash
    const loadUrlHash = () => {
        try {
            const hash = window.location.hash.slice(1);
            if (hash) {
                return decodeURIComponent(atob(hash));
            }
            return null;
        } catch (error) {
            console.error('Error decoding text:', error);
            return null;
        }
    };

    // Shorten URL using Cloudflare Worker
    const shortenUrl = async (url) => {
        try {
            const response = await fetch('https://url-shortener.viktor-gamov.workers.dev', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to shorten URL');
            }

            const { shortUrl } = await response.json();
            Analytics.trackUrlShortened();
            return shortUrl;
        } catch (error) {
            console.error('Error shortening URL:', error);
            Analytics.trackError('url_shortening', error.message);
            return null;
        }
    };

    // Copy text to clipboard
    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            Analytics.trackUrlCopied();
            return true;
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            Analytics.trackError('clipboard', error.message);
            return false;
        }
    };

    // Save to localStorage
    const saveToStorage = (text) => {
        try {
            localStorage.setItem(STORAGE_KEY, text);
            return true;
        } catch (error) {
            console.error('Error saving to storage:', error);
            return false;
        }
    };

    // Load from localStorage
    const loadFromStorage = () => {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error loading from storage:', error);
            return null;
        }
    };

    // Initialize DOM elements and event handlers
    const initializeDom = () => {
        const textarea = document.getElementById('agenda');
        const controlsWrapper = document.getElementById('controls-wrapper');
        const runButton = document.getElementById('run-meeting-button');
        const shareButton = document.getElementById('share-url');

        if (!textarea || !controlsWrapper || !runButton || !shareButton) {
            return;
        }

        // Create message element
        const message = document.createElement('div');
        message.id = 'share-message';
        message.className = 'share-message';
        message.style.display = 'none';
        document.body.appendChild(message);

        // Load initial content
        const loadInitialContent = () => {
            console.log('[DEBUG_LOG] Loading initial content');
            const urlText = loadUrlHash();
            console.log('[DEBUG_LOG] URL text:', urlText);
            if (urlText) {
                console.log('[DEBUG_LOG] Setting textarea value from URL');
                textarea.value = urlText;
            } else {
                const savedText = loadFromStorage();
                console.log('[DEBUG_LOG] Storage text:', savedText);
                if (savedText) {
                    console.log('[DEBUG_LOG] Setting textarea value from storage');
                    textarea.value = savedText;
                }
            }
        };

        // Share URL handler
        shareButton.addEventListener('click', async (event) => {
            const text = textarea.value;
            const url = saveToUrlHash(text);
            if (url) {
                message.textContent = 'Shortening URL...';
                message.style.display = 'block';

                const shortUrl = await shortenUrl(url);
                if (shortUrl) {
                    await copyToClipboard(shortUrl);
                    message.textContent = 'Short URL copied to clipboard!';
                } else {
                    await copyToClipboard(url);
                    message.textContent = 'URL copied to clipboard! (URL shortening failed)';
                }

                // Hide message after 2 seconds
                setTimeout(() => {
                    message.style.display = 'none';
                }, 2000);
            }

            // Save to localStorage
            saveToStorage(textarea.value);
        });

        // Auto-save to localStorage
        textarea.addEventListener('input', () => {
            saveToStorage(textarea.value);
        });

        // Also save when clicking GO button
        runButton.addEventListener('click', () => {
            saveToStorage(textarea.value);
        });

        loadInitialContent();
    };

    // Initialize when DOM is ready
    if (typeof document !== 'undefined') {
        console.log('[DEBUG_LOG] Document readyState:', document.readyState);
        if (document.readyState === 'loading') {
            console.log('[DEBUG_LOG] Adding DOMContentLoaded listener');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('[DEBUG_LOG] DOMContentLoaded event fired');
                initializeDom();
            });
        } else {
            console.log('[DEBUG_LOG] Initializing immediately');
            initializeDom();
        }
    }

    return {
        saveToUrlHash,
        loadUrlHash,
        shortenUrl,
        copyToClipboard,
        saveToStorage,
        loadFromStorage,
        STORAGE_KEY,
        MAX_TEXT_SIZE
    };
})();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UrlSharing;
}
