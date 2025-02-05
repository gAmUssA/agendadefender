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
            return url.toString();
        } catch (error) {
            console.error('Error encoding text:', error);
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

    // Copy text to clipboard
    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Error copying to clipboard:', error);
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
        
        if (!textarea || !controlsWrapper || !runButton) {
            return;
        }

        // Create share button
        const shareButton = document.createElement('button');
        shareButton.id = 'share-url-button';
        shareButton.textContent = 'Share URL';
        shareButton.className = 'share-button';
        runButton.parentNode.insertBefore(shareButton, runButton);

        // Create message element
        const message = document.createElement('div');
        message.id = 'share-message';
        message.className = 'share-message';
        message.style.display = 'none';
        shareButton.parentNode.insertBefore(message, shareButton.nextSibling);

        // Load initial content
        const loadInitialContent = () => {
            const urlText = loadUrlHash();
            if (urlText) {
                textarea.value = urlText;
            } else {
                const savedText = loadFromStorage();
                if (savedText) {
                    textarea.value = savedText;
                }
            }
        };

        // Share URL handler
        shareButton.addEventListener('click', async (event) => {
            const text = textarea.value;
            const url = saveToUrlHash(text);
            if (url) {
                const success = await copyToClipboard(url);
                if (success) {
                    message.textContent = 'URL copied to clipboard!';
                    message.style.display = 'block';
                    return new Promise(resolve => {
                        setTimeout(() => {
                            message.style.display = 'none';
                            resolve();
                        }, 2000);
                    });
                }
            }
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
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeDom);
        } else {
            initializeDom();
        }
    }

    return {
        saveToUrlHash,
        loadUrlHash,
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
