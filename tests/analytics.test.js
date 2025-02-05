const Analytics = require('../scripts/analytics.js');

describe('Analytics Module', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Mock Umami
        global.umami = {
            track: jest.fn()
        };
    });

    afterEach(() => {
        delete global.umami;
    });

    describe('URL Events', () => {
        test('should track URL generation', () => {
            const textLength = 100;
            Analytics.trackUrlGenerated(textLength);
            expect(global.umami.track).toHaveBeenCalledWith('URL Generated', { textLength });
        });

        test('should track URL copying', () => {
            Analytics.trackUrlCopied();
            expect(global.umami.track).toHaveBeenCalledWith('URL Copied');
        });

        test('should track URL shortening', () => {
            Analytics.trackUrlShortened();
            expect(global.umami.track).toHaveBeenCalledWith('URL Shortened');
        });
    });

    describe('Timer Events', () => {
        test('should track timer start', () => {
            const duration = 300;
            Analytics.trackTimerStart(duration);
            expect(global.umami.track).toHaveBeenCalledWith('Timer Started', { timerType: duration });
        });

        test('should track timer stop', () => {
            const remainingTime = 120;
            Analytics.trackTimerStop(remainingTime);
            expect(global.umami.track).toHaveBeenCalledWith('Timer Stopped', { timerType: remainingTime, duration: NaN });
        });
    });

    describe('Theme Events', () => {
        test('should track theme change', () => {
            const theme = 'dark';
            Analytics.trackThemeChange(theme);
            expect(global.umami.track).toHaveBeenCalledWith('Theme Changed', { theme });
        });
    });

    describe('Error Events', () => {
        test('should track errors', () => {
            const category = 'url_shortening';
            const message = 'Failed to shorten URL';
            Analytics.trackError(category, message);
            expect(global.umami.track).toHaveBeenCalledWith('Error Occurred', { 
                errorType: category,
                errorMessage: message 
            });
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing umami gracefully', () => {
            delete global.umami;
            // These should not throw errors
            expect(() => Analytics.trackUrlGenerated(100)).not.toThrow();
            expect(() => Analytics.trackUrlCopied()).not.toThrow();
            expect(() => Analytics.trackUrlShortened()).not.toThrow();
            expect(() => Analytics.trackTimerStart(300)).not.toThrow();
            expect(() => Analytics.trackTimerStop(120)).not.toThrow();
            expect(() => Analytics.trackThemeChange('dark')).not.toThrow();
            expect(() => Analytics.trackError('test', 'error')).not.toThrow();
        });
    });
});
