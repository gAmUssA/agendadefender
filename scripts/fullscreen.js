/**
 * FullscreenManager Module
 * 
 * Wraps the Fullscreen API with cross-browser support for presentation mode.
 * Handles entering/exiting fullscreen, toggle functionality, and event listeners.
 * 
 * Requirements: 1.1, 1.5, 1.6, 1.7
 */

const FullscreenManager = (function() {
    'use strict';

    // Track fullscreen state
    let isFullscreen = false;

    /**
     * Check if Fullscreen API is supported
     * @returns {boolean} True if fullscreen is supported
     */
    function isSupported() {
        const el = document.documentElement;
        return !!(el.requestFullscreen || 
                  el.webkitRequestFullscreen || 
                  el.msRequestFullscreen);
    }

    /**
     * Enter fullscreen mode
     * Requirements: 1.1
     */
    function enter() {
        // Always update internal state and CSS class
        document.body.classList.add('fullscreen-mode');
        isFullscreen = true;

        // Try to use native Fullscreen API if supported
        if (isSupported()) {
            try {
                const el = document.documentElement;
                const requestMethod = el.requestFullscreen || 
                                      el.webkitRequestFullscreen || 
                                      el.msRequestFullscreen;
                
                if (requestMethod) {
                    const promise = requestMethod.call(el);
                    if (promise && promise.catch) {
                        promise.catch(function(err) {
                            console.warn('Fullscreen request failed:', err);
                        });
                    }
                }
            } catch (err) {
                console.warn('Fullscreen error:', err);
            }
        }
    }

    /**
     * Exit fullscreen mode
     * Requirements: 1.5, 1.6
     */
    function exit() {
        if (!isFullscreen) return;

        // Always update internal state and CSS class
        document.body.classList.remove('fullscreen-mode');
        isFullscreen = false;

        // Try to use native Fullscreen API if available
        try {
            const exitMethod = document.exitFullscreen || 
                              document.webkitExitFullscreen || 
                              document.msExitFullscreen;
            
            if (exitMethod) {
                const promise = exitMethod.call(document);
                if (promise && promise.catch) {
                    promise.catch(function(err) {
                        console.warn('Exit fullscreen failed:', err);
                    });
                }
            }
        } catch (err) {
            console.warn('Exit fullscreen error:', err);
        }
    }

    /**
     * Toggle fullscreen state
     * Requirements: 1.7
     * @returns {boolean} New fullscreen state after toggle
     */
    function toggle() {
        if (isFullscreen) {
            exit();
        } else {
            enter();
        }
        return isFullscreen;
    }

    /**
     * Get current fullscreen state
     * @returns {boolean} True if currently in fullscreen
     */
    function getState() {
        return isFullscreen;
    }

    /**
     * Set fullscreen state (for testing purposes)
     * @param {boolean} state - The state to set
     */
    function setState(state) {
        isFullscreen = state;
        document.body.classList.toggle('fullscreen-mode', state);
    }

    /**
     * Initialize fullscreen event listeners
     * Requirements: 1.5, 1.6
     */
    function initialize() {
        // Listen for fullscreen change events (browser-triggered)
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        // Listen for click to exit fullscreen (Requirements: 1.6)
        document.addEventListener('click', handleClick);

        // Listen for Escape key to exit fullscreen (Requirements: 1.5)
        document.addEventListener('keydown', handleKeydown);
    }

    /**
     * Handle fullscreen change events from browser
     */
    function handleFullscreenChange() {
        const fullscreenElement = document.fullscreenElement || 
                                   document.webkitFullscreenElement || 
                                   document.msFullscreenElement;
        
        isFullscreen = !!fullscreenElement;
        document.body.classList.toggle('fullscreen-mode', isFullscreen);
    }

    /**
     * Handle click events to exit fullscreen
     * Requirements: 1.6
     * @param {Event} event - Click event
     */
    function handleClick(event) {
        // Only exit if in fullscreen mode
        if (isFullscreen) {
            // Don't exit if clicking on controls or interactive elements
            const target = event.target;
            const isInteractive = target.tagName === 'BUTTON' || 
                                  target.tagName === 'INPUT' || 
                                  target.tagName === 'A' ||
                                  target.closest('button') ||
                                  target.closest('a');
            
            if (!isInteractive) {
                exit();
            }
        }
    }

    /**
     * Handle keydown events for fullscreen control
     * Requirements: 1.5, 1.7
     * @param {KeyboardEvent} event - Keyboard event
     */
    function handleKeydown(event) {
        // Skip if typing in input/textarea
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        // Skip if modifier keys are pressed
        if (event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }

        // Escape exits fullscreen (Requirements: 1.5)
        if (event.key === 'Escape' && isFullscreen) {
            exit();
            return;
        }

        // 'F' key toggles fullscreen (Requirements: 1.7)
        if (event.key === 'f' || event.key === 'F') {
            event.preventDefault();
            toggle();
        }
    }

    /**
     * Cleanup event listeners
     */
    function destroy() {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        document.removeEventListener('click', handleClick);
        document.removeEventListener('keydown', handleKeydown);
    }

    // Public API
    return {
        isSupported: isSupported,
        enter: enter,
        exit: exit,
        toggle: toggle,
        getState: getState,
        setState: setState,
        initialize: initialize,
        destroy: destroy
    };
})();

// Export for Node.js/testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FullscreenManager;
}
