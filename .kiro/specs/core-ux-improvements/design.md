# Design Document: Core UX Improvements

## Overview

This design covers Phase 1 Core UX Improvements for Time My Talk, adding fullscreen presentation mode, keyboard shortcuts, visual time warnings (traffic light system), progress visualization, and improved onboarding. The implementation follows the project's vanilla JavaScript approach with no additional dependencies.

## Architecture

The existing architecture uses jQuery for DOM manipulation and a simple module pattern. New features will integrate with the existing `agenda-defender.js` structure while adding new modules for separation of concerns:

```
scripts/
├── agenda-defender.js    # Existing: Core timer logic, ThemeManager
├── keyboard-shortcuts.js # NEW: Keyboard event handling
├── fullscreen.js         # NEW: Fullscreen API wrapper
├── time-warnings.js      # NEW: Traffic light color logic
└── progress-bar.js       # NEW: Overall progress visualization
```

### Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Textarea   │  │   Controls   │  │  Ticker (Timer)  │  │
│  │   (Editor)   │  │   (Buttons)  │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    JavaScript Modules                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              agenda-defender.js (existing)              │ │
│  │  - AgendaItem, Agenda.parse(), makeTicker()            │ │
│  │  - runMeeting(), stopMeeting(), ThemeManager           │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ keyboard-   │ │ fullscreen  │ │ time-       │           │
│  │ shortcuts.js│ │ .js         │ │ warnings.js │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐                                            │
│  │ progress-   │                                            │
│  │ bar.js      │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. KeyboardShortcuts Module

Handles all keyboard input during presentation mode.

```javascript
const KeyboardShortcuts = {
    enabled: true,
    
    // Initialize keyboard listener
    initialize() {
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    },
    
    // Main keydown handler
    handleKeydown(event) {
        // Skip if typing in input/textarea
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Skip if shortcuts disabled
        if (!this.enabled) return;
        
        const actions = {
            'Space': () => this.togglePlayPause(),
            'KeyR': () => this.resetTimer(),
            'KeyN': () => this.nextSection(),
            'ArrowRight': () => this.nextSection(),
            'KeyP': () => this.prevSection(),
            'ArrowLeft': () => this.prevSection(),
            'KeyF': () => FullscreenManager.toggle(),
            'KeyM': () => this.toggleMute(),
            'Escape': () => this.handleEscape(),
        };
        
        if (actions[event.code]) {
            event.preventDefault();
            actions[event.code]();
        }
        
        // Number keys 1-9 for section jump
        if (event.code.startsWith('Digit') && !event.shiftKey) {
            const num = parseInt(event.code.slice(5));
            if (num > 0) {
                event.preventDefault();
                this.jumpToSection(num - 1);
            }
        }
    },
    
    togglePlayPause() { /* Toggle timer running state */ },
    resetTimer() { /* Reset to beginning */ },
    nextSection() { /* Skip to next section */ },
    prevSection() { /* Go to previous section */ },
    toggleMute() { /* Toggle audio mute state */ },
    handleEscape() { /* Exit fullscreen or close modals */ },
    jumpToSection(index) { /* Jump to specific section */ }
};
```

### 2. FullscreenManager Module

Wraps the Fullscreen API with cross-browser support.

```javascript
const FullscreenManager = {
    isFullscreen: false,
    
    // Enter fullscreen mode
    enter() {
        const el = document.documentElement;
        const requestMethod = el.requestFullscreen || 
                             el.webkitRequestFullscreen || 
                             el.msRequestFullscreen;
        
        if (requestMethod) {
            requestMethod.call(el);
            document.body.classList.add('fullscreen-mode');
            this.isFullscreen = true;
        }
    },
    
    // Exit fullscreen mode
    exit() {
        const exitMethod = document.exitFullscreen || 
                          document.webkitExitFullscreen || 
                          document.msExitFullscreen;
        
        if (exitMethod && this.isFullscreen) {
            exitMethod.call(document);
            document.body.classList.remove('fullscreen-mode');
            this.isFullscreen = false;
        }
    },
    
    // Toggle fullscreen state
    toggle() {
        this.isFullscreen ? this.exit() : this.enter();
    },
    
    // Initialize fullscreen change listeners
    initialize() {
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            document.body.classList.toggle('fullscreen-mode', this.isFullscreen);
        });
    }
};
```

### 3. TimeWarnings Module

Calculates and applies traffic light colors based on remaining time.

```javascript
const TimeWarnings = {
    COLORS: {
        GREEN: '#22c55e',
        YELLOW: '#eab308',
        RED: '#ef4444'
    },
    
    THRESHOLDS: {
        YELLOW: 30000,  // 30 seconds in ms
        RED: 10000      // 10 seconds in ms
    },
    
    // Get warning class based on remaining time
    getWarningClass(remainingMs) {
        if (remainingMs <= 0) return 'warning-overtime';
        if (remainingMs <= this.THRESHOLDS.RED) return 'warning-red';
        if (remainingMs <= this.THRESHOLDS.YELLOW) return 'warning-yellow';
        return 'warning-green';
    },
    
    // Apply warning state to timer element
    applyWarning(element, remainingMs) {
        // Remove all warning classes
        element.classList.remove(
            'warning-green', 
            'warning-yellow', 
            'warning-red', 
            'warning-overtime'
        );
        
        // Add appropriate class
        const warningClass = this.getWarningClass(remainingMs);
        element.classList.add(warningClass);
    }
};
```

### 4. ProgressBar Module

Renders and updates the overall progress visualization.

```javascript
const ProgressBar = {
    container: null,
    
    // Initialize progress bar container
    initialize() {
        this.container = document.createElement('div');
        this.container.id = 'overall-progress';
        this.container.className = 'overall-progress-bar';
    },
    
    // Generate progress bar HTML from sections
    render(sections, currentIndex, elapsedTime) {
        const totalDuration = sections.reduce(
            (sum, s) => sum + (s.concludesAt - s.commencesAt), 0
        );
        
        const segments = sections.map((section, i) => {
            const duration = section.concludesAt - section.commencesAt;
            const widthPercent = (duration / totalDuration) * 100;
            const status = i < currentIndex ? 'complete' 
                         : i === currentIndex ? 'current' 
                         : 'upcoming';
            
            return `<div class="progress-segment" 
                         data-status="${status}" 
                         style="width: ${widthPercent}%"
                         title="${section.text}"></div>`;
        }).join('');
        
        this.container.innerHTML = segments;
        return this.container;
    },
    
    // Update current section highlight
    update(currentIndex) {
        const segments = this.container.querySelectorAll('.progress-segment');
        segments.forEach((seg, i) => {
            const status = i < currentIndex ? 'complete' 
                         : i === currentIndex ? 'current' 
                         : 'upcoming';
            seg.setAttribute('data-status', status);
        });
    }
};
```

## Data Models

### Timer State (Extended)

The existing timer state will be extended to support new features:

```javascript
const timerState = {
    // Existing state
    isRunning: false,
    agenda: [],
    currentSectionIndex: 0,
    
    // New state for pause/resume (future Phase 3)
    isPaused: false,
    pausedAt: null,
    pausedDuration: 0,
    
    // New state for audio (future Phase 2)
    isMuted: false,
    audioEnabled: true
};
```

### Warning State

```javascript
const warningState = {
    currentClass: 'warning-green',
    lastUpdate: 0
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Fullscreen Toggle

*For any* initial fullscreen state (active or inactive), pressing the 'F' key SHALL result in the opposite fullscreen state.

**Validates: Requirements 1.7, 2.5**

### Property 2: Escape Exits Fullscreen

*For any* active fullscreen state, pressing the Escape key SHALL result in fullscreen being deactivated.

**Validates: Requirements 1.5, 2.9**

### Property 3: Click Exits Fullscreen

*For any* active fullscreen state, clicking anywhere on the document SHALL result in fullscreen being deactivated.

**Validates: Requirements 1.6**

### Property 4: Space Toggles Play/Pause

*For any* timer running state (running or stopped), pressing the SPACE key SHALL result in the opposite running state.

**Validates: Requirements 2.1**

### Property 5: Reset Returns to Beginning

*For any* timer state with any current section index, pressing the 'R' key SHALL result in the timer being reset to section index 0.

**Validates: Requirements 2.2**

### Property 6: Next Section Navigation

*For any* timer state where current section index < total sections - 1, pressing 'N' or Right Arrow SHALL increment the current section index by 1.

**Validates: Requirements 2.3**

### Property 7: Previous Section Navigation

*For any* timer state where current section index > 0, pressing 'P' or Left Arrow SHALL decrement the current section index by 1.

**Validates: Requirements 2.4**

### Property 8: Mute Toggle

*For any* mute state (muted or unmuted), pressing the 'M' key SHALL result in the opposite mute state.

**Validates: Requirements 2.6**

### Property 9: Number Key Section Jump

*For any* agenda with N sections and any number key K pressed (1-9) where K <= N, the current section index SHALL become K-1.

**Validates: Requirements 2.7**

### Property 10: Shortcuts Ignored in Input Fields

*For any* keyboard event where the event target is an INPUT or TEXTAREA element, the Keyboard_Handler SHALL not execute any shortcut actions.

**Validates: Requirements 2.8**

### Property 11: Warning Class Based on Remaining Time

*For any* remaining time value in milliseconds:
- If remainingMs > 30000, the warning class SHALL be 'warning-green'
- If 10000 < remainingMs <= 30000, the warning class SHALL be 'warning-yellow'
- If 0 < remainingMs <= 10000, the warning class SHALL be 'warning-red'
- If remainingMs <= 0, the warning class SHALL be 'warning-overtime'

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 12: Progress Segment Status Based on Index

*For any* set of sections and any current section index, each progress segment's data-status attribute SHALL be:
- 'complete' if segment index < current index
- 'current' if segment index === current index
- 'upcoming' if segment index > current index

**Validates: Requirements 4.3, 4.4, 4.5, 4.6**

### Property 13: Progress Segment Widths Proportional to Duration

*For any* set of sections with durations, each progress segment's width percentage SHALL equal (section duration / total duration) * 100, and all widths SHALL sum to 100%.

**Validates: Requirements 4.2**

## Error Handling

### Fullscreen API Errors

- If Fullscreen API is not supported, the fullscreen button should be hidden
- If fullscreen request is denied (e.g., user gesture required), fail silently and log to console

```javascript
const FullscreenManager = {
    isSupported() {
        return !!(document.documentElement.requestFullscreen || 
                  document.documentElement.webkitRequestFullscreen);
    },
    
    enter() {
        try {
            const el = document.documentElement;
            const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen;
            if (requestMethod) {
                requestMethod.call(el).catch(err => {
                    console.warn('Fullscreen request failed:', err);
                });
            }
        } catch (err) {
            console.warn('Fullscreen not supported:', err);
        }
    }
};
```

### Keyboard Event Edge Cases

- Ignore keyboard events when modifier keys (Ctrl, Alt, Meta) are pressed to avoid conflicts with browser shortcuts
- Ignore events during IME composition (for international keyboard input)

```javascript
handleKeydown(event) {
    // Skip if modifier keys are pressed
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    
    // Skip during IME composition
    if (event.isComposing) return;
    
    // ... rest of handler
}
```

### Section Navigation Bounds

- Next section at last section: no-op (stay at current section)
- Previous section at first section: no-op (stay at current section)
- Number key for non-existent section: no-op

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Fullscreen Module**
   - Test `isSupported()` returns boolean
   - Test `toggle()` calls appropriate API methods
   - Test class toggling on body element

2. **Keyboard Shortcuts Module**
   - Test each shortcut key triggers correct action
   - Test shortcuts are ignored in input fields
   - Test modifier key combinations are ignored

3. **Time Warnings Module**
   - Test boundary values (exactly 30s, exactly 10s, exactly 0s)
   - Test negative values (overtime)

4. **Progress Bar Module**
   - Test with single section
   - Test with multiple sections of equal duration
   - Test with sections of varying durations

### Property-Based Tests

Property-based tests will use fast-check to verify universal properties across many generated inputs.

**Testing Framework**: Jest with fast-check

**Configuration**: Minimum 100 iterations per property test

**Test File Location**: `tests/core-ux-improvements.test.js`

Each property test will be tagged with:
- **Feature: core-ux-improvements, Property {number}: {property_text}**

Example property test structure:

```javascript
const fc = require('fast-check');

describe('TimeWarnings', () => {
    // Feature: core-ux-improvements, Property 11: Warning class based on remaining time
    test('warning class is determined by remaining time thresholds', () => {
        fc.assert(
            fc.property(fc.integer(), (remainingMs) => {
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
```

