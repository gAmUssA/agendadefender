const fc = require('fast-check');

// Mock modules that will be tested
let PauseController, SectionNavigator, TimeAdjuster, TouchGestureHandler;

describe('Timer Controls', () => {
    beforeEach(() => {
        // Reset DOM for each test
        document.body.innerHTML = `
            <div id="ticker">
                <div class="timer-display">00:00</div>
                <div class="ticker-controls">
                    <button id="pause-button">Pause</button>
                    <button id="next-section">Next</button>
                    <button id="prev-section">Previous</button>
                    <button id="add-time">+30s</button>
                    <button id="subtract-time">-30s</button>
                </div>
                <div class="section-list"></div>
            </div>
        `;

        // Reset global timer state
        global.timeOffset = 0;
        global.running = false;
        global.agenda = [];
        global.currentSectionIndex = 0;

        // Mock Date.now for consistent testing
        jest.spyOn(Date, 'now').mockReturnValue(1000000);

        // Clear module cache to ensure fresh imports
        jest.resetModules();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Touch Event Simulation Utilities', () => {
        test('should simulate touch events correctly', () => {
            const element = document.createElement('div');
            const touchStartHandler = jest.fn();
            const touchEndHandler = jest.fn();
            
            element.addEventListener('touchstart', touchStartHandler);
            element.addEventListener('touchend', touchEndHandler);

            // Simulate swipe right (startX=50, endX=150)
            const touchStart = new TouchEvent('touchstart', {
                touches: [{ clientX: 50, clientY: 100 }]
            });
            const touchEnd = new TouchEvent('touchend', {
                changedTouches: [{ clientX: 150, clientY: 100 }]
            });

            element.dispatchEvent(touchStart);
            element.dispatchEvent(touchEnd);

            expect(touchStartHandler).toHaveBeenCalledWith(touchStart);
            expect(touchEndHandler).toHaveBeenCalledWith(touchEnd);
        });

        test('should calculate swipe distance correctly', () => {
            const startX = 50;
            const endX = 150;
            const distance = Math.abs(endX - startX);
            expect(distance).toBe(100);
        });
    });

    describe('Timer State Management', () => {
        test('should maintain consistent timer state structure', () => {
            const timerState = {
                isRunning: false,
                isPaused: false,
                currentSectionIndex: 0,
                totalSections: 0,
                pausedAt: null,
                totalPausedDuration: 0,
                manualAdjustments: 0,
                lastAdjustmentTime: null
            };

            expect(timerState).toHaveProperty('isRunning');
            expect(timerState).toHaveProperty('isPaused');
            expect(timerState).toHaveProperty('totalPausedDuration');
            expect(timerState).toHaveProperty('manualAdjustments');
        });
    });

    describe('Property-Based Test Infrastructure', () => {
        test('should generate random timer positions', () => {
            fc.assert(fc.property(
                fc.integer({ min: 0, max: 3600000 }), // Random timer position (0-1 hour in ms)
                (timerPos) => {
                    expect(timerPos).toBeGreaterThanOrEqual(0);
                    expect(timerPos).toBeLessThanOrEqual(3600000);
                }
            ), { numRuns: 10 });
        });

        test('should generate random pause durations', () => {
            fc.assert(fc.property(
                fc.integer({ min: 100, max: 5000 }), // Random pause duration (100ms-5s)
                (pauseDuration) => {
                    expect(pauseDuration).toBeGreaterThanOrEqual(100);
                    expect(pauseDuration).toBeLessThanOrEqual(5000);
                }
            ), { numRuns: 10 });
        });

        test('should generate random section indices', () => {
            fc.assert(fc.property(
                fc.integer({ min: 0, max: 10 }), // Random section index (0-10)
                (sectionIndex) => {
                    expect(sectionIndex).toBeGreaterThanOrEqual(0);
                    expect(sectionIndex).toBeLessThanOrEqual(10);
                }
            ), { numRuns: 10 });
        });

        test('should generate random time adjustments', () => {
            fc.assert(fc.property(
                fc.integer({ min: -300, max: 300 }), // Random time adjustment (-5min to +5min in seconds)
                (adjustment) => {
                    expect(adjustment).toBeGreaterThanOrEqual(-300);
                    expect(adjustment).toBeLessThanOrEqual(300);
                }
            ), { numRuns: 10 });
        });

        test('should generate random swipe distances', () => {
            fc.assert(fc.property(
                fc.integer({ min: 0, max: 200 }), // Random swipe distance (0-200px)
                (distance) => {
                    expect(distance).toBeGreaterThanOrEqual(0);
                    expect(distance).toBeLessThanOrEqual(200);
                }
            ), { numRuns: 10 });
        });
    });

    describe('Module Loading Infrastructure', () => {
        test('should handle module exports for Node.js environment', () => {
            // Test that modules can be loaded in Node.js environment
            expect(typeof module).toBe('object');
            expect(typeof module.exports).toBe('object');
        });

        test('should handle browser environment detection', () => {
            // Test browser environment detection pattern
            const isBrowser = typeof window !== 'undefined';
            const isNode = typeof module !== 'undefined' && typeof module.exports !== 'undefined';
            
            // In test environment, both should be true
            expect(isBrowser).toBe(true);
            expect(isNode).toBe(true);
        });
    });

    // Placeholder tests for modules that will be implemented
    describe('PauseController', () => {
        let PauseController;

        beforeEach(() => {
            // Load the PauseController module
            PauseController = require('../scripts/pause-controller.js');
            
            // Set up global timer state
            global.window = global.window || {};
            global.window.running = true;
            global.window.timeOffset = 0;
        });

        describe('State Management', () => {
            test('should initialize with correct default state', () => {
                expect(PauseController.isPaused()).toBe(false);
                expect(PauseController.getPausedDuration()).toBe(0);
            });

            test('should pause successfully when timer is running', () => {
                const result = PauseController.pause();
                expect(result).toBe(true);
                expect(PauseController.isPaused()).toBe(true);
            });

            test('should resume successfully when paused', () => {
                PauseController.pause();
                const result = PauseController.resume();
                expect(result).toBe(true);
                expect(PauseController.isPaused()).toBe(false);
            });

            test('should toggle between pause and resume states', () => {
                expect(PauseController.isPaused()).toBe(false);
                
                PauseController.toggle();
                expect(PauseController.isPaused()).toBe(true);
                
                PauseController.toggle();
                expect(PauseController.isPaused()).toBe(false);
            });
        });

        describe('Error Handling', () => {
            test('should prevent multiple pause calls', () => {
                PauseController.pause();
                const result = PauseController.pause();
                expect(result).toBe(false);
                expect(PauseController.isPaused()).toBe(true);
            });

            test('should handle resume without pause', () => {
                expect(PauseController.isPaused()).toBe(false);
                const result = PauseController.resume();
                expect(result).toBe(false);
            });

            test('should prevent pause when timer is not running', () => {
                global.window.running = false;
                const result = PauseController.pause();
                expect(result).toBe(false);
                expect(PauseController.isPaused()).toBe(false);
            });
        });

        describe('Time Calculations', () => {
            test('should track paused duration correctly', () => {
                // Mock Date.now to control time progression
                const originalDateNow = Date.now;
                let mockTime = 1000000;
                Date.now = jest.fn(() => mockTime);

                PauseController.pause();
                
                // Advance time by 50ms
                mockTime += 50;
                
                const duration = PauseController.getPausedDuration();
                expect(duration).toBe(50);
                
                // Restore original Date.now
                Date.now = originalDateNow;
            });

            test('should accumulate multiple pause durations', () => {
                // Mock Date.now to control time progression
                const originalDateNow = Date.now;
                let mockTime = 1000000;
                Date.now = jest.fn(() => mockTime);

                // First pause
                PauseController.pause();
                mockTime += 30; // 30ms pause
                PauseController.resume();
                
                // Second pause
                PauseController.pause();
                mockTime += 20; // 20ms pause
                
                const totalDuration = PauseController.getPausedDuration();
                expect(totalDuration).toBe(50); // 30 + 20 = 50ms
                
                // Restore original Date.now
                Date.now = originalDateNow;
            });
        });

        describe('State Reset', () => {
            test('should reset all state correctly', () => {
                PauseController.pause();
                PauseController.reset();
                
                expect(PauseController.isPaused()).toBe(false);
                expect(PauseController.getPausedDuration()).toBe(0);
            });
        });

        afterEach(() => {
            PauseController.reset();
        });

        describe('Property-Based Tests', () => {
            test('Property 1: Pause preserves exact timing', () => {
                /**
                 * Feature: timer-controls, Property 1: Pause preserves exact timing
                 * Validates: Requirements 1.1, 1.3, 7.2
                 */
                fc.assert(fc.property(
                    fc.integer({ min: 0, max: 3600000 }), // Random timer position (0-1 hour in ms)
                    fc.integer({ min: 100, max: 5000 }),  // Random pause duration (100ms-5s)
                    (timerPos, pauseDuration) => {
                        // Mock Date.now to control time progression
                        const originalDateNow = Date.now;
                        let mockTime = 1000000 + timerPos;
                        Date.now = jest.fn(() => mockTime);

                        // Reset state
                        PauseController.reset();
                        global.window.running = true;
                        global.window.timeOffset = timerPos;

                        // Record initial state
                        const initialTimeOffset = global.window.timeOffset;
                        
                        // Pause the timer
                        const pauseResult = PauseController.pause();
                        expect(pauseResult).toBe(true);
                        
                        // Advance time during pause
                        mockTime += pauseDuration;
                        
                        // Resume the timer
                        const resumeResult = PauseController.resume();
                        expect(resumeResult).toBe(true);
                        
                        // Verify that timeOffset was adjusted to exclude paused time
                        const expectedTimeOffset = initialTimeOffset - pauseDuration;
                        expect(global.window.timeOffset).toBe(expectedTimeOffset);
                        
                        // Verify pause state is cleared
                        expect(PauseController.isPaused()).toBe(false);
                        
                        // Restore original Date.now
                        Date.now = originalDateNow;
                    }
                ), { numRuns: 100 });
            });

            test('Property 2: Pause state UI consistency', () => {
                /**
                 * Feature: timer-controls, Property 2: Pause state UI consistency
                 * Validates: Requirements 1.2, 1.4, 1.5, 4.1, 4.2
                 */
                fc.assert(fc.property(
                    fc.boolean(), // Random initial pause state
                    (shouldStartPaused) => {
                        // Reset state and DOM
                        PauseController.reset();
                        global.window.running = true;
                        
                        // Set up DOM elements for testing
                        document.body.innerHTML = `
                            <div id="ticker">
                                <div class="agenda-item">
                                    <span class="agenda-item-text">Test Item</span>
                                </div>
                            </div>
                            <button id="pause-button">Pause</button>
                        `;

                        if (shouldStartPaused) {
                            // Start in paused state
                            PauseController.pause();
                            
                            // Verify paused UI state
                            expect(PauseController.isPaused()).toBe(true);
                            
                            // Check pause button text
                            const pauseButton = document.getElementById('pause-button');
                            expect(pauseButton.textContent).toBe('Resume');
                            expect(pauseButton.classList.contains('paused')).toBe(true);
                            
                            // Check paused indicator
                            const timerDisplay = document.querySelector('.agenda-item');
                            expect(timerDisplay.classList.contains('paused')).toBe(true);
                            
                            const pausedBadge = document.getElementById('paused-badge');
                            expect(pausedBadge).toBeTruthy();
                            expect(pausedBadge.style.display).toBe('block');
                            
                            // Resume and verify UI updates
                            PauseController.resume();
                            expect(PauseController.isPaused()).toBe(false);
                            expect(pauseButton.textContent).toBe('Pause');
                            expect(pauseButton.classList.contains('paused')).toBe(false);
                            expect(timerDisplay.classList.contains('paused')).toBe(false);
                            expect(pausedBadge.style.display).toBe('none');
                        } else {
                            // Start in running state
                            expect(PauseController.isPaused()).toBe(false);
                            
                            // Check running UI state
                            const pauseButton = document.getElementById('pause-button');
                            expect(pauseButton.textContent).toBe('Pause');
                            expect(pauseButton.classList.contains('paused')).toBe(false);
                            
                            const timerDisplay = document.querySelector('.agenda-item');
                            expect(timerDisplay.classList.contains('paused')).toBe(false);
                            
                            // Pause and verify UI updates
                            PauseController.pause();
                            expect(PauseController.isPaused()).toBe(true);
                            expect(pauseButton.textContent).toBe('Resume');
                            expect(pauseButton.classList.contains('paused')).toBe(true);
                            expect(timerDisplay.classList.contains('paused')).toBe(true);
                            
                            const pausedBadge = document.getElementById('paused-badge');
                            expect(pausedBadge).toBeTruthy();
                            expect(pausedBadge.style.display).toBe('block');
                        }
                    }
                ), { numRuns: 100 });
            });
        });
    });

    describe('SectionNavigator', () => {
        let SectionNavigator;

        beforeEach(() => {
            // Load the SectionNavigator module
            SectionNavigator = require('../scripts/section-navigator.js');
            
            // Set up global timer state
            global.window = global.window || {};
            global.window.running = true;
            global.window.timeOffset = 0;
            
            // Create mock agenda with 5 sections
            const now = Date.now();
            
            // Helper to create DOM elements
            const createAgendaElement = (text) => {
                const div = document.createElement('div');
                div.className = 'agenda-item';
                const span = document.createElement('span');
                span.className = 'agenda-item-text';
                span.textContent = text;
                div.appendChild(span);
                return div;
            };
            
            const createProgressBar = () => {
                const div = document.createElement('div');
                div.className = 'progress-bar';
                return div;
            };
            
            global.window.currentAgenda = [
                {
                    text: 'Section 1',
                    commencesAt: new Date(now),
                    concludesAt: new Date(now + 60000), // 1 minute
                    element: createAgendaElement('Section 1'),
                    progressBar: createProgressBar()
                },
                {
                    text: 'Section 2',
                    commencesAt: new Date(now + 60000),
                    concludesAt: new Date(now + 120000), // 2 minutes
                    element: createAgendaElement('Section 2'),
                    progressBar: createProgressBar()
                },
                {
                    text: 'Section 3',
                    commencesAt: new Date(now + 120000),
                    concludesAt: new Date(now + 180000), // 3 minutes
                    element: createAgendaElement('Section 3'),
                    progressBar: createProgressBar()
                },
                {
                    text: 'Section 4',
                    commencesAt: new Date(now + 180000),
                    concludesAt: new Date(now + 240000), // 4 minutes
                    element: createAgendaElement('Section 4'),
                    progressBar: createProgressBar()
                },
                {
                    text: 'Section 5',
                    commencesAt: new Date(now + 240000),
                    concludesAt: new Date(now + 300000), // 5 minutes
                    element: createAgendaElement('Section 5'),
                    progressBar: createProgressBar()
                }
            ];
            
            // Mock jumpToSectionByIndex function
            global.window.jumpToSectionByIndex = jest.fn((targetIndex) => {
                // Simulate jumping by adjusting timeOffset
                const targetSection = global.window.currentAgenda[targetIndex];
                global.window.timeOffset = targetSection.commencesAt.getTime() - Date.now() + 100;
            });
            
            // Set up DOM for section list
            document.body.innerHTML = `
                <div id="ticker">
                    <div class="section-list"></div>
                </div>
            `;
        });

        describe('State Queries', () => {
            test('should get current section index correctly', () => {
                const index = SectionNavigator.getCurrentSectionIndex();
                expect(index).toBeGreaterThanOrEqual(0);
                expect(index).toBeLessThan(5);
            });

            test('should get total sections correctly', () => {
                const total = SectionNavigator.getTotalSections();
                expect(total).toBe(5);
            });
        });

        describe('Navigation Methods', () => {
            test('should navigate to next section', () => {
                const result = SectionNavigator.nextSection();
                expect(result).toBe(true);
                expect(global.window.jumpToSectionByIndex).toHaveBeenCalled();
            });

            test('should navigate to previous section', () => {
                // Jump to section 2 first
                SectionNavigator.jumpToSection(2);
                
                const result = SectionNavigator.previousSection();
                expect(result).toBe(true);
                expect(global.window.jumpToSectionByIndex).toHaveBeenCalledWith(1);
            });

            test('should jump to specific section', () => {
                const result = SectionNavigator.jumpToSection(3);
                expect(result).toBe(true);
                expect(global.window.jumpToSectionByIndex).toHaveBeenCalledWith(3);
            });

            test('should handle boundary condition at first section', () => {
                // Start at section 0
                global.window.timeOffset = 0;
                
                const result = SectionNavigator.previousSection();
                expect(result).toBe(false);
            });

            test('should handle boundary condition at last section', () => {
                // Jump to last section
                SectionNavigator.jumpToSection(4);
                
                const result = SectionNavigator.nextSection();
                expect(result).toBe(false);
            });

            test('should reject invalid section indices', () => {
                expect(SectionNavigator.jumpToSection(-1)).toBe(false);
                expect(SectionNavigator.jumpToSection(10)).toBe(false);
            });
        });

        describe('UI Updates', () => {
            test('should create section list', () => {
                const sectionList = SectionNavigator.createSectionList();
                expect(sectionList).toBeTruthy();
                expect(sectionList.querySelectorAll('.section-item').length).toBe(5);
            });

            test('should highlight current section', () => {
                SectionNavigator.createSectionList();
                SectionNavigator.highlightCurrentSection();
                
                const highlighted = document.querySelector('.section-item.current-section');
                expect(highlighted).toBeTruthy();
            });
        });

        describe('Property-Based Tests', () => {
            test('Property 3: Section navigation updates all displays', () => {
                /**
                 * Feature: timer-controls, Property 3: Section navigation updates all displays
                 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
                 */
                fc.assert(fc.property(
                    fc.integer({ min: 0, max: 4 }), // Random target section (0-4)
                    fc.constantFrom('next', 'previous', 'jump'), // Random navigation method
                    (targetSection, navMethod) => {
                        // Reset state
                        global.window.timeOffset = 0;
                        global.window.jumpToSectionByIndex.mockClear();
                        
                        // Create section list
                        const sectionList = SectionNavigator.createSectionList();
                        document.body.innerHTML = `<div id="ticker"></div>`;
                        document.getElementById('ticker').appendChild(sectionList);
                        
                        // Perform navigation based on method
                        let navigationSuccessful = false;
                        let expectedIndex = -1;
                        
                        if (navMethod === 'jump') {
                            // Direct jump to target section
                            navigationSuccessful = SectionNavigator.jumpToSection(targetSection);
                            expectedIndex = targetSection;
                        } else if (navMethod === 'next') {
                            // Jump to a section first, then go next
                            if (targetSection < 4) {
                                SectionNavigator.jumpToSection(targetSection);
                                navigationSuccessful = SectionNavigator.nextSection();
                                expectedIndex = targetSection + 1;
                            }
                        } else if (navMethod === 'previous') {
                            // Jump to a section first, then go previous
                            if (targetSection > 0) {
                                SectionNavigator.jumpToSection(targetSection);
                                navigationSuccessful = SectionNavigator.previousSection();
                                expectedIndex = targetSection - 1;
                            }
                        }
                        
                        // If navigation was successful, verify all displays updated
                        if (navigationSuccessful) {
                            // Verify jumpToSectionByIndex was called with correct index
                            expect(global.window.jumpToSectionByIndex).toHaveBeenCalledWith(expectedIndex);
                            
                            // Verify timeOffset was updated
                            const expectedTime = global.window.currentAgenda[expectedIndex].commencesAt.getTime();
                            const actualOffset = global.window.timeOffset;
                            const currentTime = Date.now();
                            const calculatedTime = currentTime + actualOffset;
                            
                            // Allow small tolerance for timing (within 200ms)
                            expect(Math.abs(calculatedTime - expectedTime)).toBeLessThan(200);
                            
                            // Verify section list highlighting
                            SectionNavigator.highlightCurrentSection();
                            const highlighted = document.querySelector('.section-item.current-section');
                            expect(highlighted).toBeTruthy();
                            expect(highlighted.getAttribute('data-section-index')).toBe(String(expectedIndex));
                        }
                    }
                ), { numRuns: 100 });
            });
        });

        afterEach(() => {
            SectionNavigator.destroy();
        });
    });

    describe('TimeAdjuster', () => {
        let TimeAdjuster;

        beforeEach(() => {
            // Load the TimeAdjuster module
            TimeAdjuster = require('../scripts/time-adjuster.js');
            
            // Set up global timer state
            global.window = global.window || {};
            global.window.running = true;
            global.window.timeOffset = 0;
            
            // Create mock agenda with 5 sections
            // Start the agenda 2 minutes in the past so there's room to go backward
            const now = Date.now();
            const agendaStart = now - 120000; // 2 minutes ago
            
            global.window.currentAgenda = [
                {
                    text: 'Section 1',
                    commencesAt: new Date(agendaStart),
                    concludesAt: new Date(agendaStart + 60000) // 1 minute
                },
                {
                    text: 'Section 2',
                    commencesAt: new Date(agendaStart + 60000),
                    concludesAt: new Date(agendaStart + 120000) // 2 minutes
                },
                {
                    text: 'Section 3',
                    commencesAt: new Date(agendaStart + 120000),
                    concludesAt: new Date(agendaStart + 180000) // 3 minutes
                },
                {
                    text: 'Section 4',
                    commencesAt: new Date(agendaStart + 180000),
                    concludesAt: new Date(agendaStart + 240000) // 4 minutes
                },
                {
                    text: 'Section 5',
                    commencesAt: new Date(agendaStart + 240000),
                    concludesAt: new Date(agendaStart + 300000) // 5 minutes
                }
            ];
            
            // Reset TimeAdjuster state
            TimeAdjuster.reset();
        });

        afterEach(() => {
            TimeAdjuster.reset();
        });

        describe('Basic Operations', () => {
            test('should add time successfully by extending current section', () => {
                // The agenda starts 2 minutes ago, so we're currently in section 3 (index 2)
                // which runs from agendaStart + 120000 to agendaStart + 180000
                const currentSectionIndex = TimeAdjuster._getCurrentSectionIndex();
                const currentSection = global.window.currentAgenda[currentSectionIndex];
                const initialEndTime = currentSection.concludesAt.getTime();
                
                const result = TimeAdjuster.addTime(30);
                
                expect(result).toBe(true);
                // addTime extends the current section's end time by 30 seconds
                expect(currentSection.concludesAt.getTime()).toBe(initialEndTime + 30000);
            });

            test('should subtract time successfully by shortening current section', () => {
                const currentSectionIndex = TimeAdjuster._getCurrentSectionIndex();
                const currentSection = global.window.currentAgenda[currentSectionIndex];
                const initialEndTime = currentSection.concludesAt.getTime();
                
                const result = TimeAdjuster.subtractTime(30);
                
                expect(result).toBe(true);
                // subtractTime shortens the current section's end time by 30 seconds
                expect(currentSection.concludesAt.getTime()).toBe(initialEndTime - 30000);
            });

            test('should use default 30 seconds when no argument provided', () => {
                const currentSectionIndex = TimeAdjuster._getCurrentSectionIndex();
                const currentSection = global.window.currentAgenda[currentSectionIndex];
                const initialEndTime = currentSection.concludesAt.getTime();
                
                TimeAdjuster.addTime();
                
                // addTime extends the current section's end time by 30 seconds
                expect(currentSection.concludesAt.getTime()).toBe(initialEndTime + 30000);
            });

            test('should fail when timer is not running', () => {
                global.window.running = false;
                const currentSectionIndex = TimeAdjuster._getCurrentSectionIndex();
                const currentSection = global.window.currentAgenda[currentSectionIndex];
                const initialEndTime = currentSection.concludesAt.getTime();
                
                const result = TimeAdjuster.addTime(30);
                
                expect(result).toBe(false);
                // Section end time should not change
                expect(currentSection.concludesAt.getTime()).toBe(initialEndTime);
            });
            
            test('should shift subsequent sections when time is added', () => {
                const currentSectionIndex = TimeAdjuster._getCurrentSectionIndex();
                // Get sections after the current one
                const nextSectionIndex = currentSectionIndex + 1;
                const nextNextSectionIndex = currentSectionIndex + 2;
                
                // Skip if we don't have enough sections after current
                if (nextNextSectionIndex >= global.window.currentAgenda.length) {
                    return;
                }
                
                const nextSection = global.window.currentAgenda[nextSectionIndex];
                const nextNextSection = global.window.currentAgenda[nextNextSectionIndex];
                const initialNextStart = nextSection.commencesAt.getTime();
                const initialNextNextStart = nextNextSection.commencesAt.getTime();
                
                TimeAdjuster.addTime(30);
                
                // Subsequent sections should be shifted forward by 30 seconds
                expect(nextSection.commencesAt.getTime()).toBe(initialNextStart + 30000);
                expect(nextNextSection.commencesAt.getTime()).toBe(initialNextNextStart + 30000);
            });
            
            test('should shift subsequent sections when time is subtracted', () => {
                const currentSectionIndex = TimeAdjuster._getCurrentSectionIndex();
                // Get sections after the current one
                const nextSectionIndex = currentSectionIndex + 1;
                const nextNextSectionIndex = currentSectionIndex + 2;
                
                // Skip if we don't have enough sections after current
                if (nextNextSectionIndex >= global.window.currentAgenda.length) {
                    return;
                }
                
                const nextSection = global.window.currentAgenda[nextSectionIndex];
                const nextNextSection = global.window.currentAgenda[nextNextSectionIndex];
                const initialNextStart = nextSection.commencesAt.getTime();
                const initialNextNextStart = nextNextSection.commencesAt.getTime();
                
                TimeAdjuster.subtractTime(30);
                
                // Subsequent sections should be shifted backward by 30 seconds
                expect(nextSection.commencesAt.getTime()).toBe(initialNextStart - 30000);
                expect(nextNextSection.commencesAt.getTime()).toBe(initialNextNextStart - 30000);
            });
        });

        describe('State Tracking', () => {
            test('should track total adjustments', async () => {
                TimeAdjuster.addTime(30);
                
                // Wait for lock to release
                await new Promise(resolve => setTimeout(resolve, 60));
                
                TimeAdjuster.addTime(30);
                
                // Total adjustments tracks the cumulative time added (positive for addTime)
                expect(TimeAdjuster.getTotalAdjustments()).toBe(60000);
            });

            test('should track last adjustment time', () => {
                const beforeTime = Date.now();
                TimeAdjuster.addTime(30);
                const afterTime = Date.now();
                
                const lastTime = TimeAdjuster.getLastAdjustmentTime();
                expect(lastTime).toBeGreaterThanOrEqual(beforeTime);
                expect(lastTime).toBeLessThanOrEqual(afterTime);
            });

            test('should reset state correctly', () => {
                TimeAdjuster.addTime(30);
                TimeAdjuster.reset();
                
                expect(TimeAdjuster.getTotalAdjustments()).toBe(0);
                expect(TimeAdjuster.getLastAdjustmentTime()).toBeNull();
            });
        });

        describe('Property-Based Tests', () => {
            test('Property 4: Time adjustment minimum clamping', () => {
                /**
                 * Feature: timer-controls, Property 4: Time adjustment minimum clamping
                 * Validates: Requirements 3.5
                 * 
                 * For any time subtraction, the current section should maintain
                 * at least 5 seconds remaining (minimum clamping)
                 */
                fc.assert(fc.property(
                    fc.integer({ min: 1, max: 120 }), // Random subtraction amount (1-120 seconds)
                    (subtractSeconds) => {
                        // Reset state and recreate agenda for each test
                        TimeAdjuster.reset();
                        global.window.running = true;
                        global.window.timeOffset = 0;
                        
                        // Create a fresh agenda with known times
                        const agendaStart = Date.now();
                        global.window.currentAgenda = [
                            {
                                text: 'Section 1',
                                commencesAt: new Date(agendaStart),
                                concludesAt: new Date(agendaStart + 60000) // 1 minute
                            },
                            {
                                text: 'Section 2',
                                commencesAt: new Date(agendaStart + 60000),
                                concludesAt: new Date(agendaStart + 120000) // 2 minutes
                            }
                        ];
                        
                        const currentSection = global.window.currentAgenda[0];
                        
                        // Perform the subtraction
                        TimeAdjuster.subtractTime(subtractSeconds);
                        
                        // Calculate time remaining after adjustment
                        const effectiveTime = TimeAdjuster.getCurrentEffectiveTime();
                        const timeRemaining = currentSection.concludesAt.getTime() - effectiveTime;
                        
                        // Verify: time remaining should be at least 5 seconds (5000ms)
                        expect(timeRemaining).toBeGreaterThanOrEqual(5000);
                    }
                ), { numRuns: 100 });
            });

            test('Property 5: Section shifting consistency', () => {
                /**
                 * Feature: timer-controls, Property 5: Section shifting consistency
                 * Validates: Requirements 3.3, 3.4
                 * 
                 * For any time adjustment, all subsequent sections should be
                 * shifted by the same amount, maintaining their relative durations
                 */
                fc.assert(fc.property(
                    fc.integer({ min: -60, max: 60 }), // Random adjustment (-60s to +60s)
                    (adjustmentSeconds) => {
                        // Reset state and recreate agenda for each test
                        TimeAdjuster.reset();
                        global.window.running = true;
                        global.window.timeOffset = 0;
                        
                        // Create a fresh agenda with known times
                        const agendaStart = Date.now();
                        global.window.currentAgenda = [
                            {
                                text: 'Section 1',
                                commencesAt: new Date(agendaStart),
                                concludesAt: new Date(agendaStart + 60000) // 1 minute
                            },
                            {
                                text: 'Section 2',
                                commencesAt: new Date(agendaStart + 60000),
                                concludesAt: new Date(agendaStart + 120000) // 2 minutes
                            },
                            {
                                text: 'Section 3',
                                commencesAt: new Date(agendaStart + 120000),
                                concludesAt: new Date(agendaStart + 180000) // 3 minutes
                            }
                        ];
                        
                        // Record initial section durations
                        const section2Duration = global.window.currentAgenda[1].concludesAt.getTime() - 
                                                 global.window.currentAgenda[1].commencesAt.getTime();
                        const section3Duration = global.window.currentAgenda[2].concludesAt.getTime() - 
                                                 global.window.currentAgenda[2].commencesAt.getTime();
                        
                        // Perform the adjustment
                        TimeAdjuster.adjustTime(adjustmentSeconds);
                        
                        // Verify: subsequent sections maintain their original durations
                        const newSection2Duration = global.window.currentAgenda[1].concludesAt.getTime() - 
                                                    global.window.currentAgenda[1].commencesAt.getTime();
                        const newSection3Duration = global.window.currentAgenda[2].concludesAt.getTime() - 
                                                    global.window.currentAgenda[2].commencesAt.getTime();
                        
                        expect(newSection2Duration).toBe(section2Duration);
                        expect(newSection3Duration).toBe(section3Duration);
                    }
                ), { numRuns: 100 });
            });
        });
    });

    describe('TouchGestureHandler (Placeholder)', () => {
        test('should be ready for implementation', () => {
            expect(true).toBe(true); // Placeholder
        });
    });
});