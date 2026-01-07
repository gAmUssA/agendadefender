/**
 * TouchGestureHandler Module
 * 
 * Handles mobile touch interactions and gestures for timer control.
 * Provides swipe detection for section navigation and tap-to-pause functionality.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

const TouchGestureHandler = (function() {
    'use strict';

    // Debug mode - set to true to enable console logging
    let debug = false;

    // Configuration constants
    const CONFIG = {
        MIN_SWIPE_DISTANCE: 50,    // Minimum swipe distance in pixels (Requirements: 6.6)
        MIN_TOUCH_TARGET: 44,      // Minimum touch target size for accessibility (Requirements: 6.5)
        SWIPE_TIMEOUT: 300,        // Maximum time for swipe gesture (ms)
        TAP_MAX_DISTANCE: 10,      // Maximum movement for a tap (px)
        TAP_MAX_DURATION: 200      // Maximum duration for a tap (ms)
    };

    // Touch state tracking
    let touchState = {
        startX: 0,
        startY: 0,
        startTime: 0,
        isTracking: false,
        touchCount: 0,
        targetElement: null
    };

    // Initialization state
    let initialized = false;
    let boundHandlers = {
        touchStart: null,
        touchEnd: null,
        touchCancel: null
    };

    /**
     * Debug log helper
     */
    function log(...args) {
        if (debug) {
            console.log('👆 [TouchGestureHandler]', ...args);
        }
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
     * Get configuration value
     * @param {string} key - Configuration key
     * @returns {number} Configuration value
     */
    function getConfig(key) {
        return CONFIG[key];
    }

    /**
     * Set minimum swipe distance
     * @param {number} pixels - Minimum swipe distance in pixels
     */
    function setMinSwipeDistance(pixels) {
        if (typeof pixels === 'number' && pixels > 0) {
            CONFIG.MIN_SWIPE_DISTANCE = pixels;
            log('Min swipe distance set to:', pixels);
        }
    }

    /**
     * Set minimum touch target size
     * @param {number} pixels - Minimum touch target size in pixels
     */
    function setTouchTargetSize(pixels) {
        if (typeof pixels === 'number' && pixels > 0) {
            CONFIG.MIN_TOUCH_TARGET = pixels;
            log('Min touch target size set to:', pixels);
        }
    }

    /**
     * Handle touch start event
     * Requirements: 6.1, 6.2, 6.6, 6.7
     * @param {TouchEvent} event - Touch event
     */
    function handleTouchStart(event) {
        // Multi-touch prevention (Requirements: 6.7)
        if (event.touches.length > 1) {
            log('Multi-touch detected, ignoring gesture');
            touchState.isTracking = false;
            return;
        }

        const touch = event.touches[0];
        
        touchState.startX = touch.clientX;
        touchState.startY = touch.clientY;
        touchState.startTime = Date.now();
        touchState.isTracking = true;
        touchState.touchCount = event.touches.length;
        touchState.targetElement = event.target;

        log('Touch start:', { x: touchState.startX, y: touchState.startY });
    }

    /**
     * Handle touch end event
     * Requirements: 6.1, 6.2, 6.3, 6.6
     * @param {TouchEvent} event - Touch event
     */
    function handleTouchEnd(event) {
        if (!touchState.isTracking) {
            log('Not tracking, ignoring touch end');
            return;
        }

        // Multi-touch prevention (Requirements: 6.7)
        if (touchState.touchCount > 1) {
            log('Multi-touch gesture ended, ignoring');
            resetTouchState();
            return;
        }

        const touch = event.changedTouches[0];
        const endX = touch.clientX;
        const endY = touch.clientY;
        const endTime = Date.now();

        const deltaX = endX - touchState.startX;
        const deltaY = endY - touchState.startY;
        const duration = endTime - touchState.startTime;
        const distance = Math.abs(deltaX);

        log('Touch end:', { 
            deltaX, 
            deltaY, 
            distance, 
            duration,
            minSwipeDistance: CONFIG.MIN_SWIPE_DISTANCE 
        });

        // Check if this is a tap (Requirements: 6.3)
        if (isTap(deltaX, deltaY, duration)) {
            log('Tap detected');
            handleTap(event);
            resetTouchState();
            return;
        }

        // Check if this is a valid swipe (Requirements: 6.1, 6.2, 6.6)
        const swipeDirection = detectSwipe(touchState.startX, endX, deltaY, duration);
        
        if (swipeDirection) {
            log('Swipe detected:', swipeDirection);
            handleSwipe(swipeDirection);
            
            // Provide visual feedback (Requirements: 6.4)
            provideVisualFeedback(swipeDirection);
            
            // Provide haptic feedback where supported (Requirements: 6.4)
            provideHapticFeedback();
        }

        resetTouchState();
    }

    /**
     * Handle touch cancel event
     * @param {TouchEvent} event - Touch event
     */
    function handleTouchCancel(event) {
        log('Touch cancelled');
        resetTouchState();
    }

    /**
     * Reset touch state
     */
    function resetTouchState() {
        touchState.startX = 0;
        touchState.startY = 0;
        touchState.startTime = 0;
        touchState.isTracking = false;
        touchState.touchCount = 0;
        touchState.targetElement = null;
    }

    /**
     * Check if the gesture is a tap
     * @param {number} deltaX - Horizontal movement
     * @param {number} deltaY - Vertical movement
     * @param {number} duration - Gesture duration in ms
     * @returns {boolean} True if gesture is a tap
     */
    function isTap(deltaX, deltaY, duration) {
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        return totalMovement <= CONFIG.TAP_MAX_DISTANCE && duration <= CONFIG.TAP_MAX_DURATION;
    }

    /**
     * Detect swipe direction with minimum distance validation
     * Requirements: 6.1, 6.2, 6.6
     * @param {number} startX - Start X coordinate
     * @param {number} endX - End X coordinate
     * @param {number} deltaY - Vertical movement (for diagonal detection)
     * @param {number} duration - Gesture duration in ms
     * @returns {string|null} 'left', 'right', or null if not a valid swipe
     */
    function detectSwipe(startX, endX, deltaY, duration) {
        const deltaX = endX - startX;
        const distance = Math.abs(deltaX);
        const verticalDistance = Math.abs(deltaY);

        // Minimum distance validation (Requirements: 6.6)
        if (distance < CONFIG.MIN_SWIPE_DISTANCE) {
            log('Swipe distance too short:', distance, '< ', CONFIG.MIN_SWIPE_DISTANCE);
            return null;
        }

        // Timeout validation - swipe should be quick
        if (duration > CONFIG.SWIPE_TIMEOUT) {
            log('Swipe too slow:', duration, 'ms');
            return null;
        }

        // Ensure horizontal swipe (not diagonal)
        // Horizontal movement should be at least 2x vertical movement
        if (verticalDistance > distance / 2) {
            log('Diagonal swipe detected, ignoring');
            return null;
        }

        // Determine direction
        if (deltaX > 0) {
            return 'right';
        } else {
            return 'left';
        }
    }

    /**
     * Handle swipe gesture to trigger section navigation
     * Requirements: 6.1, 6.2
     * @param {string} direction - 'left' or 'right'
     */
    function handleSwipe(direction) {
        log('Handling swipe:', direction);

        if (typeof SectionNavigator !== 'undefined') {
            if (direction === 'left') {
                // Swipe left = next section (Requirements: 6.1)
                SectionNavigator.nextSection();
            } else if (direction === 'right') {
                // Swipe right = previous section (Requirements: 6.2)
                SectionNavigator.previousSection();
            }
        } else {
            log('Warning: SectionNavigator not available');
        }
    }

    /**
     * Handle tap gesture - either jump to section or toggle pause
     * Requirements: 6.3
     * @param {TouchEvent} event - Touch event
     */
    function handleTap(event) {
        // First, check if tap is on an agenda item (for jump-to-section)
        const agendaItem = findAgendaItemFromElement(touchState.targetElement);
        
        if (agendaItem) {
            log('Tap on agenda item, jumping to section');
            handleAgendaItemTap(agendaItem);
            return;
        }
        
        // Check if tap is on a section list item
        const sectionItem = findSectionItemFromElement(touchState.targetElement);
        
        if (sectionItem) {
            log('Tap on section list item, jumping to section');
            handleSectionItemTap(sectionItem);
            return;
        }
        
        // Otherwise, check if tap is on timer display area for pause toggle
        const timerArea = document.querySelector('#ticker, .timer-display');
        
        if (timerArea && (timerArea.contains(touchState.targetElement) || 
            touchState.targetElement === timerArea)) {
            log('Tap on timer area, toggling pause');
            
            if (typeof PauseController !== 'undefined') {
                PauseController.toggle();
                
                // Provide visual feedback (Requirements: 6.4)
                provideVisualFeedback('tap');
                
                // Provide haptic feedback where supported (Requirements: 6.4)
                provideHapticFeedback();
            } else {
                log('Warning: PauseController not available');
            }
        } else {
            log('Tap outside interactive area, ignoring');
        }
    }

    /**
     * Find agenda item element from a tapped element
     * @param {HTMLElement} element - The tapped element
     * @returns {HTMLElement|null} The agenda item element or null
     */
    function findAgendaItemFromElement(element) {
        if (!element) return null;
        
        // Check if element itself is an agenda item
        if (element.classList && element.classList.contains('agenda-item')) {
            return element;
        }
        
        // Check parent elements (for taps on child elements like text spans)
        let parent = element.parentElement;
        while (parent) {
            if (parent.classList && parent.classList.contains('agenda-item')) {
                return parent;
            }
            parent = parent.parentElement;
        }
        
        return null;
    }

    /**
     * Find section list item element from a tapped element
     * @param {HTMLElement} element - The tapped element
     * @returns {HTMLElement|null} The section item element or null
     */
    function findSectionItemFromElement(element) {
        if (!element) return null;
        
        // Check if element itself is a section item
        if (element.classList && element.classList.contains('section-item')) {
            return element;
        }
        
        // Check parent elements
        let parent = element.parentElement;
        while (parent) {
            if (parent.classList && parent.classList.contains('section-item')) {
                return parent;
            }
            parent = parent.parentElement;
        }
        
        return null;
    }

    /**
     * Handle tap on an agenda item to jump to that section
     * @param {HTMLElement} agendaItem - The agenda item element
     */
    function handleAgendaItemTap(agendaItem) {
        // Find the section index from the agenda
        const sectionIndex = findSectionIndexFromAgendaItem(agendaItem);
        
        if (sectionIndex >= 0) {
            log('Jumping to section:', sectionIndex);
            
            if (typeof SectionNavigator !== 'undefined') {
                SectionNavigator.jumpToSection(sectionIndex);
                
                // Provide visual feedback
                provideVisualFeedback('tap');
                provideHapticFeedback();
            } else {
                log('Warning: SectionNavigator not available');
            }
        } else {
            log('Could not determine section index from agenda item');
        }
    }

    /**
     * Handle tap on a section list item to jump to that section
     * @param {HTMLElement} sectionItem - The section item element
     */
    function handleSectionItemTap(sectionItem) {
        // Get section index from data attribute
        const sectionIndex = parseInt(sectionItem.getAttribute('data-section-index'), 10);
        
        if (!isNaN(sectionIndex) && sectionIndex >= 0) {
            log('Jumping to section from list:', sectionIndex);
            
            if (typeof SectionNavigator !== 'undefined') {
                SectionNavigator.jumpToSection(sectionIndex);
                
                // Provide visual feedback
                provideVisualFeedback('tap');
                provideHapticFeedback();
            } else {
                log('Warning: SectionNavigator not available');
            }
        } else {
            log('Could not determine section index from section item');
        }
    }

    /**
     * Find section index from an agenda item element
     * @param {HTMLElement} agendaItem - The agenda item element
     * @returns {number} Section index or -1 if not found
     */
    function findSectionIndexFromAgendaItem(agendaItem) {
        // Check for data-section-index attribute first
        const dataIndex = agendaItem.getAttribute('data-section-index');
        if (dataIndex !== null) {
            return parseInt(dataIndex, 10);
        }
        
        // Try to find index by matching element in currentAgenda
        if (typeof window !== 'undefined' && window.currentAgenda) {
            for (let i = 0; i < window.currentAgenda.length; i++) {
                if (window.currentAgenda[i].element === agendaItem) {
                    return i;
                }
            }
        }
        
        // Try to find by position in DOM
        const allAgendaItems = document.querySelectorAll('.agenda-item');
        for (let i = 0; i < allAgendaItems.length; i++) {
            if (allAgendaItems[i] === agendaItem) {
                return i;
            }
        }
        
        return -1;
    }

    /**
     * Provide visual feedback for touch interactions
     * Requirements: 6.4
     * @param {string} type - Type of feedback ('left', 'right', 'tap')
     */
    function provideVisualFeedback(type) {
        const ticker = document.getElementById('ticker');
        if (!ticker) return;

        // Add feedback class
        const feedbackClass = 'touch-feedback-' + type;
        ticker.classList.add('touch-feedback', feedbackClass);

        // Remove feedback class after animation
        setTimeout(() => {
            ticker.classList.remove('touch-feedback', feedbackClass);
        }, 200);

        log('Visual feedback provided:', type);
    }

    /**
     * Provide haptic feedback where supported
     * Requirements: 6.4
     */
    function provideHapticFeedback() {
        // Check if vibration API is supported
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            // Short vibration for feedback (50ms)
            navigator.vibrate(50);
            log('Haptic feedback provided');
        }
    }

    /**
     * Check if an element meets minimum touch target size
     * Requirements: 6.5
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if element meets minimum size
     */
    function checkTouchTargetSize(element) {
        if (!element) return false;

        const rect = element.getBoundingClientRect();
        const meetsMinWidth = rect.width >= CONFIG.MIN_TOUCH_TARGET;
        const meetsMinHeight = rect.height >= CONFIG.MIN_TOUCH_TARGET;

        log('Touch target size check:', {
            width: rect.width,
            height: rect.height,
            minRequired: CONFIG.MIN_TOUCH_TARGET,
            passes: meetsMinWidth && meetsMinHeight
        });

        return meetsMinWidth && meetsMinHeight;
    }

    /**
     * Validate all interactive elements meet touch target requirements
     * Requirements: 6.5
     * @returns {Object} Validation results
     */
    function validateTouchTargets() {
        const results = {
            passed: [],
            failed: []
        };

        // Select all interactive elements
        const interactiveElements = document.querySelectorAll(
            'button, a, [role="button"], .clickable, .section-item, .time-adjust-btn'
        );

        interactiveElements.forEach((element, index) => {
            const passes = checkTouchTargetSize(element);
            const info = {
                element: element.tagName,
                id: element.id || `element-${index}`,
                className: element.className,
                width: element.getBoundingClientRect().width,
                height: element.getBoundingClientRect().height
            };

            if (passes) {
                results.passed.push(info);
            } else {
                results.failed.push(info);
            }
        });

        log('Touch target validation:', results);
        return results;
    }

    /**
     * Initialize touch gesture handling
     * Sets up event listeners on the timer area
     */
    function initialize() {
        if (initialized) {
            log('Already initialized');
            return;
        }

        log('Initializing touch gesture handler...');

        // Get the timer area element
        const timerArea = document.getElementById('ticker');
        
        if (!timerArea) {
            log('Warning: Timer area (#ticker) not found');
            return;
        }

        // Create bound handlers for later removal
        boundHandlers.touchStart = handleTouchStart.bind(this);
        boundHandlers.touchEnd = handleTouchEnd.bind(this);
        boundHandlers.touchCancel = handleTouchCancel.bind(this);

        // Add touch event listeners with passive: false to allow preventDefault if needed
        timerArea.addEventListener('touchstart', boundHandlers.touchStart, { passive: true });
        timerArea.addEventListener('touchend', boundHandlers.touchEnd, { passive: true });
        timerArea.addEventListener('touchcancel', boundHandlers.touchCancel, { passive: true });

        initialized = true;
        log('Touch gesture handler initialized ✓');
    }

    /**
     * Cleanup and destroy touch gesture handling
     */
    function destroy() {
        if (!initialized) {
            log('Not initialized, nothing to destroy');
            return;
        }

        log('Destroying touch gesture handler...');

        const timerArea = document.getElementById('ticker');
        
        if (timerArea && boundHandlers.touchStart) {
            timerArea.removeEventListener('touchstart', boundHandlers.touchStart);
            timerArea.removeEventListener('touchend', boundHandlers.touchEnd);
            timerArea.removeEventListener('touchcancel', boundHandlers.touchCancel);
        }

        // Reset state
        resetTouchState();
        boundHandlers = {
            touchStart: null,
            touchEnd: null,
            touchCancel: null
        };
        initialized = false;

        log('Touch gesture handler destroyed');
    }

    /**
     * Check if touch gesture handling is initialized
     * @returns {boolean} True if initialized
     */
    function isInitialized() {
        return initialized;
    }

    /**
     * Get current touch state (for testing)
     * @returns {Object} Current touch state
     */
    function getTouchState() {
        return { ...touchState };
    }

    // Public API
    return {
        // Lifecycle methods
        initialize: initialize,
        destroy: destroy,
        isInitialized: isInitialized,
        
        // Configuration methods
        setDebug: setDebug,
        setMinSwipeDistance: setMinSwipeDistance,
        setTouchTargetSize: setTouchTargetSize,
        getConfig: getConfig,
        
        // Gesture detection methods (exposed for testing)
        handleTouchStart: handleTouchStart,
        handleTouchEnd: handleTouchEnd,
        detectSwipe: detectSwipe,
        handleSwipe: handleSwipe,
        handleTap: handleTap,
        isTap: isTap,
        
        // Agenda item tap methods (exposed for testing)
        findAgendaItemFromElement: findAgendaItemFromElement,
        findSectionItemFromElement: findSectionItemFromElement,
        handleAgendaItemTap: handleAgendaItemTap,
        handleSectionItemTap: handleSectionItemTap,
        findSectionIndexFromAgendaItem: findSectionIndexFromAgendaItem,
        
        // Feedback methods
        provideVisualFeedback: provideVisualFeedback,
        provideHapticFeedback: provideHapticFeedback,
        
        // Accessibility methods
        checkTouchTargetSize: checkTouchTargetSize,
        validateTouchTargets: validateTouchTargets,
        
        // State access (for testing)
        getTouchState: getTouchState,
        resetTouchState: resetTouchState
    };
})();

// Export for Node.js/testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TouchGestureHandler;
}
