/**
 * KeyboardShortcuts Module
 * 
 * Handles all keyboard input during presentation mode.
 * Provides shortcuts for timer control, navigation, and fullscreen.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
 */

const KeyboardShortcuts = (function() {
    'use strict';

    // Debug mode - set to true to enable console logging
    let debug = true;

    // Track enabled state
    let enabled = true;

    // Help overlay state
    let helpOverlayVisible = false;

    // Timer state tracking (will be connected to actual timer)
    let timerState = {
        isRunning: false,
        isMuted: false,
        currentSectionIndex: 0,
        totalSections: 0
    };

    // Callbacks for timer actions (to be set by integration)
    let callbacks = {
        onTogglePlayPause: null,
        onReset: null,
        onNextSection: null,
        onPrevSection: null,
        onToggleMute: null,
        onJumpToSection: null
    };

    /**
     * Debug log helper
     */
    function log(...args) {
        if (debug) {
            console.log('⌨️ [KeyboardShortcuts]', ...args);
        }
    }

    /**
     * Initialize keyboard listener
     * Requirements: 2.1-2.9
     */
    function initialize() {
        log('Initializing keyboard shortcuts...');
        document.addEventListener('keydown', handleKeydown);
        createHelpOverlay();
        log('Keyboard shortcuts initialized ✓');
    }

    /**
     * Set debug mode
     * @param {boolean} state - Whether debug mode should be enabled
     */
    function setDebug(state) {
        debug = state;
        log('Debug mode:', state ? 'enabled' : 'disabled');
    }

    /**
     * Set callbacks for timer actions
     * @param {Object} newCallbacks - Object with callback functions
     */
    function setCallbacks(newCallbacks) {
        callbacks = { ...callbacks, ...newCallbacks };
        log('Callbacks set:', Object.keys(newCallbacks));
    }

    /**
     * Update timer state
     * @param {Object} newState - New timer state
     */
    function updateTimerState(newState) {
        timerState = { ...timerState, ...newState };
        log('Timer state updated:', timerState);
    }

    /**
     * Get current timer state
     * @returns {Object} Current timer state
     */
    function getTimerState() {
        return { ...timerState };
    }

    /**
     * Enable or disable shortcuts
     * @param {boolean} state - Whether shortcuts should be enabled
     */
    function setEnabled(state) {
        enabled = state;
        log('Shortcuts', state ? 'enabled' : 'disabled');
    }

    /**
     * Check if shortcuts are enabled
     * @returns {boolean} Whether shortcuts are enabled
     */
    function isEnabled() {
        return enabled;
    }

    /**
     * Check if event should be ignored
     * Requirements: 2.8 - Skip shortcuts when focus is on INPUT/TEXTAREA
     * @param {KeyboardEvent} event - Keyboard event
     * @returns {boolean} True if event should be ignored
     */
    function shouldIgnoreEvent(event) {
        // Skip if typing in input/textarea (Requirements: 2.8)
        const tagName = event.target.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
            log('Ignoring - focus on', tagName);
            return true;
        }

        // Skip if shortcuts disabled
        if (!enabled) {
            log('Ignoring - shortcuts disabled');
            return true;
        }

        // Skip if modifier keys are pressed (avoid conflicts with browser shortcuts)
        if (event.ctrlKey || event.altKey || event.metaKey) {
            log('Ignoring - modifier key pressed');
            return true;
        }

        // Skip during IME composition (for international keyboard input)
        if (event.isComposing) {
            log('Ignoring - IME composing');
            return true;
        }

        return false;
    }


    /**
     * Main keydown handler
     * Requirements: 2.1-2.9
     * @param {KeyboardEvent} event - Keyboard event
     */
    function handleKeydown(event) {
        log('Key pressed:', event.code, event.key);

        // Check if we should ignore this event
        if (shouldIgnoreEvent(event)) {
            return;
        }

        // Define action mapping
        const actions = {
            'Space': togglePlayPause,           // Requirements: 2.1
            'KeyR': resetTimer,                 // Requirements: 2.2
            'KeyN': nextSection,                // Requirements: 2.3
            'ArrowRight': nextSection,          // Requirements: 2.3
            'KeyP': prevSection,                // Requirements: 2.4
            'ArrowLeft': prevSection,           // Requirements: 2.4
            'KeyF': toggleFullscreen,           // Requirements: 2.5
            'KeyM': toggleMute,                 // Requirements: 2.6
            'Escape': handleEscape,             // Requirements: 2.9
            'Slash': toggleHelpOverlay          // ? key for help (with shift)
        };

        // Handle ? key (Shift + /)
        if (event.code === 'Slash' && event.shiftKey) {
            event.preventDefault();
            log('Action: toggleHelpOverlay (?)');
            toggleHelpOverlay();
            return;
        }

        // Execute action if mapped
        if (actions[event.code]) {
            event.preventDefault();
            log('Action:', event.code);
            actions[event.code]();
            return;
        }

        // Handle number keys 1-9 for section jump (Requirements: 2.7)
        if (event.code.startsWith('Digit') && !event.shiftKey) {
            const num = parseInt(event.code.slice(5));
            if (num > 0 && num <= 9) {
                event.preventDefault();
                log('Action: jumpToSection', num);
                jumpToSection(num - 1);  // Convert to 0-based index
            }
        }
    }

    /**
     * Toggle play/pause state
     * Requirements: 2.1
     */
    function togglePlayPause() {
        log('togglePlayPause called, window.running:', typeof window !== 'undefined' ? window.running : 'N/A');
        
        if (callbacks.onTogglePlayPause) {
            callbacks.onTogglePlayPause(timerState.isRunning);
        } else {
            log('Warning: onTogglePlayPause callback not set');
        }
    }

    /**
     * Reset timer to beginning
     * Requirements: 2.2
     */
    function resetTimer() {
        log('resetTimer called');
        timerState.currentSectionIndex = 0;
        timerState.isRunning = false;
        
        if (callbacks.onReset) {
            callbacks.onReset();
        } else {
            log('Warning: onReset callback not set');
        }
    }

    /**
     * Skip to next section
     * Requirements: 2.3
     */
    function nextSection() {
        // Get actual current section from timer if available
        if (typeof getCurrentSectionIndex === 'function') {
            timerState.currentSectionIndex = getCurrentSectionIndex();
        }
        
        log('nextSection called, current:', timerState.currentSectionIndex, 'total:', timerState.totalSections);
        
        // Only advance if not at last section
        if (timerState.currentSectionIndex < timerState.totalSections - 1) {
            timerState.currentSectionIndex++;
            
            if (callbacks.onNextSection) {
                callbacks.onNextSection(timerState.currentSectionIndex);
            }
        } else {
            log('Already at last section');
        }
    }

    /**
     * Go to previous section
     * Requirements: 2.4
     */
    function prevSection() {
        // Get actual current section from timer if available
        if (typeof getCurrentSectionIndex === 'function') {
            timerState.currentSectionIndex = getCurrentSectionIndex();
        }
        
        log('prevSection called, current:', timerState.currentSectionIndex);
        
        // Only go back if not at first section
        if (timerState.currentSectionIndex > 0) {
            timerState.currentSectionIndex--;
            
            if (callbacks.onPrevSection) {
                callbacks.onPrevSection(timerState.currentSectionIndex);
            }
        } else {
            log('Already at first section');
        }
    }

    /**
     * Toggle fullscreen mode
     * Requirements: 2.5
     */
    function toggleFullscreen() {
        log('toggleFullscreen called');
        if (typeof FullscreenManager !== 'undefined') {
            FullscreenManager.toggle();
        } else {
            log('Warning: FullscreenManager not available');
        }
    }

    /**
     * Toggle audio mute state
     * Requirements: 2.6
     */
    function toggleMute() {
        log('toggleMute called');
        timerState.isMuted = !timerState.isMuted;
        
        if (callbacks.onToggleMute) {
            callbacks.onToggleMute(timerState.isMuted);
        }
    }

    /**
     * Handle Escape key
     * Requirements: 2.9
     */
    function handleEscape() {
        log('handleEscape called');
        
        // Close help overlay if visible
        if (helpOverlayVisible) {
            hideHelpOverlay();
            return;
        }
        
        // Exit fullscreen if active
        if (typeof FullscreenManager !== 'undefined' && FullscreenManager.getState()) {
            FullscreenManager.exit();
            return;
        }
        
        // Otherwise, stop meeting (handled by existing code)
    }

    /**
     * Jump to specific section by index
     * Requirements: 2.7
     * @param {number} index - 0-based section index
     */
    function jumpToSection(index) {
        log('jumpToSection called, index:', index, 'total:', timerState.totalSections);
        
        // Only jump if section exists
        if (index >= 0 && index < timerState.totalSections) {
            timerState.currentSectionIndex = index;
            
            if (callbacks.onJumpToSection) {
                callbacks.onJumpToSection(index);
            }
        } else {
            log('Section does not exist:', index);
        }
    }


    /**
     * Create help overlay element
     */
    function createHelpOverlay() {
        // Check if overlay already exists
        if (document.getElementById('keyboard-help-overlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'keyboard-help-overlay';
        overlay.className = 'keyboard-help-overlay';
        overlay.innerHTML = `
            <div class="keyboard-help-content">
                <h2>⌨️ Keyboard Shortcuts</h2>
                <button class="keyboard-help-close" aria-label="Close">&times;</button>
                <div class="keyboard-help-grid">
                    <div class="shortcut-group">
                        <h3>Playback</h3>
                        <div class="shortcut-item">
                            <kbd>Space</kbd>
                            <span>Play / Pause</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>R</kbd>
                            <span>Reset timer</span>
                        </div>
                    </div>
                    <div class="shortcut-group">
                        <h3>Navigation</h3>
                        <div class="shortcut-item">
                            <kbd>N</kbd> or <kbd>→</kbd>
                            <span>Next section</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>P</kbd> or <kbd>←</kbd>
                            <span>Previous section</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>1</kbd>-<kbd>9</kbd>
                            <span>Jump to section</span>
                        </div>
                    </div>
                    <div class="shortcut-group">
                        <h3>Display</h3>
                        <div class="shortcut-item">
                            <kbd>F</kbd>
                            <span>Toggle fullscreen</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>M</kbd>
                            <span>Toggle mute</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Esc</kbd>
                            <span>Exit / Close</span>
                        </div>
                    </div>
                    <div class="shortcut-group">
                        <h3>Help</h3>
                        <div class="shortcut-item">
                            <kbd>?</kbd>
                            <span>Show this help</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add click handler to close overlay
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay || e.target.classList.contains('keyboard-help-close')) {
                hideHelpOverlay();
            }
        });

        document.body.appendChild(overlay);
        log('Help overlay created');
    }

    /**
     * Toggle help overlay visibility
     */
    function toggleHelpOverlay() {
        if (helpOverlayVisible) {
            hideHelpOverlay();
        } else {
            showHelpOverlay();
        }
    }

    /**
     * Show help overlay
     */
    function showHelpOverlay() {
        const overlay = document.getElementById('keyboard-help-overlay');
        if (overlay) {
            overlay.classList.add('visible');
            helpOverlayVisible = true;
            log('Help overlay shown');
        }
    }

    /**
     * Hide help overlay
     */
    function hideHelpOverlay() {
        const overlay = document.getElementById('keyboard-help-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            helpOverlayVisible = false;
            log('Help overlay hidden');
        }
    }

    /**
     * Check if help overlay is visible
     * @returns {boolean} Whether help overlay is visible
     */
    function isHelpVisible() {
        return helpOverlayVisible;
    }

    /**
     * Cleanup event listeners
     */
    function destroy() {
        document.removeEventListener('keydown', handleKeydown);
        const overlay = document.getElementById('keyboard-help-overlay');
        if (overlay) {
            overlay.remove();
        }
        log('Keyboard shortcuts destroyed');
    }

    // Public API
    return {
        initialize: initialize,
        destroy: destroy,
        setDebug: setDebug,
        setCallbacks: setCallbacks,
        updateTimerState: updateTimerState,
        getTimerState: getTimerState,
        setEnabled: setEnabled,
        isEnabled: isEnabled,
        shouldIgnoreEvent: shouldIgnoreEvent,
        // Expose action methods for testing
        togglePlayPause: togglePlayPause,
        resetTimer: resetTimer,
        nextSection: nextSection,
        prevSection: prevSection,
        toggleFullscreen: toggleFullscreen,
        toggleMute: toggleMute,
        handleEscape: handleEscape,
        jumpToSection: jumpToSection,
        // Help overlay methods
        toggleHelpOverlay: toggleHelpOverlay,
        showHelpOverlay: showHelpOverlay,
        hideHelpOverlay: hideHelpOverlay,
        isHelpVisible: isHelpVisible
    };
})();

// Export for Node.js/testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardShortcuts;
}
