# Implementation Plan: Core UX Improvements

## Overview

This plan implements Phase 1 Core UX Improvements for Time My Talk: fullscreen mode, keyboard shortcuts, visual time warnings (traffic light system), progress visualization, and improved onboarding. Implementation follows an incremental approach, building each module and integrating with the existing codebase.

## Tasks

- [x] 1. Set up testing infrastructure for new modules
  - Install fast-check for property-based testing
  - Create test file `tests/core-ux-improvements.test.js`
  - _Requirements: Testing Strategy_

- [x] 2. Implement TimeWarnings module
  - [x] 2.1 Create `scripts/time-warnings.js` with warning class calculation logic
    - Implement `getWarningClass(remainingMs)` function
    - Implement `applyWarning(element, remainingMs)` function
    - Define color constants and thresholds
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_
  - [x] 2.2 Write property test for warning class thresholds
    - **Property 11: Warning class based on remaining time**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  - [x] 2.3 Add CSS for warning states in `styles/styles.css`
    - Add `.warning-green`, `.warning-yellow`, `.warning-red`, `.warning-overtime` classes
    - Add 300ms color transitions
    - Add pulse animation for overtime
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Integrate TimeWarnings into timer display
  - [x] 3.1 Modify `makeTicker()` in `agenda-defender.js` to apply warning classes
    - Call `TimeWarnings.applyWarning()` on each tick
    - Apply to timer text and progress bar
    - _Requirements: 3.6_

- [x] 4. Implement ProgressBar module
  - [x] 4.1 Create `scripts/progress-bar.js` with progress visualization logic
    - Implement `initialize()` to create container element
    - Implement `render(sections, currentIndex)` to generate segments
    - Implement `update(currentIndex)` to update segment statuses
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 4.2 Write property test for segment status based on index
    - **Property 12: Progress segment status based on index**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6**
  - [x] 4.3 Write property test for segment widths proportional to duration
    - **Property 13: Progress segment widths proportional to duration**
    - **Validates: Requirements 4.2**
  - [x] 4.4 Add CSS for progress bar in `styles/styles.css`
    - Style `.overall-progress-bar` container (8px height, 4px border-radius)
    - Style `.progress-segment` with data-status variants
    - _Requirements: 4.1_

- [x] 5. Integrate ProgressBar into timer display
  - [x] 5.1 Modify `runMeeting()` to initialize and render progress bar
    - Add progress bar to ticker display
    - Update progress bar on each tick
    - _Requirements: 4.6_

- [x] 6. Checkpoint - Ensure timer warnings and progress bar work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement FullscreenManager module
  - [x] 7.1 Create `scripts/fullscreen.js` with fullscreen API wrapper
    - Implement `isSupported()` for feature detection
    - Implement `enter()` with cross-browser support
    - Implement `exit()` with cross-browser support
    - Implement `toggle()` to flip state
    - Implement `initialize()` for event listeners
    - _Requirements: 1.1, 1.5, 1.6, 1.7_
  - [x] 7.2 Write property test for fullscreen toggle
    - **Property 1: Fullscreen toggle**
    - **Validates: Requirements 1.7, 2.5**
  - [x] 7.3 Write property test for escape exits fullscreen
    - **Property 2: Escape exits fullscreen**
    - **Validates: Requirements 1.5, 2.9**
  - [x] 7.4 Add CSS for fullscreen mode in `styles/styles.css`
    - Style `.fullscreen-mode` with scaled timer (min(20vw, 30vh))
    - Hide non-essential UI elements
    - Ensure theme variables are respected
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 8. Add fullscreen toggle button to UI
  - [x] 8.1 Add fullscreen button to `index.html`
    - Add button with expand icon (⛶ or SVG)
    - Position near timer controls
    - _Requirements: 1.1_
  - [x] 8.2 Wire up fullscreen button click handler
    - Call `FullscreenManager.toggle()` on click
    - _Requirements: 1.1_

- [x] 9. Implement KeyboardShortcuts module
  - [x] 9.1 Create `scripts/keyboard-shortcuts.js` with keyboard handling
    - Implement `initialize()` to add keydown listener
    - Implement `handleKeydown(event)` with action mapping
    - Implement action methods (togglePlayPause, resetTimer, etc.)
    - Skip shortcuts when focus is on INPUT/TEXTAREA
    - Skip shortcuts when modifier keys are pressed
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_
  - [x] 9.2 Write property test for shortcuts ignored in input fields
    - **Property 10: Shortcuts ignored in input fields**
    - **Validates: Requirements 2.8**
  - [x] 9.3 Write property test for space toggles play/pause
    - **Property 4: Space toggles play/pause**
    - **Validates: Requirements 2.1**
  - [x] 9.4 Write property test for next/previous section navigation
    - **Property 6: Next section navigation**
    - **Property 7: Previous section navigation**
    - **Validates: Requirements 2.3, 2.4**
  - [x] 9.5 Write property test for number key section jump
    - **Property 9: Number key section jump**
    - **Validates: Requirements 2.7**

- [x] 10. Integrate KeyboardShortcuts with timer
  - [x] 10.1 Initialize KeyboardShortcuts in document ready
    - Add script tag to `index.html`
    - Call `KeyboardShortcuts.initialize()` on DOM ready
    - _Requirements: 2.1-2.9_
  - [x] 10.2 Connect keyboard actions to existing timer functions
    - Wire `togglePlayPause` to `runMeeting`/`stopMeeting`
    - Wire `resetTimer` to reset functionality
    - Wire section navigation to timer state
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 11. Checkpoint - Ensure keyboard shortcuts and fullscreen work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Improve placeholder and onboarding text
  - [x] 12.1 Update textarea placeholder in `index.html`
    - Add complete example agenda format
    - Include Introduction, Main topic, Demo, Q&A, FINISH entries
    - _Requirements: 5.1, 5.2_
  - [x] 12.2 Add format hint below textarea
    - Add hint text: "Format: MM:SS Section name (one per line)"
    - Style hint with secondary text color
    - _Requirements: 5.3_

- [x] 13. Final integration and cleanup
  - [x] 13.1 Add all new script tags to `index.html` in correct order
    - time-warnings.js, progress-bar.js, fullscreen.js, keyboard-shortcuts.js
    - Ensure proper load order before agenda-defender.js
  - [x] 13.2 Update module exports for testing compatibility
    - Add `module.exports` for Node.js/Jest environment
    - Use `typeof module !== 'undefined'` check

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All new modules follow the existing IIFE pattern for browser/Node.js compatibility
