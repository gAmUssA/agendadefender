/**
 * Core UX Improvements - Property-Based Tests
 * 
 * This test file contains property-based tests for the Core UX Improvements feature.
 * Tests use fast-check for property-based testing to verify universal properties
 * across many generated inputs.
 * 
 * Testing Framework: Jest with fast-check
 * Configuration: Minimum 100 iterations per property test
 */

const fc = require('fast-check');

// Module imports
const TimeWarnings = require('../scripts/time-warnings.js');
const ProgressBar = require('../scripts/progress-bar.js');
const FullscreenManager = require('../scripts/fullscreen.js');
const KeyboardShortcuts = require('../scripts/keyboard-shortcuts.js');

describe('Core UX Improvements', () => {
    describe('Testing Infrastructure', () => {
        test('fast-check is properly installed and working', () => {
            // Verify fast-check is available and functional
            fc.assert(
                fc.property(fc.integer(), (n) => {
                    return typeof n === 'number';
                }),
                { numRuns: 100 }
            );
        });

        test('fast-check can generate various data types', () => {
            // Test string generation
            fc.assert(
                fc.property(fc.string(), (s) => {
                    return typeof s === 'string';
                }),
                { numRuns: 100 }
            );

            // Test boolean generation
            fc.assert(
                fc.property(fc.boolean(), (b) => {
                    return typeof b === 'boolean';
                }),
                { numRuns: 100 }
            );

            // Test array generation
            fc.assert(
                fc.property(fc.array(fc.integer()), (arr) => {
                    return Array.isArray(arr);
                }),
                { numRuns: 100 }
            );
        });
    });

    // Placeholder describe blocks for future property tests
    // These will be implemented in subsequent tasks

    describe('TimeWarnings Module', () => {
        // Feature: core-ux-improvements, Property 11: Warning class based on remaining time
        // Validates: Requirements 3.1, 3.2, 3.3, 3.4
        test('warning class is determined by remaining time thresholds', () => {
            fc.assert(
                fc.property(fc.integer({ min: -100000, max: 100000 }), (remainingMs) => {
                    const warningClass = TimeWarnings.getWarningClass(remainingMs);
                    
                    if (remainingMs > 30000) {
                        return warningClass === 'warning-green';
                    } else if (remainingMs > 10000) {
                        return warningClass === 'warning-yellow';
                    } else if (remainingMs > 0) {
                        return warningClass === 'warning-red';
                    } else {
                        return warningClass === 'warning-overtime';
                    }
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('ProgressBar Module', () => {
        // Feature: core-ux-improvements, Property 12: Progress segment status based on index
        // Validates: Requirements 4.3, 4.4, 4.5, 4.6
        test('segment status is determined by index relative to current index', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),  // segmentIndex
                    fc.integer({ min: 0, max: 100 }),  // currentIndex
                    (segmentIndex, currentIndex) => {
                        const status = ProgressBar.getSegmentStatus(segmentIndex, currentIndex);
                        
                        if (segmentIndex < currentIndex) {
                            return status === 'complete';
                        } else if (segmentIndex === currentIndex) {
                            return status === 'current';
                        } else {
                            return status === 'upcoming';
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        // Feature: core-ux-improvements, Property 13: Progress segment widths proportional to duration
        // Validates: Requirements 4.2
        test('segment widths are proportional to duration and sum to 100%', () => {
            // Generate sections with positive durations
            const sectionArbitrary = fc.record({
                commencesAt: fc.integer({ min: 0, max: 1000000 }),
                duration: fc.integer({ min: 1, max: 100000 })  // Positive duration
            }).map(({ commencesAt, duration }) => ({
                commencesAt: commencesAt,
                concludesAt: commencesAt + duration,
                text: 'Section'
            }));

            fc.assert(
                fc.property(
                    fc.array(sectionArbitrary, { minLength: 1, maxLength: 20 }),
                    (sections) => {
                        const widths = ProgressBar.calculateWidths(sections);
                        
                        // Property 1: Number of widths equals number of sections
                        if (widths.length !== sections.length) return false;
                        
                        // Property 2: All widths sum to approximately 100%
                        const totalWidth = widths.reduce((sum, w) => sum + w, 0);
                        if (Math.abs(totalWidth - 100) > 0.0001) return false;
                        
                        // Property 3: Each width is proportional to its duration
                        const totalDuration = sections.reduce((sum, s) => sum + (s.concludesAt - s.commencesAt), 0);
                        for (let i = 0; i < sections.length; i++) {
                            const duration = sections[i].concludesAt - sections[i].commencesAt;
                            const expectedWidth = (duration / totalDuration) * 100;
                            if (Math.abs(widths[i] - expectedWidth) > 0.0001) return false;
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('FullscreenManager Module', () => {
        // Initialize event listeners before tests
        beforeAll(() => {
            FullscreenManager.initialize();
        });

        // Cleanup after all tests
        afterAll(() => {
            FullscreenManager.destroy();
        });

        // Reset state before each test
        beforeEach(() => {
            FullscreenManager.setState(false);
        });

        // Feature: core-ux-improvements, Property 1: Fullscreen toggle
        // Validates: Requirements 1.7, 2.5
        // *For any* initial fullscreen state (active or inactive), pressing the 'F' key 
        // SHALL result in the opposite fullscreen state.
        test('toggle flips fullscreen state to opposite value', () => {
            fc.assert(
                fc.property(fc.boolean(), (initialState) => {
                    // Set initial state
                    FullscreenManager.setState(initialState);
                    
                    // Toggle
                    FullscreenManager.toggle();
                    
                    // Verify state is opposite
                    const newState = FullscreenManager.getState();
                    return newState === !initialState;
                }),
                { numRuns: 100 }
            );
        });

        // Feature: core-ux-improvements, Property 2: Escape exits fullscreen
        // Validates: Requirements 1.5, 2.9
        // *For any* active fullscreen state, pressing the Escape key SHALL result 
        // in fullscreen being deactivated.
        test('escape key exits fullscreen when active', () => {
            fc.assert(
                fc.property(fc.constant(true), () => {
                    // Set fullscreen to active
                    FullscreenManager.setState(true);
                    
                    // Simulate Escape key press
                    const escapeEvent = new KeyboardEvent('keydown', {
                        key: 'Escape',
                        code: 'Escape',
                        bubbles: true
                    });
                    document.dispatchEvent(escapeEvent);
                    
                    // Verify fullscreen is now inactive
                    return FullscreenManager.getState() === false;
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('KeyboardShortcuts Module', () => {
        // Initialize event listeners before tests
        beforeAll(() => {
            KeyboardShortcuts.initialize();
        });

        // Cleanup after all tests
        afterAll(() => {
            KeyboardShortcuts.destroy();
        });

        // Reset state before each test
        beforeEach(() => {
            KeyboardShortcuts.setEnabled(true);
            KeyboardShortcuts.updateTimerState({
                isRunning: false,
                isMuted: false,
                currentSectionIndex: 0,
                totalSections: 5
            });
        });

        // Feature: core-ux-improvements, Property 10: Shortcuts ignored in input fields
        // Validates: Requirements 2.8
        // *For any* keyboard event where the event target is an INPUT or TEXTAREA element,
        // the Keyboard_Handler SHALL not execute any shortcut actions.
        test('shortcuts are ignored when focus is on INPUT or TEXTAREA elements', () => {
            // Test with various input element types
            const inputTypes = ['INPUT', 'TEXTAREA'];
            
            fc.assert(
                fc.property(
                    fc.constantFrom(...inputTypes),
                    fc.constantFrom('Space', 'KeyR', 'KeyN', 'KeyP', 'KeyF', 'KeyM', 'Escape', 'Digit1'),
                    (tagName, keyCode) => {
                        // Create a mock event with target being an input element
                        const mockEvent = {
                            target: { tagName: tagName },
                            code: keyCode,
                            key: keyCode === 'Space' ? ' ' : keyCode.replace('Key', '').toLowerCase(),
                            ctrlKey: false,
                            altKey: false,
                            metaKey: false,
                            isComposing: false,
                            preventDefault: jest.fn()
                        };
                        
                        // shouldIgnoreEvent should return true for input elements
                        const shouldIgnore = KeyboardShortcuts.shouldIgnoreEvent(mockEvent);
                        return shouldIgnore === true;
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        // Feature: core-ux-improvements, Property 4: Space toggles play/pause
        // Validates: Requirements 2.1
        // *For any* timer running state (running or stopped), pressing the SPACE key 
        // SHALL result in the callback being invoked to toggle the state.
        test('space key toggles play/pause state', () => {
            fc.assert(
                fc.property(fc.boolean(), (initialRunningState) => {
                    let callbackInvoked = false;
                    
                    // Set initial running state
                    KeyboardShortcuts.updateTimerState({
                        isRunning: initialRunningState,
                        totalSections: 5
                    });
                    
                    // Set callback to track invocation
                    KeyboardShortcuts.setCallbacks({
                        onTogglePlayPause: function() {
                            callbackInvoked = true;
                        }
                    });
                    
                    // Call togglePlayPause (simulates Space key press)
                    KeyboardShortcuts.togglePlayPause();
                    
                    // Verify callback was invoked
                    return callbackInvoked === true;
                }),
                { numRuns: 100 }
            );
        });
        
        // Feature: core-ux-improvements, Property 6: Next section navigation
        // Feature: core-ux-improvements, Property 7: Previous section navigation
        // Validates: Requirements 2.3, 2.4
        // *For any* timer state where current section index < total sections - 1, 
        // pressing 'N' or Right Arrow SHALL increment the current section index by 1.
        // *For any* timer state where current section index > 0, 
        // pressing 'P' or Left Arrow SHALL decrement the current section index by 1.
        test('next section increments index when not at last section', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 2, max: 20 }),  // totalSections (at least 2)
                    fc.nat(),                         // currentIndex (will be constrained)
                    (totalSections, rawIndex) => {
                        // Constrain currentIndex to be less than totalSections - 1
                        const currentIndex = rawIndex % (totalSections - 1);
                        
                        // Set initial state
                        KeyboardShortcuts.updateTimerState({
                            currentSectionIndex: currentIndex,
                            totalSections: totalSections
                        });
                        
                        // Call nextSection
                        KeyboardShortcuts.nextSection();
                        
                        // Verify index incremented by 1
                        const newState = KeyboardShortcuts.getTimerState();
                        return newState.currentSectionIndex === currentIndex + 1;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('next section does not increment when at last section', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 20 }),  // totalSections
                    (totalSections) => {
                        // Set current index to last section
                        const lastIndex = totalSections - 1;
                        KeyboardShortcuts.updateTimerState({
                            currentSectionIndex: lastIndex,
                            totalSections: totalSections
                        });
                        
                        // Call nextSection
                        KeyboardShortcuts.nextSection();
                        
                        // Verify index stays the same
                        const newState = KeyboardShortcuts.getTimerState();
                        return newState.currentSectionIndex === lastIndex;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('previous section decrements index when not at first section', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 2, max: 20 }),  // totalSections (at least 2)
                    fc.integer({ min: 1, max: 19 }), // currentIndex (at least 1)
                    (totalSections, rawIndex) => {
                        // Constrain currentIndex to be > 0 and < totalSections
                        const currentIndex = Math.min(rawIndex, totalSections - 1);
                        
                        // Set initial state
                        KeyboardShortcuts.updateTimerState({
                            currentSectionIndex: currentIndex,
                            totalSections: totalSections
                        });
                        
                        // Call prevSection
                        KeyboardShortcuts.prevSection();
                        
                        // Verify index decremented by 1
                        const newState = KeyboardShortcuts.getTimerState();
                        return newState.currentSectionIndex === currentIndex - 1;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('previous section does not decrement when at first section', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 20 }),  // totalSections
                    (totalSections) => {
                        // Set current index to first section
                        KeyboardShortcuts.updateTimerState({
                            currentSectionIndex: 0,
                            totalSections: totalSections
                        });
                        
                        // Call prevSection
                        KeyboardShortcuts.prevSection();
                        
                        // Verify index stays at 0
                        const newState = KeyboardShortcuts.getTimerState();
                        return newState.currentSectionIndex === 0;
                    }
                ),
                { numRuns: 100 }
            );
        });
        
        // Feature: core-ux-improvements, Property 9: Number key section jump
        // Validates: Requirements 2.7
        // *For any* agenda with N sections and any number key K pressed (1-9) where K <= N, 
        // the current section index SHALL become K-1.
        test('number key jumps to corresponding section when section exists', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 9 }),   // totalSections (1-9)
                    fc.integer({ min: 1, max: 9 }),   // numberKey (1-9)
                    fc.integer({ min: 0, max: 8 }),   // initialIndex
                    (totalSections, numberKey, rawInitialIndex) => {
                        // Constrain initialIndex to valid range
                        const initialIndex = rawInitialIndex % totalSections;
                        
                        // Set initial state
                        KeyboardShortcuts.updateTimerState({
                            currentSectionIndex: initialIndex,
                            totalSections: totalSections
                        });
                        
                        // Jump to section (numberKey - 1 is the 0-based index)
                        KeyboardShortcuts.jumpToSection(numberKey - 1);
                        
                        const newState = KeyboardShortcuts.getTimerState();
                        
                        // If numberKey <= totalSections, index should be numberKey - 1
                        // Otherwise, index should remain unchanged
                        if (numberKey <= totalSections) {
                            return newState.currentSectionIndex === numberKey - 1;
                        } else {
                            return newState.currentSectionIndex === initialIndex;
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('number key does not jump when section does not exist', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 8 }),   // totalSections (1-8, so there's always a key > totalSections)
                    fc.integer({ min: 0, max: 7 }),   // initialIndex
                    (totalSections, rawInitialIndex) => {
                        // Constrain initialIndex to valid range
                        const initialIndex = rawInitialIndex % totalSections;
                        
                        // Set initial state
                        KeyboardShortcuts.updateTimerState({
                            currentSectionIndex: initialIndex,
                            totalSections: totalSections
                        });
                        
                        // Try to jump to a section that doesn't exist
                        const invalidIndex = totalSections; // This is out of bounds (0-indexed)
                        KeyboardShortcuts.jumpToSection(invalidIndex);
                        
                        // Verify index stays the same
                        const newState = KeyboardShortcuts.getTimerState();
                        return newState.currentSectionIndex === initialIndex;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
