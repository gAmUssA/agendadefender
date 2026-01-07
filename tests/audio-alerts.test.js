/**
 * Audio Alerts Test Suite
 * 
 * Tests for the AudioManager and VibrationManager modules.
 * Uses Jest for unit tests and fast-check for property-based testing.
 * 
 * @see .kiro/specs/audio-alerts/design.md for correctness properties
 */

const fc = require('fast-check');

// Mock Web Audio API
class MockAudioContext {
    constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.destination = {};
    }
    
    createOscillator() {
        return {
            connect: jest.fn(),
            frequency: { value: 0 },
            type: 'sine',
            start: jest.fn(),
            stop: jest.fn()
        };
    }
    
    createGain() {
        return {
            connect: jest.fn(),
            gain: {
                value: 0,
                exponentialRampToValueAtTime: jest.fn()
            }
        };
    }
    
    resume() {
        this.state = 'running';
        return Promise.resolve();
    }
}

// Set up global AudioContext mock
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock navigator.vibrate
const vibrateMock = jest.fn().mockReturnValue(true);
Object.defineProperty(global.navigator, 'vibrate', {
    value: vibrateMock,
    writable: true,
    configurable: true
});

describe('Audio Alerts Test Infrastructure', () => {
    describe('fast-check availability', () => {
        test('fast-check is available and working', () => {
            expect(fc).toBeDefined();
            expect(typeof fc.assert).toBe('function');
            expect(typeof fc.property).toBe('function');
        });

        test('can run a simple property test', () => {
            fc.assert(
                fc.property(fc.integer(), (n) => {
                    return typeof n === 'number';
                }),
                { numRuns: 100 }
            );
        });

        test('can generate integers in range', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0, max: 100 }), (n) => {
                    return n >= 0 && n <= 100;
                }),
                { numRuns: 100 }
            );
        });

        test('can generate booleans', () => {
            fc.assert(
                fc.property(fc.boolean(), (b) => {
                    return typeof b === 'boolean';
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('Web Audio API mock', () => {
        test('AudioContext mock is available', () => {
            expect(global.AudioContext).toBeDefined();
            const ctx = new AudioContext();
            expect(ctx.state).toBe('running');
        });

        test('webkitAudioContext mock is available for Safari compatibility', () => {
            expect(global.webkitAudioContext).toBeDefined();
            const ctx = new webkitAudioContext();
            expect(ctx.state).toBe('running');
        });

        test('AudioContext can create oscillator', () => {
            const ctx = new AudioContext();
            const oscillator = ctx.createOscillator();
            expect(oscillator).toBeDefined();
            expect(typeof oscillator.connect).toBe('function');
            expect(typeof oscillator.start).toBe('function');
            expect(typeof oscillator.stop).toBe('function');
        });

        test('AudioContext can create gain node', () => {
            const ctx = new AudioContext();
            const gainNode = ctx.createGain();
            expect(gainNode).toBeDefined();
            expect(typeof gainNode.connect).toBe('function');
            expect(gainNode.gain).toBeDefined();
        });
    });

    describe('Vibration API mock', () => {
        test('navigator.vibrate mock is available', () => {
            expect(navigator.vibrate).toBeDefined();
            expect(typeof navigator.vibrate).toBe('function');
        });

        test('navigator.vibrate can be called with pattern', () => {
            const result = navigator.vibrate([100, 50, 100]);
            expect(result).toBe(true);
            expect(vibrateMock).toHaveBeenCalledWith([100, 50, 100]);
        });
    });

    describe('localStorage mock', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        test('localStorage is available', () => {
            expect(localStorage).toBeDefined();
            expect(typeof localStorage.getItem).toBe('function');
            expect(typeof localStorage.setItem).toBe('function');
        });

        test('can store and retrieve values', () => {
            localStorage.setItem('testKey', 'testValue');
            expect(localStorage.getItem('testKey')).toBe('testValue');
        });

        test('returns null for non-existent keys', () => {
            expect(localStorage.getItem('nonExistent')).toBeNull();
        });
    });
});

// Load AudioManager module
const AudioManager = require('../scripts/audio-manager.js');

describe('AudioManager', () => {
    beforeEach(() => {
        // Reset AudioManager state before each test
        AudioManager.reset();
        localStorage.clear();
    });

    /**
     * Feature: audio-alerts, Property 2: Volume clamping
     * For any volume value (including negative numbers and values above 100),
     * the AudioManager SHALL clamp the volume to the range [0, 100].
     * Validates: Requirements 2.1
     */
    describe('Property 2: Volume clamping', () => {
        test('volume is always clamped to 0-100 range for any integer input', () => {
            fc.assert(
                fc.property(fc.integer({ min: -1000, max: 1000 }), (inputVolume) => {
                    AudioManager.setVolume(inputVolume);
                    const result = AudioManager.getVolume();
                    return result >= 0 && result <= 100;
                }),
                { numRuns: 100 }
            );
        });

        test('volume clamping preserves values within valid range', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0, max: 100 }), (inputVolume) => {
                    AudioManager.setVolume(inputVolume);
                    const result = AudioManager.getVolume();
                    return result === inputVolume;
                }),
                { numRuns: 100 }
            );
        });

        test('negative values are clamped to 0', () => {
            fc.assert(
                fc.property(fc.integer({ min: -1000, max: -1 }), (inputVolume) => {
                    AudioManager.setVolume(inputVolume);
                    const result = AudioManager.getVolume();
                    return result === 0;
                }),
                { numRuns: 100 }
            );
        });

        test('values above 100 are clamped to 100', () => {
            fc.assert(
                fc.property(fc.integer({ min: 101, max: 1000 }), (inputVolume) => {
                    AudioManager.setVolume(inputVolume);
                    const result = AudioManager.getVolume();
                    return result === 100;
                }),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Feature: audio-alerts, Property 3: Gain calculation from volume
     * For any volume value V in the range [0, 100], the calculated gain SHALL equal (V / 100) * 0.3
     * - Volume 0 produces gain 0 (no sound)
     * - Volume 100 produces gain 0.3 (maximum)
     * Validates: Requirements 2.2, 2.3
     */
    describe('Property 3: Gain calculation from volume', () => {
        test('gain equals (volume / 100) * 0.3 for any valid volume', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0, max: 100 }), (volume) => {
                    const expectedGain = (volume / 100) * 0.3;
                    const actualGain = AudioManager.calculateGain(volume);
                    // Use approximate equality due to floating point
                    return Math.abs(actualGain - expectedGain) < 0.0001;
                }),
                { numRuns: 100 }
            );
        });

        test('volume 0 produces gain 0 (no sound)', () => {
            const gain = AudioManager.calculateGain(0);
            expect(gain).toBe(0);
        });

        test('volume 100 produces gain 0.3 (maximum)', () => {
            const gain = AudioManager.calculateGain(100);
            expect(gain).toBeCloseTo(0.3, 5);
        });

        test('gain is proportional to volume', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 99 }),
                    fc.integer({ min: 1, max: 100 }),
                    (v1, v2) => {
                        // Ensure v1 < v2 for comparison
                        const lower = Math.min(v1, v2);
                        const higher = Math.max(v1, v2);
                        if (lower === higher) return true; // Skip equal values
                        
                        const gainLower = AudioManager.calculateGain(lower);
                        const gainHigher = AudioManager.calculateGain(higher);
                        return gainLower < gainHigher;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Feature: audio-alerts, Property 4: Mute state toggle
     * For any initial mute state (true or false), calling toggleMute() SHALL result in the opposite mute state.
     * Validates: Requirements 3.1, 3.2
     */
    describe('Property 4: Mute state toggle', () => {
        test('toggleMute always flips the mute state', () => {
            fc.assert(
                fc.property(fc.boolean(), (initialMuted) => {
                    AudioManager.reset();
                    AudioManager.setMuted(initialMuted);
                    const before = AudioManager.getMuted();
                    AudioManager.toggleMute();
                    const after = AudioManager.getMuted();
                    return before !== after;
                }),
                { numRuns: 100 }
            );
        });

        test('double toggle returns to original state', () => {
            fc.assert(
                fc.property(fc.boolean(), (initialMuted) => {
                    AudioManager.reset();
                    AudioManager.setMuted(initialMuted);
                    const original = AudioManager.getMuted();
                    AudioManager.toggleMute();
                    AudioManager.toggleMute();
                    const afterDoubleToggle = AudioManager.getMuted();
                    return original === afterDoubleToggle;
                }),
                { numRuns: 100 }
            );
        });

        test('setMuted sets exact state', () => {
            fc.assert(
                fc.property(fc.boolean(), (targetState) => {
                    AudioManager.reset();
                    AudioManager.setMuted(targetState);
                    return AudioManager.getMuted() === targetState;
                }),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Feature: audio-alerts, Property 5: Mute prevents audio playback
     * For any sound trigger event, if the mute state is true, the AudioManager SHALL not produce
     * any audible output (playTone returns early without creating oscillator).
     * Validates: Requirements 3.3
     */
    describe('Property 5: Mute prevents audio playback', () => {
        let mockOscillator;
        let oscillatorStartCalled;

        beforeEach(() => {
            oscillatorStartCalled = false;
            mockOscillator = {
                connect: jest.fn(),
                frequency: { value: 0 },
                type: 'sine',
                start: jest.fn(() => { oscillatorStartCalled = true; }),
                stop: jest.fn()
            };
            
            // Override the mock to track oscillator creation
            global.AudioContext = class {
                constructor() {
                    this.state = 'running';
                    this.currentTime = 0;
                    this.destination = {};
                }
                createOscillator() {
                    return mockOscillator;
                }
                createGain() {
                    return {
                        connect: jest.fn(),
                        gain: {
                            value: 0,
                            exponentialRampToValueAtTime: jest.fn()
                        }
                    };
                }
                resume() {
                    this.state = 'running';
                    return Promise.resolve();
                }
            };
        });

        afterEach(() => {
            // Restore original mock
            global.AudioContext = MockAudioContext;
        });

        test('when muted, playTone does not start oscillator', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 100, max: 2000 }),  // frequency
                    fc.double({ min: 0.1, max: 1.0 }),    // duration
                    (frequency, duration) => {
                        AudioManager.reset();
                        AudioManager.initialize();
                        AudioManager.setMuted(true);
                        AudioManager.setVolume(50);
                        
                        oscillatorStartCalled = false;
                        AudioManager.playTone(frequency, duration, 'sine');
                        
                        return !oscillatorStartCalled;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('when not muted and volume > 0, playTone starts oscillator', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 100, max: 2000 }),  // frequency
                    fc.double({ min: 0.1, max: 1.0 }),    // duration
                    fc.integer({ min: 1, max: 100 }),     // volume > 0
                    (frequency, duration, volume) => {
                        AudioManager.reset();
                        AudioManager.initialize();
                        AudioManager.setMuted(false);
                        AudioManager.setVolume(volume);
                        
                        oscillatorStartCalled = false;
                        AudioManager.playTone(frequency, duration, 'sine');
                        
                        return oscillatorStartCalled;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('when volume is 0, playTone does not start oscillator', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 100, max: 2000 }),  // frequency
                    fc.double({ min: 0.1, max: 1.0 }),    // duration
                    (frequency, duration) => {
                        AudioManager.reset();
                        AudioManager.initialize();
                        AudioManager.setMuted(false);
                        AudioManager.setVolume(0);
                        
                        oscillatorStartCalled = false;
                        AudioManager.playTone(frequency, duration, 'sine');
                        
                        return !oscillatorStartCalled;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Feature: audio-alerts, Property 8: State persistence to localStorage
     * For any volume value V and mute state M, after calling setVolume(V) or setMuted(M):
     * - localStorage SHALL contain the key 'audioVolume' with value V.toString()
     * - localStorage SHALL contain the key 'audioMuted' with value M.toString()
     * Validates: Requirements 2.4, 3.4
     */
    describe('Property 8: State persistence to localStorage', () => {
        beforeEach(() => {
            AudioManager.reset();
            localStorage.clear();
        });

        test('setVolume persists clamped volume to localStorage', () => {
            fc.assert(
                fc.property(fc.integer({ min: -1000, max: 1000 }), (inputVolume) => {
                    localStorage.clear();
                    AudioManager.reset();
                    AudioManager.setVolume(inputVolume);
                    
                    const storedValue = localStorage.getItem(AudioManager.STORAGE_KEYS.VOLUME);
                    const expectedVolume = Math.max(0, Math.min(100, inputVolume));
                    
                    return storedValue === expectedVolume.toString();
                }),
                { numRuns: 100 }
            );
        });

        test('setMuted persists mute state to localStorage', () => {
            fc.assert(
                fc.property(fc.boolean(), (muteState) => {
                    localStorage.clear();
                    AudioManager.reset();
                    AudioManager.setMuted(muteState);
                    
                    const storedValue = localStorage.getItem(AudioManager.STORAGE_KEYS.MUTED);
                    
                    return storedValue === muteState.toString();
                }),
                { numRuns: 100 }
            );
        });

        test('toggleMute persists new mute state to localStorage', () => {
            fc.assert(
                fc.property(fc.boolean(), (initialMuted) => {
                    localStorage.clear();
                    AudioManager.reset();
                    AudioManager.setMuted(initialMuted);
                    AudioManager.toggleMute();
                    
                    const storedValue = localStorage.getItem(AudioManager.STORAGE_KEYS.MUTED);
                    const expectedMuted = !initialMuted;
                    
                    return storedValue === expectedMuted.toString();
                }),
                { numRuns: 100 }
            );
        });

        test('loadPreferences restores volume from localStorage', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0, max: 100 }), (savedVolume) => {
                    localStorage.clear();
                    localStorage.setItem(AudioManager.STORAGE_KEYS.VOLUME, savedVolume.toString());
                    
                    AudioManager.reset();
                    AudioManager.loadPreferences();
                    
                    return AudioManager.getVolume() === savedVolume;
                }),
                { numRuns: 100 }
            );
        });

        test('loadPreferences restores mute state from localStorage', () => {
            fc.assert(
                fc.property(fc.boolean(), (savedMuted) => {
                    localStorage.clear();
                    localStorage.setItem(AudioManager.STORAGE_KEYS.MUTED, savedMuted.toString());
                    
                    AudioManager.reset();
                    AudioManager.loadPreferences();
                    
                    return AudioManager.getMuted() === savedMuted;
                }),
                { numRuns: 100 }
            );
        });

        test('round-trip: save then load preserves both volume and mute state', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    fc.boolean(),
                    (volume, muted) => {
                        localStorage.clear();
                        AudioManager.reset();
                        
                        // Save state
                        AudioManager.setVolume(volume);
                        AudioManager.setMuted(muted);
                        
                        // Reset in-memory state
                        AudioManager.reset();
                        
                        // Load from localStorage
                        AudioManager.loadPreferences();
                        
                        return AudioManager.getVolume() === volume && 
                               AudioManager.getMuted() === muted;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});


// Load VibrationManager module
const VibrationManager = require('../scripts/vibration-manager.js');

describe('VibrationManager', () => {
    let vibrateMockFn;

    beforeEach(() => {
        // Reset vibrate mock before each test
        vibrateMockFn = jest.fn().mockReturnValue(true);
        Object.defineProperty(global.navigator, 'vibrate', {
            value: vibrateMockFn,
            writable: true,
            configurable: true
        });
    });

    describe('Basic functionality', () => {
        test('isSupported returns true when vibrate is available', () => {
            expect(VibrationManager.isSupported()).toBe(true);
        });

        test('PATTERNS are defined correctly', () => {
            expect(VibrationManager.PATTERNS.WARNING).toEqual([100]);
            expect(VibrationManager.PATTERNS.SECTION_END).toEqual([100, 50, 100]);
            expect(VibrationManager.PATTERNS.OVERTIME).toEqual([200, 100, 200, 100, 200]);
        });

        test('vibrateWarning calls navigator.vibrate with WARNING pattern', () => {
            VibrationManager.vibrateWarning();
            expect(vibrateMockFn).toHaveBeenCalledWith([100]);
        });

        test('vibrateSectionEnd calls navigator.vibrate with SECTION_END pattern', () => {
            VibrationManager.vibrateSectionEnd();
            expect(vibrateMockFn).toHaveBeenCalledWith([100, 50, 100]);
        });

        test('vibrateOvertime calls navigator.vibrate with OVERTIME pattern', () => {
            VibrationManager.vibrateOvertime();
            expect(vibrateMockFn).toHaveBeenCalledWith([200, 100, 200, 100, 200]);
        });

        test('cancel calls navigator.vibrate with 0', () => {
            VibrationManager.cancel();
            expect(vibrateMockFn).toHaveBeenCalledWith(0);
        });
    });

    /**
     * Feature: audio-alerts, Property 6: Vibration trigger based on remaining time
     * For any remaining time value in milliseconds:
     * - If remaining time crosses from above 10000ms to at or below 10000ms, the warning vibration pattern [100] SHALL be triggered
     * - If a section completes, the section end vibration pattern [100, 50, 100] SHALL be triggered
     * - If overtime, the overtime vibration pattern [200, 100, 200, 100, 200] SHALL be triggered
     * Validates: Requirements 4.1, 4.2, 4.3
     */
    describe('Property 6: Vibration trigger based on remaining time', () => {
        test('warning vibration pattern is [100] for any trigger', () => {
            fc.assert(
                fc.property(fc.integer({ min: 1, max: 1000 }), (numCalls) => {
                    vibrateMockFn.mockClear();
                    
                    // Trigger warning vibration
                    const result = VibrationManager.vibrateWarning();
                    
                    // Verify correct pattern was used
                    expect(vibrateMockFn).toHaveBeenCalledWith([100]);
                    return result === true;
                }),
                { numRuns: 100 }
            );
        });

        test('section end vibration pattern is [100, 50, 100] for any trigger', () => {
            fc.assert(
                fc.property(fc.integer({ min: 1, max: 1000 }), (numCalls) => {
                    vibrateMockFn.mockClear();
                    
                    // Trigger section end vibration
                    const result = VibrationManager.vibrateSectionEnd();
                    
                    // Verify correct pattern was used
                    expect(vibrateMockFn).toHaveBeenCalledWith([100, 50, 100]);
                    return result === true;
                }),
                { numRuns: 100 }
            );
        });

        test('overtime vibration pattern is [200, 100, 200, 100, 200] for any trigger', () => {
            fc.assert(
                fc.property(fc.integer({ min: 1, max: 1000 }), (numCalls) => {
                    vibrateMockFn.mockClear();
                    
                    // Trigger overtime vibration
                    const result = VibrationManager.vibrateOvertime();
                    
                    // Verify correct pattern was used
                    expect(vibrateMockFn).toHaveBeenCalledWith([200, 100, 200, 100, 200]);
                    return result === true;
                }),
                { numRuns: 100 }
            );
        });

        test('vibrate accepts any valid pattern array', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 10 }),
                    (pattern) => {
                        vibrateMockFn.mockClear();
                        
                        const result = VibrationManager.vibrate(pattern);
                        
                        expect(vibrateMockFn).toHaveBeenCalledWith(pattern);
                        return result === true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Feature: audio-alerts, Property 7: Vibration independent of mute state
     * For any mute state (true or false), the VibrationManager SHALL trigger vibrations
     * regardless of the audio mute state.
     * Validates: Requirements 4.6
     */
    describe('Property 7: Vibration independent of mute state', () => {
        test('vibration triggers regardless of AudioManager mute state', () => {
            fc.assert(
                fc.property(fc.boolean(), (muteState) => {
                    // Set AudioManager mute state
                    AudioManager.reset();
                    AudioManager.setMuted(muteState);
                    
                    vibrateMockFn.mockClear();
                    
                    // Vibration should work regardless of mute state
                    const warningResult = VibrationManager.vibrateWarning();
                    const sectionEndResult = VibrationManager.vibrateSectionEnd();
                    const overtimeResult = VibrationManager.vibrateOvertime();
                    
                    // All vibrations should succeed
                    return warningResult === true && 
                           sectionEndResult === true && 
                           overtimeResult === true;
                }),
                { numRuns: 100 }
            );
        });

        test('vibration patterns are called correctly regardless of mute state', () => {
            fc.assert(
                fc.property(fc.boolean(), (muteState) => {
                    // Set AudioManager mute state
                    AudioManager.reset();
                    AudioManager.setMuted(muteState);
                    
                    vibrateMockFn.mockClear();
                    
                    // Trigger all vibration types
                    VibrationManager.vibrateWarning();
                    VibrationManager.vibrateSectionEnd();
                    VibrationManager.vibrateOvertime();
                    
                    // Verify all patterns were called
                    const calls = vibrateMockFn.mock.calls;
                    return calls.length === 3 &&
                           JSON.stringify(calls[0][0]) === JSON.stringify([100]) &&
                           JSON.stringify(calls[1][0]) === JSON.stringify([100, 50, 100]) &&
                           JSON.stringify(calls[2][0]) === JSON.stringify([200, 100, 200, 100, 200]);
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('Graceful fallback when not supported', () => {
        beforeEach(() => {
            // Remove vibrate from navigator to simulate unsupported device
            delete global.navigator.vibrate;
        });

        afterEach(() => {
            // Restore vibrate mock
            Object.defineProperty(global.navigator, 'vibrate', {
                value: vibrateMockFn,
                writable: true,
                configurable: true
            });
        });

        test('isSupported returns false when vibrate is not available', () => {
            expect(VibrationManager.isSupported()).toBe(false);
        });

        test('vibrate returns false when not supported', () => {
            expect(VibrationManager.vibrate([100])).toBe(false);
        });

        test('vibrateWarning returns false when not supported', () => {
            expect(VibrationManager.vibrateWarning()).toBe(false);
        });

        test('vibrateSectionEnd returns false when not supported', () => {
            expect(VibrationManager.vibrateSectionEnd()).toBe(false);
        });

        test('vibrateOvertime returns false when not supported', () => {
            expect(VibrationManager.vibrateOvertime()).toBe(false);
        });

        test('cancel returns false when not supported', () => {
            expect(VibrationManager.cancel()).toBe(false);
        });
    });
});


// Load AlertTrigger module
const AlertTrigger = require('../scripts/alert-trigger.js');

// Make AudioManager and VibrationManager available globally for AlertTrigger
global.AudioManager = AudioManager;
global.VibrationManager = VibrationManager;

describe('AlertTrigger', () => {
    let playWarningSpy;
    let playSectionEndSpy;
    let playOvertimeSpy;
    let vibrateWarningSpy;
    let vibrateSectionEndSpy;
    let vibrateOvertimeSpy;

    beforeEach(() => {
        // Reset AlertTrigger state before each test
        AlertTrigger.reset();
        AudioManager.reset();
        
        // Set up spies on AudioManager and VibrationManager
        playWarningSpy = jest.spyOn(AudioManager, 'playWarning').mockImplementation(() => {});
        playSectionEndSpy = jest.spyOn(AudioManager, 'playSectionEnd').mockImplementation(() => {});
        playOvertimeSpy = jest.spyOn(AudioManager, 'playOvertime').mockImplementation(() => {});
        vibrateWarningSpy = jest.spyOn(VibrationManager, 'vibrateWarning').mockImplementation(() => true);
        vibrateSectionEndSpy = jest.spyOn(VibrationManager, 'vibrateSectionEnd').mockImplementation(() => true);
        vibrateOvertimeSpy = jest.spyOn(VibrationManager, 'vibrateOvertime').mockImplementation(() => true);
    });

    afterEach(() => {
        // Restore all spies
        jest.restoreAllMocks();
    });

    describe('Basic functionality', () => {
        test('THRESHOLDS are defined correctly', () => {
            expect(AlertTrigger.THRESHOLDS.WARNING).toBe(10000);
            expect(AlertTrigger.THRESHOLDS.OVERTIME_REPEAT).toBe(30000);
        });

        test('reset clears all state', () => {
            // Set some state
            AlertTrigger.checkAlerts(5000, 1, false);
            
            // Reset
            AlertTrigger.reset();
            
            const state = AlertTrigger.getState();
            expect(state.lastWarningTriggered).toBe(false);
            expect(state.lastSectionIndex).toBe(-1);
            expect(state.lastOvertimeAlert).toBe(0);
        });

        test('checkAlerts returns triggered status object', () => {
            const result = AlertTrigger.checkAlerts(5000, 0, false);
            expect(result).toHaveProperty('warning');
            expect(result).toHaveProperty('sectionEnd');
            expect(result).toHaveProperty('overtime');
        });
    });

    /**
     * Feature: audio-alerts, Property 1: Sound trigger based on remaining time
     * For any remaining time value in milliseconds and section transition state:
     * - If remaining time crosses from above 10000ms to at or below 10000ms, the warning sound SHALL be triggered exactly once
     * - If a section transition occurs, the section end sound SHALL be triggered exactly once
     * Validates: Requirements 1.1, 1.2
     */
    describe('Property 1: Sound trigger based on remaining time', () => {
        test('warning triggers exactly once when remaining time crosses 10s threshold', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10000 }),  // remainingMs at or below threshold
                    fc.integer({ min: 0, max: 10 }),     // sectionIndex
                    (remainingMs, sectionIndex) => {
                        AlertTrigger.reset();
                        playWarningSpy.mockClear();
                        vibrateWarningSpy.mockClear();
                        
                        // First call - should trigger warning
                        const result1 = AlertTrigger.checkAlerts(remainingMs, sectionIndex, false);
                        
                        // Second call with same remaining time - should NOT trigger again
                        const result2 = AlertTrigger.checkAlerts(remainingMs, sectionIndex, false);
                        
                        // Warning should be triggered exactly once
                        return result1.warning === true && 
                               result2.warning === false &&
                               playWarningSpy.mock.calls.length === 1;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('warning does not trigger when remaining time is above 10s threshold', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 10001, max: 100000 }),  // remainingMs above threshold
                    fc.integer({ min: 0, max: 10 }),          // sectionIndex
                    (remainingMs, sectionIndex) => {
                        AlertTrigger.reset();
                        playWarningSpy.mockClear();
                        
                        const result = AlertTrigger.checkAlerts(remainingMs, sectionIndex, false);
                        
                        // Warning should NOT be triggered
                        return result.warning === false && 
                               playWarningSpy.mock.calls.length === 0;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('section end triggers exactly once when section changes', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100000 }),  // remainingMs
                    fc.integer({ min: 0, max: 9 }),       // initialSection
                    fc.integer({ min: 1, max: 10 }),      // sectionDelta (to ensure different section)
                    (remainingMs, initialSection, sectionDelta) => {
                        AlertTrigger.reset();
                        playSectionEndSpy.mockClear();
                        vibrateSectionEndSpy.mockClear();
                        
                        // First call to establish initial section
                        AlertTrigger.checkAlerts(remainingMs, initialSection, false);
                        playSectionEndSpy.mockClear();
                        
                        // Calculate new section (ensure it's different)
                        const newSection = (initialSection + sectionDelta) % 20;
                        
                        // Second call with different section - should trigger section end
                        const result = AlertTrigger.checkAlerts(remainingMs, newSection, false);
                        
                        // Section end should be triggered exactly once
                        return result.sectionEnd === true && 
                               playSectionEndSpy.mock.calls.length === 1;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('section end does not trigger when section stays the same', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100000 }),  // remainingMs
                    fc.integer({ min: 0, max: 10 }),      // sectionIndex
                    (remainingMs, sectionIndex) => {
                        AlertTrigger.reset();
                        playSectionEndSpy.mockClear();
                        
                        // First call to establish section
                        AlertTrigger.checkAlerts(remainingMs, sectionIndex, false);
                        playSectionEndSpy.mockClear();
                        
                        // Second call with same section - should NOT trigger section end
                        const result = AlertTrigger.checkAlerts(remainingMs, sectionIndex, false);
                        
                        // Section end should NOT be triggered
                        return result.sectionEnd === false && 
                               playSectionEndSpy.mock.calls.length === 0;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('warning resets after section change', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10000 }),   // remainingMs at or below threshold
                    fc.integer({ min: 0, max: 9 }),       // initialSection
                    (remainingMs, initialSection) => {
                        AlertTrigger.reset();
                        playWarningSpy.mockClear();
                        
                        // Trigger warning in first section
                        AlertTrigger.checkAlerts(remainingMs, initialSection, false);
                        
                        // Change section
                        const newSection = initialSection + 1;
                        AlertTrigger.checkAlerts(remainingMs + 20000, newSection, false);
                        playWarningSpy.mockClear();
                        
                        // Warning should trigger again in new section
                        const result = AlertTrigger.checkAlerts(remainingMs, newSection, false);
                        
                        return result.warning === true && 
                               playWarningSpy.mock.calls.length === 1;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('warning resets when time goes back above threshold', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10000 }),      // remainingMs at or below threshold
                    fc.integer({ min: 10001, max: 50000 }), // remainingMs above threshold
                    fc.integer({ min: 0, max: 10 }),         // sectionIndex
                    (belowThreshold, aboveThreshold, sectionIndex) => {
                        AlertTrigger.reset();
                        playWarningSpy.mockClear();
                        
                        // Trigger warning
                        AlertTrigger.checkAlerts(belowThreshold, sectionIndex, false);
                        expect(playWarningSpy).toHaveBeenCalledTimes(1);
                        
                        // Go back above threshold (simulating time adjustment)
                        AlertTrigger.checkAlerts(aboveThreshold, sectionIndex, false);
                        playWarningSpy.mockClear();
                        
                        // Warning should trigger again when crossing threshold
                        const result = AlertTrigger.checkAlerts(belowThreshold, sectionIndex, false);
                        
                        return result.warning === true && 
                               playWarningSpy.mock.calls.length === 1;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Overtime alerts', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('overtime alert triggers immediately when entering overtime', () => {
            AlertTrigger.reset();
            playOvertimeSpy.mockClear();
            
            const result = AlertTrigger.checkAlerts(-1000, 0, true);
            
            expect(result.overtime).toBe(true);
            expect(playOvertimeSpy).toHaveBeenCalledTimes(1);
        });

        test('overtime alert does not trigger when not overtime', () => {
            AlertTrigger.reset();
            playOvertimeSpy.mockClear();
            
            const result = AlertTrigger.checkAlerts(5000, 0, false);
            
            expect(result.overtime).toBe(false);
            expect(playOvertimeSpy).not.toHaveBeenCalled();
        });

        test('overtime alert repeats after 30 seconds', () => {
            AlertTrigger.reset();
            playOvertimeSpy.mockClear();
            
            // First overtime alert
            AlertTrigger.checkAlerts(-1000, 0, true);
            expect(playOvertimeSpy).toHaveBeenCalledTimes(1);
            
            // Advance time by 30 seconds
            jest.advanceTimersByTime(30000);
            
            // Second overtime alert should trigger
            const result = AlertTrigger.checkAlerts(-31000, 0, true);
            
            expect(result.overtime).toBe(true);
            expect(playOvertimeSpy).toHaveBeenCalledTimes(2);
        });

        test('overtime alert does not repeat before 30 seconds', () => {
            AlertTrigger.reset();
            playOvertimeSpy.mockClear();
            
            // First overtime alert
            AlertTrigger.checkAlerts(-1000, 0, true);
            expect(playOvertimeSpy).toHaveBeenCalledTimes(1);
            
            // Advance time by less than 30 seconds
            jest.advanceTimersByTime(29000);
            
            // Should not trigger again
            const result = AlertTrigger.checkAlerts(-30000, 0, true);
            
            expect(result.overtime).toBe(false);
            expect(playOvertimeSpy).toHaveBeenCalledTimes(1);
        });

        test('overtime timer resets when exiting overtime', () => {
            AlertTrigger.reset();
            playOvertimeSpy.mockClear();
            
            // Enter overtime
            AlertTrigger.checkAlerts(-1000, 0, true);
            expect(playOvertimeSpy).toHaveBeenCalledTimes(1);
            
            // Exit overtime
            AlertTrigger.checkAlerts(5000, 0, false);
            
            // Re-enter overtime - should trigger immediately
            playOvertimeSpy.mockClear();
            const result = AlertTrigger.checkAlerts(-1000, 0, true);
            
            expect(result.overtime).toBe(true);
            expect(playOvertimeSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('State management', () => {
        test('getState returns current state', () => {
            AlertTrigger.reset();
            AlertTrigger.checkAlerts(5000, 2, false);
            
            const state = AlertTrigger.getState();
            
            expect(state.lastWarningTriggered).toBe(true);
            expect(state.lastSectionIndex).toBe(2);
        });

        test('setState allows setting state for testing', () => {
            AlertTrigger.reset();
            
            AlertTrigger.setState({
                lastWarningTriggered: true,
                lastSectionIndex: 5,
                lastOvertimeAlert: 12345
            });
            
            const state = AlertTrigger.getState();
            
            expect(state.lastWarningTriggered).toBe(true);
            expect(state.lastSectionIndex).toBe(5);
            expect(state.lastOvertimeAlert).toBe(12345);
        });

        test('wasWarningTriggered returns correct state', () => {
            AlertTrigger.reset();
            expect(AlertTrigger.wasWarningTriggered()).toBe(false);
            
            AlertTrigger.checkAlerts(5000, 0, false);
            expect(AlertTrigger.wasWarningTriggered()).toBe(true);
        });

        test('getLastSectionIndex returns correct value', () => {
            AlertTrigger.reset();
            expect(AlertTrigger.getLastSectionIndex()).toBe(-1);
            
            AlertTrigger.checkAlerts(5000, 3, false);
            expect(AlertTrigger.getLastSectionIndex()).toBe(3);
        });
    });
});
