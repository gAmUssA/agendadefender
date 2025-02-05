// Analytics Module
const Analytics = {
    isUmamiAvailable: false,
    
    init: function() {
        // Check if Umami is available after a short delay
        setTimeout(() => {
            this.isUmamiAvailable = typeof window !== 'undefined' && 
                                  typeof window.umami !== 'undefined' && 
                                  window.umami !== null;
            if (!this.isUmamiAvailable) {
                console.debug('Umami Analytics is not available (possibly blocked by an ad blocker)');
            }
        }, 1000);
    },

    // Timer events
    trackTimerStart: function(timerType) {
        if (typeof window !== 'undefined' && window.umami) {
            try {
                umami.track('Timer Started', { timerType });
            } catch (e) {
                console.debug('Failed to track timer start:', e);
            }
        }
    },

    trackTimerStop: function(timerType, duration) {
        if (typeof window !== 'undefined' && window.umami) {
            try {
                umami.track('Timer Stopped', { 
                    timerType,
                    duration: duration ? Math.floor(duration) : NaN // Convert to seconds if duration exists
                });
            } catch (e) {
                console.debug('Failed to track timer stop:', e);
            }
        }
    },

    // Theme events
    trackThemeChange: function(newTheme) {
        if (typeof window !== 'undefined' && window.umami) {
            try {
                umami.track('Theme Changed', { theme: newTheme });
            } catch (e) {
                console.debug('Failed to track theme change:', e);
            }
        }
    },

    // URL events
    trackUrlGenerated: function(textLength) {
        if (typeof window !== 'undefined' && window.umami) {
            try {
                umami.track('URL Generated', { textLength });
            } catch (e) {
                console.debug('Failed to track URL generation:', e);
            }
        }
    },

    trackUrlCopied: function() {
        if (typeof window !== 'undefined' && window.umami) {
            try {
                umami.track('URL Copied');
            } catch (e) {
                console.debug('Failed to track URL copy:', e);
            }
        }
    },

    trackUrlShortened: function() {
        if (typeof window !== 'undefined' && window.umami) {
            try {
                umami.track('URL Shortened');
            } catch (e) {
                console.debug('Failed to track URL shortening:', e);
            }
        }
    },

    // Error events
    trackError: function(errorType, errorMessage) {
        if (typeof window !== 'undefined' && window.umami) {
            try {
                umami.track('Error Occurred', {
                    errorType,
                    errorMessage
                });
            } catch (e) {
                console.debug('Failed to track error:', e);
            }
        }
    }
};

// Initialize analytics
if (typeof window !== 'undefined') {
    Analytics.init();
}

// Export for tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Analytics;
}
