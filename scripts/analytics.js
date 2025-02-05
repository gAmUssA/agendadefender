// Analytics Module
const Analytics = {
    // Timer events
    trackTimerStart: (timerType) => {
        if (typeof window !== 'undefined' && window.umami) {
            umami.track('Timer Started', { timerType });
        }
    },

    trackTimerStop: (timerType, duration) => {
        if (typeof window !== 'undefined' && window.umami) {
            umami.track('Timer Stopped', { 
                timerType,
                duration: Math.floor(duration / 1000) // Convert to seconds
            });
        }
    },

    // Theme events
    trackThemeChange: (newTheme) => {
        if (typeof window !== 'undefined' && window.umami) {
            umami.track('Theme Changed', { theme: newTheme });
        }
    },

    // URL sharing events
    trackUrlGenerated: (textLength) => {
        if (typeof window !== 'undefined' && window.umami) {
            umami.track('URL Generated', { textLength });
        }
    },

    trackUrlCopied: () => {
        if (typeof window !== 'undefined' && window.umami) {
            umami.track('URL Copied');
        }
    },

    trackUrlShortened: () => {
        if (typeof window !== 'undefined' && window.umami) {
            umami.track('URL Shortened');
        }
    },

    // Error events
    trackError: (errorType, errorMessage) => {
        if (typeof window !== 'undefined' && window.umami) {
            umami.track('Error Occurred', { 
                errorType,
                errorMessage
            });
        }
    }
};

// Export for Node.js environment (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Analytics;
}
