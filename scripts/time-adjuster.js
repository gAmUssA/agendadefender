/**
 * TimeAdjuster Module
 * Provides manual time adjustment capabilities for the timer
 * Integrates with the existing timer architecture using timeOffset
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.5, 5.6, 5.7
 */

(function() {
    'use strict';

    // Configuration
    const DEFAULT_ADJUSTMENT_SECONDS = 30;

    // State tracking
    let adjustmentState = {
        totalAdjustments: 0,      // Total manual time adjustments in ms
        lastAdjustmentTime: null  // Timestamp of last adjustment
    };

    // Debounce tracking for concurrent operations
    let adjustmentLock = false;
    const LOCK_TIMEOUT = 50; // ms

    const TimeAdjuster = {
        /**
         * Add time to the current timer
         * Requirements: 3.1, 5.6
         * @param {number} seconds - Number of seconds to add (default: 30)
         * @returns {boolean} Whether the adjustment was successful
         */
        addTime: function(seconds) {
            seconds = seconds || DEFAULT_ADJUSTMENT_SECONDS;
            return this.adjustTime(seconds);
        },

        /**
         * Subtract time from the current timer
         * Requirements: 3.2, 5.7
         * @param {number} seconds - Number of seconds to subtract (default: 30)
         * @returns {boolean} Whether the adjustment was successful
         */
        subtractTime: function(seconds) {
            seconds = seconds || DEFAULT_ADJUSTMENT_SECONDS;
            return this.adjustTime(-seconds);
        },

        /**
         * Adjust time by extending or shortening the current section's duration
         * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
         * @param {number} deltaSeconds - Number of seconds to adjust (positive = extend section, negative = shorten section)
         * @returns {boolean} Whether the adjustment was successful
         */
        adjustTime: function(deltaSeconds) {
            // Handle concurrent operations with lock
            if (adjustmentLock) {
                console.warn('TimeAdjuster: Adjustment in progress, please wait');
                return false;
            }

            // Check if timer is running
            if (!window.running) {
                console.warn('TimeAdjuster: Cannot adjust time - timer is not running');
                return false;
            }

            // Get current agenda
            const agenda = window.currentAgenda;
            if (!agenda || agenda.length === 0) {
                console.warn('TimeAdjuster: No agenda available');
                return false;
            }

            // Set lock to prevent concurrent operations
            adjustmentLock = true;

            try {
                // Convert seconds to milliseconds
                const deltaMs = deltaSeconds * 1000;

                // Find the current section
                const currentIndex = this._getCurrentSectionIndex();
                const currentSection = agenda[currentIndex];
                
                if (!currentSection) {
                    console.warn('TimeAdjuster: No current section found');
                    return false;
                }

                // Calculate current time remaining in this section
                const effectiveTime = this.getCurrentEffectiveTime();
                const currentTimeRemaining = currentSection.concludesAt.getTime() - effectiveTime;
                
                // For subtraction, ensure we don't go below minimum (5 seconds remaining)
                // Requirements: 3.5
                const MIN_REMAINING_MS = 5000; // 5 seconds minimum
                if (deltaSeconds < 0) {
                    const newTimeRemaining = currentTimeRemaining + deltaMs; // deltaMs is negative
                    if (newTimeRemaining < MIN_REMAINING_MS) {
                        // Clamp to minimum
                        const clampedDelta = -(currentTimeRemaining - MIN_REMAINING_MS);
                        if (clampedDelta >= 0) {
                            console.log('TimeAdjuster: Already at minimum time remaining');
                            return false;
                        }
                        // Use clamped delta instead
                        this._adjustSectionDurations(currentIndex, clampedDelta);
                        console.log('TimeAdjuster: Clamped to minimum 5 seconds remaining');
                    } else {
                        this._adjustSectionDurations(currentIndex, deltaMs);
                    }
                } else {
                    // For addition, just extend the section
                    this._adjustSectionDurations(currentIndex, deltaMs);
                }

                // Track adjustment
                adjustmentState.totalAdjustments += deltaMs;
                adjustmentState.lastAdjustmentTime = Date.now();

                // Record adjustment in StateManager (Requirements: 7.4, 7.5)
                if (typeof StateManager !== 'undefined') {
                    StateManager.recordAdjustment(deltaMs);
                }

                // Update displays immediately (Requirements: 3.6, 3.7)
                this._triggerDisplayUpdate();

                // Check if adjustment caused timer to complete (Requirements: 7.5)
                // This handles edge case of adjusting past end time
                this._checkCompletionAfterAdjustment();

                console.log('TimeAdjuster: Extended/shortened section', currentIndex, 'by', deltaSeconds, 'seconds');
                return true;

            } finally {
                // Release lock after timeout
                setTimeout(function() {
                    adjustmentLock = false;
                }, LOCK_TIMEOUT);
            }
        },

        /**
         * Adjust section durations by extending/shortening current section and shifting subsequent sections
         * Requirements: 3.3, 3.4
         * @param {number} sectionIndex - Index of the section to adjust
         * @param {number} deltaMs - Milliseconds to add (positive) or subtract (negative)
         * @private
         */
        _adjustSectionDurations: function(sectionIndex, deltaMs) {
            const agenda = window.currentAgenda;
            if (!agenda || sectionIndex < 0 || sectionIndex >= agenda.length) {
                return;
            }

            // Extend/shorten the current section's end time
            const currentSection = agenda[sectionIndex];
            const newEndTime = new Date(currentSection.concludesAt.getTime() + deltaMs);
            currentSection.concludesAt = newEndTime;

            // Shift all subsequent sections by the same amount (Requirements: 3.3, 3.4)
            for (let i = sectionIndex + 1; i < agenda.length; i++) {
                const section = agenda[i];
                section.commencesAt = new Date(section.commencesAt.getTime() + deltaMs);
                section.concludesAt = new Date(section.concludesAt.getTime() + deltaMs);
            }

            console.log('TimeAdjuster: Adjusted section', sectionIndex, 'end time and shifted', 
                        agenda.length - sectionIndex - 1, 'subsequent sections by', deltaMs, 'ms');
        },

        /**
         * Get the current effective time position
         * @returns {number} Current effective time in ms since epoch
         */
        getCurrentEffectiveTime: function() {
            const now = Date.now();
            const offset = typeof window.timeOffset !== 'undefined' ? window.timeOffset : 0;
            
            // Exclude paused duration if PauseController is available
            let pausedDuration = 0;
            if (typeof PauseController !== 'undefined') {
                pausedDuration = PauseController.getPausedDuration();
            }
            
            return now + offset - pausedDuration;
        },

        /**
         * Get total manual adjustments made
         * @returns {number} Total adjustments in ms
         */
        getTotalAdjustments: function() {
            return adjustmentState.totalAdjustments;
        },

        /**
         * Get last adjustment timestamp
         * @returns {number|null} Timestamp of last adjustment or null
         */
        getLastAdjustmentTime: function() {
            return adjustmentState.lastAdjustmentTime;
        },

        /**
         * Reset adjustment state
         */
        reset: function() {
            adjustmentState.totalAdjustments = 0;
            adjustmentState.lastAdjustmentTime = null;
            adjustmentLock = false;
            console.log('TimeAdjuster: State reset');
        },

        /**
         * Check if timer should complete after adjustment
         * Requirements: 7.5
         * Handles edge case of adjusting past end time
         * @private
         */
        _checkCompletionAfterAdjustment: function() {
            const agenda = window.currentAgenda;
            if (!agenda || agenda.length === 0) {
                return;
            }

            const effectiveTime = this.getCurrentEffectiveTime();
            const lastSection = agenda[agenda.length - 1];
            
            // Check if we've adjusted past the end of the last section
            if (effectiveTime >= lastSection.concludesAt.getTime()) {
                console.log('TimeAdjuster: Adjustment caused timer to reach end');
                
                // Mark completion in StateManager
                if (typeof StateManager !== 'undefined') {
                    StateManager.markCompleted();
                }
                
                // Trigger normal completion - the ticker will handle this on next update
                // We don't call stopMeeting directly to avoid race conditions
            }
        },

        /**
         * Get current state for debugging/testing
         * @returns {Object} Current adjustment state
         */
        getState: function() {
            return {
                totalAdjustments: adjustmentState.totalAdjustments,
                lastAdjustmentTime: adjustmentState.lastAdjustmentTime,
                isLocked: adjustmentLock
            };
        },

        /**
         * Trigger display update after adjustment
         * Requirements: 3.4, 3.5
         * @private
         */
        _triggerDisplayUpdate: function() {
            // Update progress bar if available
            if (typeof ProgressBar !== 'undefined') {
                const currentIndex = this._getCurrentSectionIndex();
                ProgressBar.update(currentIndex);
            }

            // Update section navigator highlighting if available
            if (typeof SectionNavigator !== 'undefined') {
                SectionNavigator.highlightCurrentSection();
            }

            // Update keyboard shortcuts state if available
            if (typeof KeyboardShortcuts !== 'undefined') {
                const currentIndex = this._getCurrentSectionIndex();
                KeyboardShortcuts.updateTimerState({
                    currentSectionIndex: currentIndex
                });
            }
        },

        /**
         * Get current section index based on effective time
         * @private
         * @returns {number} Current section index
         */
        _getCurrentSectionIndex: function() {
            const agenda = window.currentAgenda;
            if (!agenda || agenda.length === 0) {
                return 0;
            }

            const effectiveTime = this.getCurrentEffectiveTime();

            for (let i = 0; i < agenda.length; i++) {
                if (effectiveTime < agenda[i].concludesAt.getTime()) {
                    return i;
                }
            }

            return agenda.length - 1;
        },

        /**
         * Create time adjustment UI buttons
         * Requirements: 4.5
         * @returns {HTMLElement} Container with adjustment buttons
         */
        createAdjustmentButtons: function() {
            const container = document.createElement('div');
            container.className = 'time-adjustment-buttons';
            container.id = 'time-adjustment-buttons';

            // Create -30s button
            const subtractButton = document.createElement('button');
            subtractButton.className = 'time-adjust-btn subtract-time';
            subtractButton.id = 'subtract-time-btn';
            subtractButton.setAttribute('aria-label', 'Subtract 30 seconds');
            subtractButton.innerHTML = '<span class="btn-icon">−</span><span class="btn-text">30s</span>';
            subtractButton.addEventListener('click', () => {
                this.subtractTime(DEFAULT_ADJUSTMENT_SECONDS);
            });

            // Create +30s button
            const addButton = document.createElement('button');
            addButton.className = 'time-adjust-btn add-time';
            addButton.id = 'add-time-btn';
            addButton.setAttribute('aria-label', 'Add 30 seconds');
            addButton.innerHTML = '<span class="btn-icon">+</span><span class="btn-text">30s</span>';
            addButton.addEventListener('click', () => {
                this.addTime(DEFAULT_ADJUSTMENT_SECONDS);
            });

            container.appendChild(subtractButton);
            container.appendChild(addButton);

            return container;
        },

        /**
         * Update adjustment UI state
         */
        updateAdjustmentUI: function() {
            const addBtn = document.getElementById('add-time-btn');
            const subtractBtn = document.getElementById('subtract-time-btn');

            // Enable/disable based on timer state
            const isRunning = window.running;
            
            if (addBtn) {
                addBtn.disabled = !isRunning;
            }
            if (subtractBtn) {
                subtractBtn.disabled = !isRunning;
            }
        },

        /**
         * Initialize keyboard shortcut integration
         * Requirements: 5.6, 5.7
         */
        initializeKeyboardShortcuts: function() {
            if (typeof KeyboardShortcuts !== 'undefined') {
                // Get existing callbacks
                const existingCallbacks = KeyboardShortcuts.getTimerState ? {} : {};
                
                // Note: Keyboard shortcuts are handled in the main handleKeydown
                // This method is for future extensibility
                console.log('TimeAdjuster: Keyboard shortcuts ready (+, =, - keys)');
            }
        },

        /**
         * Destroy and clean up
         */
        destroy: function() {
            const container = document.getElementById('time-adjustment-buttons');
            if (container) {
                container.remove();
            }
            this.reset();
        }
    };

    // Export for both browser and Node.js environments
    if (typeof window !== 'undefined') {
        window.TimeAdjuster = TimeAdjuster;
    }
    
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = TimeAdjuster;
    }

})();
