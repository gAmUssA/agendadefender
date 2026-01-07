/**
 * AudioManager Module
 * 
 * Handles all audio generation using the Web Audio API.
 * Provides sound notifications for timer events without external audio files.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 5.1, 5.3, 5.4
 * @see .kiro/specs/audio-alerts/design.md
 */

const AudioManager = (function() {
    'use strict';

    // Audio context (lazy initialized after user interaction)
    let audioContext = null;

    // State
    let volume = 50;        // 0-100
    let isMuted = true;     // Muted by default (Requirements: 3.1)

    // Sound configurations (Requirements: 1.1, 1.2, 1.3, 1.6)
    const SOUNDS = {
        WARNING: { frequency: 880, duration: 0.15, type: 'sine' },      // A5 - soft chime (10s warning)
        SECTION_END: { frequency: 1047, duration: 0.3, type: 'sine' },  // C6 - distinct tone
        OVERTIME: { frequency: 1200, duration: 0.1, type: 'sine' }      // Urgent beep
    };

    // Thresholds (in milliseconds)
    const THRESHOLDS = {
        WARNING: 10000,           // 10 seconds
        OVERTIME_REPEAT: 30000    // 30 seconds
    };

    // localStorage keys
    const STORAGE_KEYS = {
        VOLUME: 'audioVolume',
        MUTED: 'audioMuted'
    };

    /**
     * Initialize AudioContext (must be called after user interaction)
     * Requirements: 5.1, 5.2, 5.4
     */
    function initialize() {
        if (audioContext) return;

        // Handle both standard and webkit-prefixed AudioContext (Requirements: 5.4)
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioContext = new AudioContextClass();
        }

        // Load saved preferences
        loadPreferences();
    }

    /**
     * Resume AudioContext if suspended
     * Requirements: 5.3
     * @returns {Promise<void>}
     */
    async function ensureResumed() {
        if (audioContext && audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
            } catch (e) {
                console.warn('Could not resume AudioContext:', e);
            }
        }
    }

    /**
     * Calculate gain from volume
     * Volume 0-100 maps to gain 0-0.3
     * Requirements: 2.2, 2.3
     * @param {number} vol - Volume value (0-100)
     * @returns {number} Gain value (0-0.3)
     */
    function calculateGain(vol) {
        return (vol / 100) * 0.3;
    }

    /**
     * Play a tone with specified parameters
     * Requirements: 1.5, 1.6
     * @param {number} frequency - Frequency in Hz
     * @param {number} duration - Duration in seconds
     * @param {string} [type='sine'] - Oscillator type
     */
    function playTone(frequency, duration, type = 'sine') {
        // Don't play if muted or volume is 0 (Requirements: 3.3)
        if (!audioContext || isMuted || volume === 0) return;

        ensureResumed();

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        // Calculate gain from volume (Requirements: 2.2, 2.3)
        const gain = calculateGain(volume);
        gainNode.gain.value = gain;

        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + duration
        );
        oscillator.stop(audioContext.currentTime + duration);
    }

    /**
     * Play warning sound (10 seconds remaining)
     * Requirements: 1.1
     */
    function playWarning() {
        const sound = SOUNDS.WARNING;
        playTone(sound.frequency, sound.duration, sound.type);
    }

    /**
     * Play section end sound
     * Requirements: 1.2
     */
    function playSectionEnd() {
        const sound = SOUNDS.SECTION_END;
        playTone(sound.frequency, sound.duration, sound.type);
    }

    /**
     * Play overtime sound (double beep)
     * Requirements: 1.3
     */
    function playOvertime() {
        const sound = SOUNDS.OVERTIME;
        playTone(sound.frequency, sound.duration, sound.type);
        setTimeout(() => {
            playTone(sound.frequency, sound.duration, sound.type);
        }, 150);
    }

    /**
     * Set volume (0-100) with clamping
     * Requirements: 2.1
     * @param {number} newVolume - Volume value to set
     */
    function setVolume(newVolume) {
        volume = Math.max(0, Math.min(100, newVolume));
        savePreferences();
    }

    /**
     * Get current volume
     * @returns {number} Current volume (0-100)
     */
    function getVolume() {
        return volume;
    }

    /**
     * Toggle mute state
     * Requirements: 3.1, 3.2
     * @returns {boolean} New mute state
     */
    function toggleMute() {
        isMuted = !isMuted;
        savePreferences();
        updateMuteButton();
        return isMuted;
    }

    /**
     * Set mute state
     * Requirements: 3.2
     * @param {boolean} muted - Mute state to set
     */
    function setMuted(muted) {
        isMuted = muted;
        savePreferences();
        updateMuteButton();
    }

    /**
     * Get mute state
     * @returns {boolean} Current mute state
     */
    function getMuted() {
        return isMuted;
    }

    /**
     * Save preferences to localStorage
     * Requirements: 2.4, 3.4
     */
    function savePreferences() {
        try {
            localStorage.setItem(STORAGE_KEYS.VOLUME, volume.toString());
            localStorage.setItem(STORAGE_KEYS.MUTED, isMuted.toString());
        } catch (e) {
            console.warn('Could not save audio preferences:', e);
        }
    }

    /**
     * Load preferences from localStorage
     * Requirements: 2.5, 3.5
     */
    function loadPreferences() {
        try {
            const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
            const savedMuted = localStorage.getItem(STORAGE_KEYS.MUTED);

            if (savedVolume !== null) {
                volume = parseInt(savedVolume, 10);
                // Ensure loaded volume is valid
                if (isNaN(volume)) {
                    volume = 50;
                }
                volume = Math.max(0, Math.min(100, volume));
            }
            if (savedMuted !== null) {
                isMuted = savedMuted === 'true';
            }

            updateMuteButton();
        } catch (e) {
            console.warn('Could not load audio preferences:', e);
        }
    }

    /**
     * Update mute button visual state
     * Requirements: 3.6
     */
    function updateMuteButton() {
        const button = document.getElementById('mute-toggle');
        if (button) {
            button.classList.toggle('muted', isMuted);
            button.setAttribute('aria-pressed', isMuted.toString());
        }
    }

    /**
     * Check if AudioContext is initialized
     * @returns {boolean} Whether AudioContext exists
     */
    function isInitialized() {
        return audioContext !== null;
    }

    /**
     * Reset state (useful for testing)
     */
    function reset() {
        volume = 50;
        isMuted = true;  // Muted by default
        audioContext = null;
    }

    // Public API
    return {
        initialize: initialize,
        ensureResumed: ensureResumed,
        playTone: playTone,
        playWarning: playWarning,
        playSectionEnd: playSectionEnd,
        playOvertime: playOvertime,
        setVolume: setVolume,
        getVolume: getVolume,
        toggleMute: toggleMute,
        setMuted: setMuted,
        getMuted: getMuted,
        loadPreferences: loadPreferences,
        savePreferences: savePreferences,
        isInitialized: isInitialized,
        calculateGain: calculateGain,
        reset: reset,
        SOUNDS: SOUNDS,
        THRESHOLDS: THRESHOLDS,
        STORAGE_KEYS: STORAGE_KEYS
    };
})();

// Export for Node.js/testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}
