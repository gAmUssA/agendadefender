/**
 * VibrationManager Module
 * 
 * Handles haptic feedback for mobile devices using the Navigator.vibrate() API.
 * Provides vibration notifications for timer events with graceful fallback.
 * 
 * BROWSER SUPPORT NOTE:
 * The Vibration API has LIMITED browser support:
 * - Safari (macOS & iOS): NOT SUPPORTED
 * - Firefox (desktop v129+): NOT SUPPORTED (removed)
 * - Chrome/Brave (desktop): API exists but no vibration hardware
 * - Chrome for Android: SUPPORTED
 * - Samsung Internet: SUPPORTED
 * - Opera Mobile: SUPPORTED
 * 
 * This module gracefully falls back to no-op when vibration is unavailable.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 * @see .kiro/specs/audio-alerts/design.md
 * @see https://caniuse.com/mdn-api_navigator_vibrate
 */

const VibrationManager = (function() {
    'use strict';

    // Vibration patterns (in milliseconds)
    // Requirements: 4.1, 4.2, 4.3
    const PATTERNS = {
        WARNING: [100],                           // Short buzz (10s warning)
        SECTION_END: [100, 50, 100],              // Double buzz (section complete)
        OVERTIME: [200, 100, 200, 100, 200]       // Urgent pattern (overtime)
    };

    // Track if we've logged the support status
    let supportLogged = false;

    /**
     * Check if vibration is supported
     * Note: Even if the API exists, it may not work on devices without vibration hardware
     * or on browsers that have removed support (Firefox 129+)
     * Requirements: 4.5
     * @returns {boolean} Whether Navigator.vibrate() is available
     */
    function isSupported() {
        const supported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
        
        // Log support status once for debugging
        if (!supportLogged && typeof console !== 'undefined') {
            supportLogged = true;
            if (!supported) {
                console.info('VibrationManager: Vibration API not available in this browser. ' +
                    'Haptic feedback will be disabled. This is expected on Safari, iOS, and Firefox 129+.');
            }
        }
        
        return supported;
    }

    /**
     * Trigger vibration with pattern
     * Requirements: 4.4
     * @param {number|number[]} pattern - Vibration pattern in milliseconds
     * @returns {boolean} Whether vibration was triggered successfully
     */
    function vibrate(pattern) {
        if (!isSupported()) return false;

        try {
            navigator.vibrate(pattern);
            return true;
        } catch (e) {
            console.warn('Vibration failed:', e);
            return false;
        }
    }

    /**
     * Vibrate for warning (10 seconds remaining)
     * Requirements: 4.1
     * @returns {boolean} Whether vibration was triggered
     */
    function vibrateWarning() {
        return vibrate(PATTERNS.WARNING);
    }

    /**
     * Vibrate for section end
     * Requirements: 4.2
     * @returns {boolean} Whether vibration was triggered
     */
    function vibrateSectionEnd() {
        return vibrate(PATTERNS.SECTION_END);
    }

    /**
     * Vibrate for overtime
     * Requirements: 4.3
     * @returns {boolean} Whether vibration was triggered
     */
    function vibrateOvertime() {
        return vibrate(PATTERNS.OVERTIME);
    }

    /**
     * Cancel any ongoing vibration
     * @returns {boolean} Whether cancel was successful
     */
    function cancel() {
        if (!isSupported()) return false;
        
        try {
            navigator.vibrate(0);
            return true;
        } catch (e) {
            console.warn('Vibration cancel failed:', e);
            return false;
        }
    }

    // Public API
    return {
        isSupported: isSupported,
        vibrate: vibrate,
        vibrateWarning: vibrateWarning,
        vibrateSectionEnd: vibrateSectionEnd,
        vibrateOvertime: vibrateOvertime,
        cancel: cancel,
        PATTERNS: PATTERNS
    };
})();

// Export for Node.js/testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VibrationManager;
}
