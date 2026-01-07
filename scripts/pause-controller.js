/**
 * PauseController Module
 * Manages pause/resume functionality with accurate time tracking
 * Integrates with the existing timer architecture using timeOffset
 */

(function() {
    'use strict';

    // Pause state management
    let pauseState = {
        isPaused: false,
        pausedAt: null,           // Timestamp when paused
        totalPausedDuration: 0    // Accumulated paused time in ms
    };

    const PauseController = {
        // State management methods
        isPaused: function() {
            return pauseState.isPaused;
        },

        pause: function() {
            // Error handling: prevent multiple pause calls
            if (pauseState.isPaused) {
                console.warn('Timer is already paused');
                return false;
            }
            
            // Error handling: cannot pause if timer is not running
            if (!window.running) {
                console.warn('Cannot pause: timer is not running');
                return false;
            }

            pauseState.isPaused = true;
            pauseState.pausedAt = Date.now();
            
            // Update UI to show paused state
            this.updatePauseButton();
            this.showPausedIndicator();
            
            // Update keyboard shortcuts state (Requirements: 5.1)
            if (typeof KeyboardShortcuts !== 'undefined') {
                KeyboardShortcuts.updateTimerState({ isPaused: true });
            }
            
            console.log('Timer paused at:', new Date(pauseState.pausedAt));
            return true;
        },

        resume: function() {
            // Error handling: handle resume without pause
            if (!pauseState.isPaused) {
                console.warn('Timer is not paused');
                return false;
            }

            // Calculate paused duration and add to total
            const pauseDuration = Date.now() - pauseState.pausedAt;
            pauseState.totalPausedDuration += pauseDuration;
            
            // Adjust timeOffset to exclude paused time
            // Since timeOffset is added to Date.now(), we subtract the paused duration
            if (typeof window.timeOffset !== 'undefined') {
                window.timeOffset -= pauseDuration;
            }

            pauseState.isPaused = false;
            pauseState.pausedAt = null;
            
            // Update UI to show resumed state
            this.updatePauseButton();
            this.hidePausedIndicator();
            
            // Update keyboard shortcuts state (Requirements: 5.1)
            if (typeof KeyboardShortcuts !== 'undefined') {
                KeyboardShortcuts.updateTimerState({ isPaused: false });
            }
            
            console.log('Timer resumed, total paused duration:', pauseState.totalPausedDuration + 'ms');
            return true;
        },

        toggle: function() {
            if (pauseState.isPaused) {
                return this.resume();
            } else {
                return this.pause();
            }
        },

        // Time calculation methods
        getPausedDuration: function() {
            let total = pauseState.totalPausedDuration;
            
            // Add current pause duration if currently paused
            if (pauseState.isPaused && pauseState.pausedAt) {
                total += Date.now() - pauseState.pausedAt;
            }
            
            return total;
        },

        getEffectiveTime: function() {
            // Returns the effective time excluding paused duration
            const now = Date.now();
            const totalPaused = this.getPausedDuration();
            return now - totalPaused;
        },

        // UI update methods
        updatePauseButton: function() {
            const pauseButton = document.getElementById('pause-button');
            if (pauseButton) {
                const buttonText = pauseButton.querySelector('.button-text');
                const svg = pauseButton.querySelector('svg');
                
                if (pauseState.isPaused) {
                    // Show resume state
                    if (buttonText) {
                        buttonText.textContent = 'Resume';
                    } else {
                        // Fallback for simple button (testing)
                        pauseButton.textContent = 'Resume';
                    }
                    if (svg) {
                        // Change to play icon (triangle) - music player style
                        svg.innerHTML = '<polygon points="8 5 19 12 8 19 8 5" fill="currentColor"/>';
                    }
                    pauseButton.classList.add('paused');
                } else {
                    // Show pause state
                    if (buttonText) {
                        buttonText.textContent = 'Pause';
                    } else {
                        // Fallback for simple button (testing)
                        pauseButton.textContent = 'Pause';
                    }
                    if (svg) {
                        // Change to pause icon (two rectangles) - music player style
                        svg.innerHTML = '<rect x="7" y="4" width="3" height="16" rx="1.5"/><rect x="14" y="4" width="3" height="16" rx="1.5"/>';
                    }
                    pauseButton.classList.remove('paused');
                }
            }
        },

        showPausedIndicator: function() {
            // Add paused class to timer display for pulsing animation
            const timerDisplay = document.querySelector('.timer-display, .agenda-item');
            if (timerDisplay) {
                timerDisplay.classList.add('paused');
            }

            // Create or show pause icon badge overlay
            let pausedBadge = document.getElementById('paused-badge');
            if (!pausedBadge) {
                pausedBadge = document.createElement('div');
                pausedBadge.id = 'paused-badge';
                pausedBadge.className = 'paused-badge';
                
                // Create music player style pause icon SVG (larger, more visible)
                const pauseIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                pauseIcon.setAttribute('viewBox', '0 0 24 24');
                pauseIcon.setAttribute('fill', 'currentColor');
                // Music player style pause icon with rounded rectangles
                pauseIcon.innerHTML = '<rect x="5" y="3" width="5" height="18" rx="2" ry="2"/><rect x="14" y="3" width="5" height="18" rx="2" ry="2"/>';
                
                pausedBadge.appendChild(pauseIcon);
                
                // Insert badge into ticker area
                const ticker = document.getElementById('ticker');
                if (ticker) {
                    ticker.appendChild(pausedBadge);
                }
            }
            pausedBadge.style.display = 'block';
        },

        hidePausedIndicator: function() {
            // Remove paused class from timer display
            const timerDisplay = document.querySelector('.timer-display, .agenda-item');
            if (timerDisplay) {
                timerDisplay.classList.remove('paused');
            }

            // Hide "PAUSED" badge overlay
            const pausedBadge = document.getElementById('paused-badge');
            if (pausedBadge) {
                pausedBadge.style.display = 'none';
            }
        },

        // Reset method for cleaning up state
        reset: function() {
            pauseState.isPaused = false;
            pauseState.pausedAt = null;
            pauseState.totalPausedDuration = 0;
            
            this.hidePausedIndicator();
            this.updatePauseButton();
            
            console.log('PauseController reset');
        },

        // Method to check if timer should update (used by ticker)
        shouldUpdate: function() {
            return !pauseState.isPaused;
        },

        // Get current state for debugging/testing
        getState: function() {
            return {
                isPaused: pauseState.isPaused,
                pausedAt: pauseState.pausedAt,
                totalPausedDuration: pauseState.totalPausedDuration,
                currentPauseDuration: pauseState.isPaused && pauseState.pausedAt ? 
                    Date.now() - pauseState.pausedAt : 0
            };
        }
    };

    // Export for both browser and Node.js environments
    if (typeof window !== 'undefined') {
        window.PauseController = PauseController;
    }
    
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = PauseController;
    }

})();