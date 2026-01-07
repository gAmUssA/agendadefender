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

    describe('TouchGestureHandler', () => {
        let TouchGestureHandler;

        beforeEach(() => {
            // Load the TouchGestureHandler module
            TouchGestureHandler = require('../scripts/touch-gesture-handler.js');
            
            // Set up DOM for touch testing
            document.body.innerHTML = `
                <div id="ticker">
                    <div class="timer-display">00:00</div>
                    <div class="agenda-item">
                        <span class="agenda-item-text">Test Item</span>
                    </div>
                    <div class="ticker-controls">
                        <button id="pause-button" style="width: 44px; height: 44px;">Pause</button>
                        <button id="next-section" style="width: 44px; height: 44px;">Next</button>
                        <button id="prev-section" style="width: 44px; height: 44px;">Previous</button>
                    </div>
                </div>
            `;

            // Mock SectionNavigator
            global.SectionNavigator = {
                nextSection: jest.fn(() => true),
                previousSection: jest.fn(() => true)
            };

            // Mock PauseController
            global.PauseController = {
                toggle: jest.fn(() => true),
                isPaused: jest.fn(() => false)
            };

            // Mock navigator.vibrate
            global.navigator.vibrate = jest.fn(() => true);
        });

        afterEach(() => {
            TouchGestureHandler.destroy();
            TouchGestureHandler.resetTouchState();
            delete global.SectionNavigator;
            delete global.PauseController;
        });

        describe('Initialization', () => {
            test('should initialize successfully', () => {
                TouchGestureHandler.initialize();
                expect(TouchGestureHandler.isInitialized()).toBe(true);
            });

            test('should destroy successfully', () => {
                TouchGestureHandler.initialize();
                TouchGestureHandler.destroy();
                expect(TouchGestureHandler.isInitialized()).toBe(false);
            });
        });

        describe('Swipe Detection', () => {
            test('should detect left swipe with sufficient distance', () => {
                const result = TouchGestureHandler.detectSwipe(150, 50, 0, 200);
                expect(result).toBe('left');
            });

            test('should detect right swipe with sufficient distance', () => {
                const result = TouchGestureHandler.detectSwipe(50, 150, 0, 200);
                expect(result).toBe('right');
            });

            test('should reject swipe with insufficient distance', () => {
                const result = TouchGestureHandler.detectSwipe(50, 80, 0, 200);
                expect(result).toBeNull();
            });

            test('should reject swipe that takes too long', () => {
                const result = TouchGestureHandler.detectSwipe(50, 150, 0, 500);
                expect(result).toBeNull();
            });

            test('should reject diagonal swipe', () => {
                const result = TouchGestureHandler.detectSwipe(50, 150, 80, 200);
                expect(result).toBeNull();
            });
        });

        describe('Tap Detection', () => {
            test('should detect tap with minimal movement', () => {
                const result = TouchGestureHandler.isTap(5, 5, 100);
                expect(result).toBe(true);
            });

            test('should reject tap with too much movement', () => {
                const result = TouchGestureHandler.isTap(20, 20, 100);
                expect(result).toBe(false);
            });

            test('should reject tap that takes too long', () => {
                const result = TouchGestureHandler.isTap(5, 5, 300);
                expect(result).toBe(false);
            });
        });

        describe('Tap-to-Pause Functionality', () => {
            test('should toggle pause when tapping on timer display', () => {
                TouchGestureHandler.initialize();
                
                // Get the timer display element (not an agenda item)
                const timerDisplay = document.querySelector('.timer-display');
                
                // Simulate a tap on the timer display
                TouchGestureHandler.handleTouchStart({
                    touches: [{ clientX: 100, clientY: 100 }],
                    target: timerDisplay
                });
                
                // Simulate touch end with minimal movement (tap)
                TouchGestureHandler.handleTouchEnd({
                    changedTouches: [{ clientX: 102, clientY: 102 }]
                });
                
                // PauseController.toggle should have been called
                expect(global.PauseController.toggle).toHaveBeenCalled();
            });

            test('should not toggle pause when tapping outside timer area', () => {
                TouchGestureHandler.initialize();
                
                // Create an element outside the timer area
                const outsideElement = document.createElement('div');
                outsideElement.id = 'outside';
                document.body.appendChild(outsideElement);
                
                // Simulate a tap on the outside element
                TouchGestureHandler.handleTouchStart({
                    touches: [{ clientX: 100, clientY: 100 }],
                    target: outsideElement
                });
                
                // Simulate touch end with minimal movement (tap)
                TouchGestureHandler.handleTouchEnd({
                    changedTouches: [{ clientX: 102, clientY: 102 }]
                });
                
                // PauseController.toggle should NOT have been called
                expect(global.PauseController.toggle).not.toHaveBeenCalled();
            });

            test('should distinguish between taps and swipes', () => {
                TouchGestureHandler.initialize();
                
                const timerDisplay = document.querySelector('.timer-display');
                
                // Simulate a swipe (large movement)
                TouchGestureHandler.handleTouchStart({
                    touches: [{ clientX: 50, clientY: 100 }],
                    target: timerDisplay
                });
                
                // Simulate touch end with large horizontal movement (swipe)
                TouchGestureHandler.handleTouchEnd({
                    changedTouches: [{ clientX: 150, clientY: 100 }]
                });
                
                // PauseController.toggle should NOT have been called (it's a swipe, not a tap)
                expect(global.PauseController.toggle).not.toHaveBeenCalled();
                
                // SectionNavigator.previousSection should have been called (right swipe)
                expect(global.SectionNavigator.previousSection).toHaveBeenCalled();
            });
        });

        describe('Tap-to-Jump Section Functionality', () => {
            beforeEach(() => {
                // Set up DOM with agenda items
                document.body.innerHTML = `
                    <div id="ticker">
                        <div class="timer-display">00:00</div>
                        <div class="agenda-item" data-section-index="0">
                            <span class="agenda-item-text">Section 1</span>
                        </div>
                        <div class="agenda-item" data-section-index="1">
                            <span class="agenda-item-text">Section 2</span>
                        </div>
                        <div class="agenda-item" data-section-index="2">
                            <span class="agenda-item-text">Section 3</span>
                        </div>
                        <div class="section-list">
                            <div class="section-item" data-section-index="0">Section 1</div>
                            <div class="section-item" data-section-index="1">Section 2</div>
                            <div class="section-item" data-section-index="2">Section 3</div>
                        </div>
                    </div>
                `;
                
                // Reset mocks
                global.SectionNavigator.jumpToSection = jest.fn(() => true);
            });

            test('should jump to section when tapping on agenda item', () => {
                TouchGestureHandler.initialize();
                
                const agendaItem = document.querySelector('.agenda-item[data-section-index="1"]');
                
                // Simulate a tap on the agenda item
                TouchGestureHandler.handleTouchStart({
                    touches: [{ clientX: 100, clientY: 100 }],
                    target: agendaItem
                });
                
                TouchGestureHandler.handleTouchEnd({
                    changedTouches: [{ clientX: 102, clientY: 102 }]
                });
                
                // SectionNavigator.jumpToSection should have been called with index 1
                expect(global.SectionNavigator.jumpToSection).toHaveBeenCalledWith(1);
                
                // PauseController.toggle should NOT have been called
                expect(global.PauseController.toggle).not.toHaveBeenCalled();
            });

            test('should jump to section when tapping on child element of agenda item', () => {
                TouchGestureHandler.initialize();
                
                const agendaItemText = document.querySelector('.agenda-item[data-section-index="2"] .agenda-item-text');
                
                // Simulate a tap on the text inside the agenda item
                TouchGestureHandler.handleTouchStart({
                    touches: [{ clientX: 100, clientY: 100 }],
                    target: agendaItemText
                });
                
                TouchGestureHandler.handleTouchEnd({
                    changedTouches: [{ clientX: 102, clientY: 102 }]
                });
                
                // SectionNavigator.jumpToSection should have been called with index 2
                expect(global.SectionNavigator.jumpToSection).toHaveBeenCalledWith(2);
            });

            test('should jump to section when tapping on section list item', () => {
                TouchGestureHandler.initialize();
                
                const sectionItem = document.querySelector('.section-item[data-section-index="0"]');
                
                // Simulate a tap on the section list item
                TouchGestureHandler.handleTouchStart({
                    touches: [{ clientX: 100, clientY: 100 }],
                    target: sectionItem
                });
                
                TouchGestureHandler.handleTouchEnd({
                    changedTouches: [{ clientX: 102, clientY: 102 }]
                });
                
                // SectionNavigator.jumpToSection should have been called with index 0
                expect(global.SectionNavigator.jumpToSection).toHaveBeenCalledWith(0);
            });

            test('should find agenda item from element correctly', () => {
                const agendaItem = document.querySelector('.agenda-item[data-section-index="1"]');
                const childElement = agendaItem.querySelector('.agenda-item-text');
                
                // Should find agenda item from the item itself
                expect(TouchGestureHandler.findAgendaItemFromElement(agendaItem)).toBe(agendaItem);
                
                // Should find agenda item from child element
                expect(TouchGestureHandler.findAgendaItemFromElement(childElement)).toBe(agendaItem);
                
                // Should return null for non-agenda elements
                const timerDisplay = document.querySelector('.timer-display');
                expect(TouchGestureHandler.findAgendaItemFromElement(timerDisplay)).toBeNull();
            });

            test('should find section index from agenda item', () => {
                const agendaItem0 = document.querySelector('.agenda-item[data-section-index="0"]');
                const agendaItem1 = document.querySelector('.agenda-item[data-section-index="1"]');
                const agendaItem2 = document.querySelector('.agenda-item[data-section-index="2"]');
                
                expect(TouchGestureHandler.findSectionIndexFromAgendaItem(agendaItem0)).toBe(0);
                expect(TouchGestureHandler.findSectionIndexFromAgendaItem(agendaItem1)).toBe(1);
                expect(TouchGestureHandler.findSectionIndexFromAgendaItem(agendaItem2)).toBe(2);
            });
        });
        describe('Swipe Handling', () => {
            test('should call SectionNavigator.nextSection on left swipe', () => {
                TouchGestureHandler.handleSwipe('left');
                expect(global.SectionNavigator.nextSection).toHaveBeenCalled();
            });

            test('should call SectionNavigator.previousSection on right swipe', () => {
                TouchGestureHandler.handleSwipe('right');
                expect(global.SectionNavigator.previousSection).toHaveBeenCalled();
            });
        });

        describe('Multi-touch Prevention', () => {
            test('should ignore multi-touch gestures', () => {
                TouchGestureHandler.initialize();
                
                // Simulate multi-touch start
                const multiTouchStart = new TouchEvent('touchstart', {
                    touches: [
                        { clientX: 50, clientY: 100 },
                        { clientX: 100, clientY: 100 }
                    ]
                });
                
                TouchGestureHandler.handleTouchStart(multiTouchStart);
                
                // Touch state should not be tracking
                const state = TouchGestureHandler.getTouchState();
                expect(state.isTracking).toBe(false);
            });
        });

        describe('Touch Target Accessibility', () => {
            test('should validate touch target size correctly', () => {
                const button = document.getElementById('pause-button');
                // Mock getBoundingClientRect
                button.getBoundingClientRect = jest.fn(() => ({
                    width: 44,
                    height: 44
                }));
                
                const result = TouchGestureHandler.checkTouchTargetSize(button);
                expect(result).toBe(true);
            });

            test('should fail validation for small touch targets', () => {
                const button = document.getElementById('pause-button');
                // Mock getBoundingClientRect with small size
                button.getBoundingClientRect = jest.fn(() => ({
                    width: 30,
                    height: 30
                }));
                
                const result = TouchGestureHandler.checkTouchTargetSize(button);
                expect(result).toBe(false);
            });
        });

        describe('Haptic Feedback', () => {
            test('should call navigator.vibrate when available', () => {
                TouchGestureHandler.provideHapticFeedback();
                expect(global.navigator.vibrate).toHaveBeenCalledWith(50);
            });
        });

        describe('Property-Based Tests', () => {
            test('Property 6: Touch gesture distance validation', () => {
                /**
                 * Feature: timer-controls, Property 6: Touch gesture distance validation
                 * Validates: Requirements 6.1, 6.2, 6.6, 6.7
                 * 
                 * For any swipe gesture, only swipes with distance >= 50px should trigger
                 * navigation, and multi-touch should be ignored.
                 */
                fc.assert(fc.property(
                    fc.integer({ min: 0, max: 200 }),  // Random start X
                    fc.integer({ min: 0, max: 200 }),  // Random end X
                    fc.integer({ min: 0, max: 100 }),  // Random vertical movement
                    fc.integer({ min: 50, max: 400 }), // Random duration
                    (startX, endX, deltaY, duration) => {
                        const distance = Math.abs(endX - startX);
                        const minSwipeDistance = TouchGestureHandler.getConfig('MIN_SWIPE_DISTANCE');
                        const swipeTimeout = TouchGestureHandler.getConfig('SWIPE_TIMEOUT');
                        
                        const result = TouchGestureHandler.detectSwipe(startX, endX, deltaY, duration);
                        
                        // If distance is less than minimum, result should be null
                        if (distance < minSwipeDistance) {
                            expect(result).toBeNull();
                            return;
                        }
                        
                        // If duration exceeds timeout, result should be null
                        if (duration > swipeTimeout) {
                            expect(result).toBeNull();
                            return;
                        }
                        
                        // If vertical movement is too large (diagonal), result should be null
                        if (Math.abs(deltaY) > distance / 2) {
                            expect(result).toBeNull();
                            return;
                        }
                        
                        // Otherwise, should detect valid swipe direction
                        if (endX > startX) {
                            expect(result).toBe('right');
                        } else {
                            expect(result).toBe('left');
                        }
                    }
                ), { numRuns: 100 });
            });

            test('Property 7: Touch target accessibility', () => {
                /**
                 * Feature: timer-controls, Property 7: Touch target accessibility
                 * Validates: Requirements 6.5
                 * 
                 * For any interactive element on mobile, the touch target should be
                 * at least 44x44px for accessibility compliance.
                 */
                fc.assert(fc.property(
                    fc.integer({ min: 20, max: 100 }),  // Random width
                    fc.integer({ min: 20, max: 100 }),  // Random height
                    (width, height) => {
                        // Create a test element with random dimensions
                        const testElement = document.createElement('button');
                        testElement.id = 'test-touch-target';
                        testElement.style.width = `${width}px`;
                        testElement.style.height = `${height}px`;
                        document.body.appendChild(testElement);
                        
                        // Mock getBoundingClientRect to return the specified dimensions
                        testElement.getBoundingClientRect = jest.fn(() => ({
                            width: width,
                            height: height
                        }));
                        
                        const minTouchTarget = TouchGestureHandler.getConfig('MIN_TOUCH_TARGET');
                        const result = TouchGestureHandler.checkTouchTargetSize(testElement);
                        
                        // Verify: element passes if both dimensions >= 44px
                        const expectedResult = width >= minTouchTarget && height >= minTouchTarget;
                        expect(result).toBe(expectedResult);
                        
                        // Clean up
                        testElement.remove();
                    }
                ), { numRuns: 100 });
            });
        });
    });

    describe('KeyboardShortcuts', () => {
        let KeyboardShortcuts;

        beforeEach(() => {
            // Load the KeyboardShortcuts module
            KeyboardShortcuts = require('../scripts/keyboard-shortcuts.js');
            
            // Set up DOM with input fields for testing
            document.body.innerHTML = `
                <div id="ticker">
                    <div class="timer-display">00:00</div>
                </div>
                <input type="text" id="test-input" />
                <textarea id="test-textarea"></textarea>
                <div id="regular-div">Regular content</div>
            `;

            // Initialize KeyboardShortcuts
            KeyboardShortcuts.initialize();
            KeyboardShortcuts.setEnabled(true);
        });

        afterEach(() => {
            KeyboardShortcuts.destroy();
        });

        describe('Input Field Handling', () => {
            test('should ignore shortcuts when focus is on INPUT element', () => {
                const input = document.getElementById('test-input');
                
                // Create a mock event targeting the input
                const event = {
                    target: input,
                    tagName: 'INPUT',
                    code: 'Space',
                    key: ' ',
                    ctrlKey: false,
                    altKey: false,
                    metaKey: false,
                    isComposing: false,
                    preventDefault: jest.fn()
                };
                
                const result = KeyboardShortcuts.shouldIgnoreEvent(event);
                expect(result).toBe(true);
            });

            test('should ignore shortcuts when focus is on TEXTAREA element', () => {
                const textarea = document.getElementById('test-textarea');
                
                // Create a mock event targeting the textarea
                const event = {
                    target: textarea,
                    tagName: 'TEXTAREA',
                    code: 'KeyR',
                    key: 'r',
                    ctrlKey: false,
                    altKey: false,
                    metaKey: false,
                    isComposing: false,
                    preventDefault: jest.fn()
                };
                
                const result = KeyboardShortcuts.shouldIgnoreEvent(event);
                expect(result).toBe(true);
            });

            test('should process shortcuts when focus is on regular elements', () => {
                const div = document.getElementById('regular-div');
                
                // Create a mock event targeting a regular div
                const event = {
                    target: div,
                    tagName: 'DIV',
                    code: 'Space',
                    key: ' ',
                    ctrlKey: false,
                    altKey: false,
                    metaKey: false,
                    isComposing: false,
                    preventDefault: jest.fn()
                };
                
                const result = KeyboardShortcuts.shouldIgnoreEvent(event);
                expect(result).toBe(false);
            });

            test('should ignore shortcuts when modifier keys are pressed', () => {
                const div = document.getElementById('regular-div');
                
                // Test with Ctrl key
                const ctrlEvent = {
                    target: div,
                    tagName: 'DIV',
                    code: 'Space',
                    key: ' ',
                    ctrlKey: true,
                    altKey: false,
                    metaKey: false,
                    isComposing: false,
                    preventDefault: jest.fn()
                };
                
                expect(KeyboardShortcuts.shouldIgnoreEvent(ctrlEvent)).toBe(true);
                
                // Test with Alt key
                const altEvent = {
                    target: div,
                    tagName: 'DIV',
                    code: 'Space',
                    key: ' ',
                    ctrlKey: false,
                    altKey: true,
                    metaKey: false,
                    isComposing: false,
                    preventDefault: jest.fn()
                };
                
                expect(KeyboardShortcuts.shouldIgnoreEvent(altEvent)).toBe(true);
                
                // Test with Meta key (Cmd on Mac)
                const metaEvent = {
                    target: div,
                    tagName: 'DIV',
                    code: 'Space',
                    key: ' ',
                    ctrlKey: false,
                    altKey: false,
                    metaKey: true,
                    isComposing: false,
                    preventDefault: jest.fn()
                };
                
                expect(KeyboardShortcuts.shouldIgnoreEvent(metaEvent)).toBe(true);
            });

            test('should ignore shortcuts during IME composition', () => {
                const div = document.getElementById('regular-div');
                
                const event = {
                    target: div,
                    tagName: 'DIV',
                    code: 'Space',
                    key: ' ',
                    ctrlKey: false,
                    altKey: false,
                    metaKey: false,
                    isComposing: true,
                    preventDefault: jest.fn()
                };
                
                const result = KeyboardShortcuts.shouldIgnoreEvent(event);
                expect(result).toBe(true);
            });
        });

        describe('Reset Functionality', () => {
            test('should call onReset callback when R key is pressed', () => {
                const resetCallback = jest.fn();
                
                KeyboardShortcuts.setCallbacks({
                    onReset: resetCallback
                });
                
                // Call resetTimer directly
                KeyboardShortcuts.resetTimer();
                
                expect(resetCallback).toHaveBeenCalled();
            });

            test('should reset timer state when resetTimer is called', () => {
                // Set up initial state
                KeyboardShortcuts.updateTimerState({
                    isRunning: true,
                    currentSectionIndex: 3,
                    totalSections: 5
                });
                
                // Call resetTimer
                KeyboardShortcuts.resetTimer();
                
                // Verify state is reset
                const state = KeyboardShortcuts.getTimerState();
                expect(state.currentSectionIndex).toBe(0);
                expect(state.isRunning).toBe(false);
            });
        });

        describe('Property-Based Tests', () => {
            test('Property 9: Keyboard shortcut input field handling', () => {
                /**
                 * Feature: timer-controls, Property 9: Keyboard shortcut input field handling
                 * Validates: Requirements 5.8
                 * 
                 * For any keyboard shortcut pressed while focus is on input fields,
                 * the shortcut should be ignored.
                 */
                fc.assert(fc.property(
                    fc.constantFrom('INPUT', 'TEXTAREA', 'DIV', 'BUTTON', 'SPAN', 'P'),  // Random element types
                    fc.constantFrom('Space', 'KeyR', 'KeyN', 'KeyP', 'KeyF', 'KeyM', 'ArrowLeft', 'ArrowRight', 'Equal', 'Minus'),  // Random shortcut keys
                    fc.boolean(),  // Random ctrl key state
                    fc.boolean(),  // Random alt key state
                    fc.boolean(),  // Random meta key state
                    fc.boolean(),  // Random isComposing state
                    (tagName, keyCode, ctrlKey, altKey, metaKey, isComposing) => {
                        // Create a mock element
                        const element = document.createElement(tagName.toLowerCase());
                        element.id = 'test-element-' + Math.random();
                        document.body.appendChild(element);
                        
                        // Create a mock event
                        const event = {
                            target: element,
                            tagName: tagName,
                            code: keyCode,
                            key: keyCode,
                            ctrlKey: ctrlKey,
                            altKey: altKey,
                            metaKey: metaKey,
                            isComposing: isComposing,
                            preventDefault: jest.fn()
                        };
                        
                        const result = KeyboardShortcuts.shouldIgnoreEvent(event);
                        
                        // Determine expected result based on conditions
                        const isInputField = tagName === 'INPUT' || tagName === 'TEXTAREA';
                        const hasModifier = ctrlKey || altKey || metaKey;
                        const shouldIgnore = isInputField || hasModifier || isComposing || !KeyboardShortcuts.isEnabled();
                        
                        // Verify: shortcuts should be ignored when:
                        // 1. Focus is on INPUT or TEXTAREA (Requirements 5.8)
                        // 2. Modifier keys are pressed
                        // 3. IME composition is in progress
                        // 4. Shortcuts are disabled
                        expect(result).toBe(shouldIgnore);
                        
                        // Clean up
                        element.remove();
                    }
                ), { numRuns: 100 });
            });
        });
    });

    describe('StateManager', () => {
        let StateManager;

        beforeEach(() => {
            // Load the StateManager module
            StateManager = require('../scripts/state-manager.js');
            
            // Set up global timer state
            global.window = global.window || {};
            global.window.running = true;
            global.window.timeOffset = 0;
            
            // Reset StateManager
            StateManager.reset();
        });

        afterEach(() => {
            StateManager.reset();
        });

        describe('State Management', () => {
            test('should initialize with correct default state', () => {
                const state = StateManager.getState();
                expect(state.isRunning).toBe(false);
                expect(state.isPaused).toBe(false);
                expect(state.currentSectionIndex).toBe(0);
                expect(state.totalSections).toBe(0);
                expect(state.totalPausedDuration).toBe(0);
            });

            test('should update state successfully with valid updates', () => {
                const result = StateManager.updateState({
                    isRunning: true,
                    totalSections: 5
                });
                
                expect(result).toBe(true);
                const state = StateManager.getState();
                expect(state.isRunning).toBe(true);
                expect(state.totalSections).toBe(5);
            });

            test('should reject invalid state updates', () => {
                // Try to set isPaused=true when isRunning=false (invalid)
                const result = StateManager.updateState({
                    isPaused: true,
                    isRunning: false
                });
                
                expect(result).toBe(false);
            });

            test('should initialize from timer correctly', () => {
                const mockAgenda = [
                    { text: 'Section 1' },
                    { text: 'Section 2' },
                    { text: 'Section 3' }
                ];
                
                StateManager.initializeFromTimer(mockAgenda);
                
                const state = StateManager.getState();
                expect(state.isRunning).toBe(true);
                expect(state.totalSections).toBe(3);
                expect(state.currentSectionIndex).toBe(0);
                expect(state.completionTriggered).toBe(false);
            });
        });

        describe('State Validation', () => {
            test('should validate pause requires running', () => {
                const invalidState = {
                    isRunning: false,
                    isPaused: true,
                    currentSectionIndex: 0,
                    totalSections: 0,
                    pausedAt: null,
                    totalPausedDuration: 0
                };
                
                const result = StateManager.validateState(invalidState);
                expect(result.valid).toBe(false);
            });

            test('should validate section index in bounds', () => {
                const invalidState = {
                    isRunning: true,
                    isPaused: false,
                    currentSectionIndex: 10,
                    totalSections: 5,
                    pausedAt: null,
                    totalPausedDuration: 0
                };
                
                const result = StateManager.validateState(invalidState);
                expect(result.valid).toBe(false);
            });

            test('should validate pausedAt consistency', () => {
                const invalidState = {
                    isRunning: true,
                    isPaused: true,
                    currentSectionIndex: 0,
                    totalSections: 5,
                    pausedAt: null, // Should be set when isPaused is true
                    totalPausedDuration: 0
                };
                
                const result = StateManager.validateState(invalidState);
                expect(result.valid).toBe(false);
            });

            test('should validate totalPausedDuration non-negative', () => {
                const invalidState = {
                    isRunning: true,
                    isPaused: false,
                    currentSectionIndex: 0,
                    totalSections: 5,
                    pausedAt: null,
                    totalPausedDuration: -100
                };
                
                const result = StateManager.validateState(invalidState);
                expect(result.valid).toBe(false);
            });

            test('should accept valid state', () => {
                const validState = {
                    isRunning: true,
                    isPaused: false,
                    currentSectionIndex: 2,
                    totalSections: 5,
                    pausedAt: null,
                    totalPausedDuration: 1000
                };
                
                const result = StateManager.validateState(validState);
                expect(result.valid).toBe(true);
            });
        });

        describe('Completion Handling', () => {
            test('should mark completion correctly', () => {
                StateManager.initializeFromTimer([{ text: 'Section 1' }]);
                expect(StateManager.isCompleted()).toBe(false);
                
                StateManager.markCompleted();
                expect(StateManager.isCompleted()).toBe(true);
            });

            test('should reset completion on reset', () => {
                StateManager.initializeFromTimer([{ text: 'Section 1' }]);
                StateManager.markCompleted();
                expect(StateManager.isCompleted()).toBe(true);
                
                StateManager.reset();
                expect(StateManager.isCompleted()).toBe(false);
            });
        });

        describe('Operation Locking', () => {
            test('should track operation lock state', () => {
                expect(StateManager.isOperationLocked()).toBe(false);
            });

            test('should execute operation with lock', () => {
                let executed = false;
                const result = StateManager.executeWithLock(() => {
                    executed = true;
                    return 'success';
                });
                
                expect(executed).toBe(true);
                expect(result).toBe('success');
            });
        });

        describe('State Listeners', () => {
            test('should notify listeners on state change', () => {
                const listener = jest.fn();
                StateManager.addListener(listener);
                
                StateManager.updateState({ isRunning: true, totalSections: 3 });
                
                expect(listener).toHaveBeenCalled();
                expect(listener).toHaveBeenCalledWith(
                    expect.objectContaining({ isRunning: false }),
                    expect.objectContaining({ isRunning: true })
                );
            });

            test('should remove listeners correctly', () => {
                const listener = jest.fn();
                StateManager.addListener(listener);
                StateManager.removeListener(listener);
                
                StateManager.updateState({ isRunning: true, totalSections: 3 });
                
                expect(listener).not.toHaveBeenCalled();
            });
        });

        describe('Property-Based Tests', () => {
            test('Property 8: State preservation during operations', () => {
                /**
                 * Feature: timer-controls, Property 8: State preservation during operations
                 * Validates: Requirements 7.1, 7.4
                 * 
                 * For any timer control operation (pause, navigation, adjustment),
                 * the running/paused state should be preserved and all UI components
                 * should remain consistent.
                 */
                fc.assert(fc.property(
                    fc.boolean(),                        // Random isRunning state
                    fc.boolean(),                        // Random isPaused state
                    fc.integer({ min: 0, max: 10 }),     // Random currentSectionIndex
                    fc.integer({ min: 1, max: 20 }),     // Random totalSections
                    fc.integer({ min: 0, max: 10000 }),  // Random totalPausedDuration
                    fc.constantFrom('pause', 'resume', 'navigate', 'adjust'), // Random operation type
                    (isRunning, isPaused, currentSectionIndex, totalSections, totalPausedDuration, operationType) => {
                        // Reset state
                        StateManager.reset();
                        
                        // Ensure valid state combinations
                        // isPaused can only be true if isRunning is true
                        const validIsPaused = isRunning ? isPaused : false;
                        // currentSectionIndex must be within bounds
                        const validSectionIndex = Math.min(currentSectionIndex, totalSections - 1);
                        // pausedAt should be set when isPaused is true
                        const pausedAt = validIsPaused ? Date.now() : null;
                        
                        // Set up initial state
                        const initialState = {
                            isRunning: isRunning,
                            isPaused: validIsPaused,
                            currentSectionIndex: validSectionIndex,
                            totalSections: totalSections,
                            pausedAt: pausedAt,
                            totalPausedDuration: totalPausedDuration,
                            completionTriggered: false
                        };
                        
                        // Validate initial state is valid
                        const initialValidation = StateManager.validateState(initialState);
                        if (!initialValidation.valid) {
                            // Skip invalid initial states
                            return;
                        }
                        
                        // Apply initial state
                        StateManager.updateState(initialState);
                        
                        // Perform operation based on type
                        let newState;
                        switch (operationType) {
                            case 'pause':
                                if (isRunning && !validIsPaused) {
                                    StateManager.updateState({
                                        isPaused: true,
                                        pausedAt: Date.now()
                                    });
                                }
                                break;
                            case 'resume':
                                if (validIsPaused) {
                                    StateManager.updateState({
                                        isPaused: false,
                                        pausedAt: null,
                                        totalPausedDuration: totalPausedDuration + 100
                                    });
                                }
                                break;
                            case 'navigate':
                                const newIndex = (validSectionIndex + 1) % totalSections;
                                StateManager.setCurrentSection(newIndex);
                                break;
                            case 'adjust':
                                StateManager.recordAdjustment(30000);
                                break;
                        }
                        
                        // Get final state
                        newState = StateManager.getState();
                        
                        // Verify state consistency
                        const finalValidation = StateManager.validateState(newState);
                        expect(finalValidation.valid).toBe(true);
                        
                        // Verify key invariants are preserved
                        // 1. totalSections should not change during operations
                        expect(newState.totalSections).toBe(totalSections);
                        
                        // 2. If isPaused is true, isRunning must be true
                        if (newState.isPaused) {
                            expect(newState.isRunning).toBe(true);
                        }
                        
                        // 3. currentSectionIndex should be within bounds
                        expect(newState.currentSectionIndex).toBeGreaterThanOrEqual(0);
                        expect(newState.currentSectionIndex).toBeLessThan(newState.totalSections);
                        
                        // 4. totalPausedDuration should be non-negative
                        expect(newState.totalPausedDuration).toBeGreaterThanOrEqual(0);
                        
                        // 5. pausedAt consistency
                        if (newState.isPaused) {
                            expect(newState.pausedAt).not.toBeNull();
                        } else {
                            expect(newState.pausedAt).toBeNull();
                        }
                    }
                ), { numRuns: 100 });
            });
        });
    });
});