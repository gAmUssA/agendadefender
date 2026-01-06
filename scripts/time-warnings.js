/**
 * TimeWarnings Module
 * 
 * Provides traffic light color system for timer display based on remaining time.
 * Colors: green (>30s), yellow (10-30s), red (<10s), overtime (<=0)
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6
 */

const TimeWarnings = (function() {
    'use strict';

    // Color constants matching design spec
    const COLORS = {
        GREEN: '#22c55e',
        YELLOW: '#eab308',
        RED: '#ef4444'
    };

    // Threshold constants in milliseconds
    const THRESHOLDS = {
        YELLOW: 30000,  // 30 seconds
        RED: 10000      // 10 seconds
    };

    // CSS class names for warning states
    const WARNING_CLASSES = [
        'warning-green',
        'warning-yellow',
        'warning-red',
        'warning-overtime'
    ];

    /**
     * Get the appropriate warning class based on remaining time
     * @param {number} remainingMs - Remaining time in milliseconds
     * @returns {string} CSS class name for the warning state
     */
    function getWarningClass(remainingMs) {
        if (remainingMs <= 0) return 'warning-overtime';
        if (remainingMs <= THRESHOLDS.RED) return 'warning-red';
        if (remainingMs <= THRESHOLDS.YELLOW) return 'warning-yellow';
        return 'warning-green';
    }

    /**
     * Apply warning state to a DOM element
     * @param {HTMLElement} element - The element to apply warning to
     * @param {number} remainingMs - Remaining time in milliseconds
     */
    function applyWarning(element, remainingMs) {
        if (!element) return;

        // Remove all existing warning classes
        WARNING_CLASSES.forEach(function(cls) {
            element.classList.remove(cls);
        });

        // Add the appropriate warning class
        const warningClass = getWarningClass(remainingMs);
        element.classList.add(warningClass);
    }

    // Public API
    return {
        COLORS: COLORS,
        THRESHOLDS: THRESHOLDS,
        getWarningClass: getWarningClass,
        applyWarning: applyWarning
    };
})();

// Export for Node.js/testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeWarnings;
}
