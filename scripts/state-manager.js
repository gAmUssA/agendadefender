/**
 * StateManager Module
 * Provides comprehensive state management for timer controls
 * Ensures all UI components reflect the same timer state
 * Validates state transitions and handles concurrent operations safely
 * 
 * Requirements: 7.1, 7.4, 7.5
 */

(function() {
    'use strict';

    // Central timer state
    let timerState = {
        isRunning: false,
        isPaused: false,
        currentSectionIndex: 0,
        totalSections: 0,
        pausedAt: null,
        totalPausedDuration: 0,
        manualAdjustments: 0,
        lastAdjustmentTime: null,
        startTime: null,
        completionTriggered: false
    };

    // State change listeners
    let stateListeners = [];

    // Operation lock for concurrent operation safety
    let operationLock = false;
    const LOCK_TIMEOUT = 100; // ms

    // State validation rules
    const stateValidationRules = {
        // isPaused can only be true if isRunning is true
        pauseRequiresRunning: (state) => {
            if (state.isPaused && !state.isRunning) {
                return { valid: false, message: 'Cannot be paused when not running' };
            }
            return { valid: true };
        },
        
        // currentSectionIndex must be within bounds
        sectionIndexInBounds: (state) => {
            if (state.totalSections > 0 && 
                (state.currentSectionIndex < 0 || state.currentSectionIndex >= state.totalSections)) {
                return { valid: false, message: 'Section index out of bounds' };
            }
            return { valid: true };
        },
        
        // pausedAt should only be set when isPaused is true
        pausedAtConsistency: (state) => {
            if (state.isPaused && state.pausedAt === null) {
                return { valid: false, message: 'pausedAt should be set when paused' };
            }
            if (!state.isPaused && state.pausedAt !== null) {
                return { valid: false, message: 'pausedAt should be null when not paused' };
            }
            return { valid: true };
        },
        
        // totalPausedDuration should be non-negative
        pausedDurationNonNegative: (state) => {
            if (state.totalPausedDuration < 0) {
                return { valid: false, message: 'totalPausedDuration cannot be negative' };
            }
            return { valid: true };
        }
    };

    const StateManager = {
        /**
         * Get the current timer state
         * @returns {Object} Copy of the current state
         */
        getState: function() {
            return { ...timerState };
        },

        /**
         * Update the timer state with validation
         * Requirements: 7.1, 7.4
         * @param {Object} updates - State properties to update
         * @returns {boolean} Whether the update was successful
         */
        updateState: function(updates) {
            // Create proposed new state
            const proposedState = { ...timerState, ...updates };
            
            // Validate the proposed state
            const validation = this.validateState(proposedState);
            if (!validation.valid) {
                console.warn('StateManager: Invalid state update rejected:', validation.message);
                return false;
            }
            
            // Apply the update
            const previousState = { ...timerState };
            timerState = proposedState;
            
            // Notify listeners
            this._notifyListeners(previousState, timerState);
            
            return true;
        },

        /**
         * Validate a state object against all rules
         * @param {Object} state - State to validate
         * @returns {Object} Validation result { valid: boolean, message?: string }
         */
        validateState: function(state) {
            for (const ruleName in stateValidationRules) {
                const result = stateValidationRules[ruleName](state);
                if (!result.valid) {
                    return result;
                }
            }
            return { valid: true };
        },

        /**
         * Check if the current state is consistent
         * Requirements: 7.1
         * @returns {Object} Consistency check result
         */
        checkStateConsistency: function() {
            const issues = [];
            
            // Check PauseController consistency
            if (typeof PauseController !== 'undefined') {
                const pauseState = PauseController.isPaused();
                if (pauseState !== timerState.isPaused) {
                    issues.push({
                        component: 'PauseController',
                        expected: timerState.isPaused,
                        actual: pauseState,
                        property: 'isPaused'
                    });
                }
            }
            
            // Check KeyboardShortcuts consistency
            if (typeof KeyboardShortcuts !== 'undefined' && KeyboardShortcuts.getTimerState) {
                const kbState = KeyboardShortcuts.getTimerState();
                if (kbState.isRunning !== timerState.isRunning) {
                    issues.push({
                        component: 'KeyboardShortcuts',
                        expected: timerState.isRunning,
                        actual: kbState.isRunning,
                        property: 'isRunning'
                    });
                }
                if (kbState.currentSectionIndex !== timerState.currentSectionIndex) {
                    issues.push({
                        component: 'KeyboardShortcuts',
                        expected: timerState.currentSectionIndex,
                        actual: kbState.currentSectionIndex,
                        property: 'currentSectionIndex'
                    });
                }
            }
            
            return {
                consistent: issues.length === 0,
                issues: issues
            };
        },

        /**
         * Synchronize all UI components with the current state
         * Requirements: 7.1
         */
        synchronizeUIComponents: function() {
            // Update PauseController
            if (typeof PauseController !== 'undefined') {
                PauseController.updatePauseButton();
                if (timerState.isPaused) {
                    PauseController.showPausedIndicator();
                } else {
                    PauseController.hidePausedIndicator();
                }
            }
            
            // Update KeyboardShortcuts
            if (typeof KeyboardShortcuts !== 'undefined') {
                KeyboardShortcuts.updateTimerState({
                    isRunning: timerState.isRunning,
                    isPaused: timerState.isPaused,
                    currentSectionIndex: timerState.currentSectionIndex,
                    totalSections: timerState.totalSections
                });
            }
            
            // Update SectionNavigator
            if (typeof SectionNavigator !== 'undefined') {
                SectionNavigator.highlightCurrentSection();
            }
            
            // Update ProgressBar
            if (typeof ProgressBar !== 'undefined') {
                ProgressBar.update(timerState.currentSectionIndex);
            }
            
            // Update TimeAdjuster UI
            if (typeof TimeAdjuster !== 'undefined') {
                TimeAdjuster.updateAdjustmentUI();
            }
        },

        /**
         * Execute an operation with lock protection
         * Requirements: 7.4
         * @param {Function} operation - Operation to execute
         * @returns {*} Result of the operation
         */
        executeWithLock: function(operation) {
            if (operationLock) {
                console.warn('StateManager: Operation blocked - another operation in progress');
                return null;
            }
            
            operationLock = true;
            
            try {
                return operation();
            } finally {
                setTimeout(function() {
                    operationLock = false;
                }, LOCK_TIMEOUT);
            }
        },

        /**
         * Check if an operation is currently in progress
         * @returns {boolean} Whether an operation is locked
         */
        isOperationLocked: function() {
            return operationLock;
        },

        /**
         * Add a state change listener
         * @param {Function} listener - Callback function(previousState, newState)
         */
        addListener: function(listener) {
            if (typeof listener === 'function') {
                stateListeners.push(listener);
            }
        },

        /**
         * Remove a state change listener
         * @param {Function} listener - Listener to remove
         */
        removeListener: function(listener) {
            const index = stateListeners.indexOf(listener);
            if (index > -1) {
                stateListeners.splice(index, 1);
            }
        },

        /**
         * Notify all listeners of state change
         * @private
         */
        _notifyListeners: function(previousState, newState) {
            stateListeners.forEach(function(listener) {
                try {
                    listener(previousState, newState);
                } catch (e) {
                    console.error('StateManager: Listener error:', e);
                }
            });
        },

        /**
         * Initialize state from running timer
         * @param {Object} agenda - Current agenda
         */
        initializeFromTimer: function(agenda) {
            this.updateState({
                isRunning: true,
                isPaused: false,
                currentSectionIndex: 0,
                totalSections: agenda ? agenda.length : 0,
                pausedAt: null,
                totalPausedDuration: 0,
                manualAdjustments: 0,
                lastAdjustmentTime: null,
                startTime: Date.now(),
                completionTriggered: false
            });
        },

        /**
         * Reset state to initial values
         */
        reset: function() {
            timerState = {
                isRunning: false,
                isPaused: false,
                currentSectionIndex: 0,
                totalSections: 0,
                pausedAt: null,
                totalPausedDuration: 0,
                manualAdjustments: 0,
                lastAdjustmentTime: null,
                startTime: null,
                completionTriggered: false
            };
            operationLock = false;
            stateListeners = [];
        },

        /**
         * Mark timer as completed
         * Requirements: 7.5
         */
        markCompleted: function() {
            this.updateState({
                completionTriggered: true
            });
        },

        /**
         * Check if timer has completed
         * @returns {boolean} Whether completion has been triggered
         */
        isCompleted: function() {
            return timerState.completionTriggered;
        },

        /**
         * Update current section index
         * @param {number} index - New section index
         * @returns {boolean} Whether update was successful
         */
        setCurrentSection: function(index) {
            return this.updateState({
                currentSectionIndex: index
            });
        },

        /**
         * Record a manual time adjustment
         * @param {number} adjustmentMs - Adjustment in milliseconds
         */
        recordAdjustment: function(adjustmentMs) {
            this.updateState({
                manualAdjustments: timerState.manualAdjustments + adjustmentMs,
                lastAdjustmentTime: Date.now()
            });
        },

        /**
         * Get validation rules for testing
         * @returns {Object} Validation rules
         */
        getValidationRules: function() {
            return { ...stateValidationRules };
        }
    };

    // Export for both browser and Node.js environments
    if (typeof window !== 'undefined') {
        window.StateManager = StateManager;
    }
    
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = StateManager;
    }

})();
