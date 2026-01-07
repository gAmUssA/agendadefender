/**
 * AlertTrigger Module
 * 
 * Coordinates audio and vibration alerts based on timer state.
 * Tracks alert states to prevent duplicate triggers and manages timing.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3
 * @see .kiro/specs/audio-alerts/design.md
 */

const AlertTrigger = (function() {
    'use strict';

    // Track alert states to prevent duplicate triggers
    let lastWarningTriggered = false;
    let lastSectionIndex = -1;
    let lastOvertimeAlert = 0;

    // Thresholds (in milliseconds)
    const THRESHOLDS = {
        WARNING: 10000,           // 10 seconds
        OVERTIME_REPEAT: 30000    // 30 seconds
    };

    /**
     * Check and trigger alerts based on remaining time
     * Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3
     * 
     * @param {number} remainingMs - Remaining time in milliseconds
     * @param {number} sectionIndex - Current section index
     * @param {boolean} isOvertime - Whether the talk is overtime
     * @returns {Object} Object indicating which alerts were triggered
     */
    function checkAlerts(remainingMs, sectionIndex, isOvertime) {
        const triggered = {
            warning: false,
            sectionEnd: false,
            overtime: false
        };

        // Get references to AudioManager and VibrationManager if available
        const audioManager = typeof AudioManager !== 'undefined' ? AudioManager : null;
        const vibrationManager = typeof VibrationManager !== 'undefined' ? VibrationManager : null;

        // Section changed - reset warning state and play section end
        // Requirements: 1.2, 4.2
        if (sectionIndex !== lastSectionIndex && lastSectionIndex !== -1) {
            if (audioManager) {
                audioManager.playSectionEnd();
            }
            if (vibrationManager) {
                vibrationManager.vibrateSectionEnd();
            }
            lastWarningTriggered = false;
            triggered.sectionEnd = true;
        }
        lastSectionIndex = sectionIndex;

        // Warning at 10 seconds
        // Requirements: 1.1, 4.1
        if (remainingMs <= THRESHOLDS.WARNING && remainingMs > 0 && !lastWarningTriggered) {
            if (audioManager) {
                audioManager.playWarning();
            }
            if (vibrationManager) {
                vibrationManager.vibrateWarning();
            }
            lastWarningTriggered = true;
            triggered.warning = true;
        }

        // Reset warning flag when above threshold
        if (remainingMs > THRESHOLDS.WARNING) {
            lastWarningTriggered = false;
        }

        // Overtime alerts (every 30 seconds)
        // Requirements: 1.3, 1.4, 4.3
        if (isOvertime) {
            const now = Date.now();
            if (lastOvertimeAlert === 0 || now - lastOvertimeAlert >= THRESHOLDS.OVERTIME_REPEAT) {
                if (audioManager) {
                    audioManager.playOvertime();
                }
                if (vibrationManager) {
                    vibrationManager.vibrateOvertime();
                }
                lastOvertimeAlert = now;
                triggered.overtime = true;
            }
        } else {
            lastOvertimeAlert = 0;
        }

        return triggered;
    }

    /**
     * Reset alert states
     * Call this when starting a new timer session
     */
    function reset() {
        lastWarningTriggered = false;
        lastSectionIndex = -1;
        lastOvertimeAlert = 0;
    }

    /**
     * Get current state (useful for testing)
     * @returns {Object} Current alert tracking state
     */
    function getState() {
        return {
            lastWarningTriggered: lastWarningTriggered,
            lastSectionIndex: lastSectionIndex,
            lastOvertimeAlert: lastOvertimeAlert
        };
    }

    /**
     * Set state (useful for testing)
     * @param {Object} state - State to set
     */
    function setState(state) {
        if (typeof state.lastWarningTriggered === 'boolean') {
            lastWarningTriggered = state.lastWarningTriggered;
        }
        if (typeof state.lastSectionIndex === 'number') {
            lastSectionIndex = state.lastSectionIndex;
        }
        if (typeof state.lastOvertimeAlert === 'number') {
            lastOvertimeAlert = state.lastOvertimeAlert;
        }
    }

    /**
     * Check if warning was triggered
     * @returns {boolean} Whether warning was triggered
     */
    function wasWarningTriggered() {
        return lastWarningTriggered;
    }

    /**
     * Get last section index
     * @returns {number} Last section index
     */
    function getLastSectionIndex() {
        return lastSectionIndex;
    }

    /**
     * Get last overtime alert timestamp
     * @returns {number} Timestamp of last overtime alert
     */
    function getLastOvertimeAlert() {
        return lastOvertimeAlert;
    }

    // Public API
    return {
        checkAlerts: checkAlerts,
        reset: reset,
        getState: getState,
        setState: setState,
        wasWarningTriggered: wasWarningTriggered,
        getLastSectionIndex: getLastSectionIndex,
        getLastOvertimeAlert: getLastOvertimeAlert,
        THRESHOLDS: THRESHOLDS
    };
})();

// Export for Node.js/testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertTrigger;
}
