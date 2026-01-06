# Requirements Document

## Introduction

This specification covers the Core UX Improvements for Time My Talk (Phase 1), focusing on enhancing the presentation experience with fullscreen mode, keyboard controls, visual feedback, and better onboarding. These features enable speakers to control the timer without mouse interaction and receive clear visual cues about timing status.

## Glossary

- **Timer_Display**: The main countdown timer component showing remaining time in MM:SS format
- **Section**: A single agenda item with a name and duration
- **Progress_Bar**: A horizontal visualization showing overall talk progress across all sections
- **Fullscreen_Mode**: A presentation view that maximizes the timer display and hides non-essential UI
- **Traffic_Light_System**: Color-coded visual warnings (green/yellow/red) based on remaining time
- **Keyboard_Handler**: The component that processes keyboard shortcuts during presentation

## Requirements

### Requirement 1: Fullscreen Presentation Mode

**User Story:** As a speaker, I want to view the timer in fullscreen mode, so that I can see the countdown clearly from a distance while presenting.

#### Acceptance Criteria

1. WHEN a user clicks the fullscreen toggle button, THE Fullscreen_Mode SHALL activate using the native Fullscreen API
2. WHILE in Fullscreen_Mode, THE Timer_Display SHALL scale to min(20vw, 30vh) font size
3. WHILE in Fullscreen_Mode, THE Timer_Display SHALL show only the timer, current section name, and progress indicator
4. WHILE in Fullscreen_Mode, THE Timer_Display SHALL respect the current theme (dark/light mode)
5. WHEN the user presses the Escape key in Fullscreen_Mode, THE Fullscreen_Mode SHALL deactivate
6. WHEN the user clicks anywhere in Fullscreen_Mode, THE Fullscreen_Mode SHALL deactivate
7. WHEN the user presses the 'F' key, THE Fullscreen_Mode SHALL toggle between active and inactive states

### Requirement 2: Keyboard Shortcuts

**User Story:** As a speaker, I want to control the timer using keyboard shortcuts, so that I can manage my presentation without reaching for the mouse.

#### Acceptance Criteria

1. WHEN the user presses the SPACE key, THE Timer_Display SHALL toggle between play and pause states
2. WHEN the user presses the 'R' key, THE Timer_Display SHALL reset to the beginning of the agenda
3. WHEN the user presses the 'N' key or Right Arrow, THE Timer_Display SHALL skip to the next section
4. WHEN the user presses the 'P' key or Left Arrow, THE Timer_Display SHALL go to the previous section
5. WHEN the user presses the 'F' key, THE Fullscreen_Mode SHALL toggle
6. WHEN the user presses the 'M' key, THE Timer_Display SHALL toggle audio mute state
7. WHEN the user presses a number key 1-9, THE Timer_Display SHALL jump to that section number if it exists
8. WHILE the focus is on an INPUT or TEXTAREA element, THE Keyboard_Handler SHALL ignore all shortcuts
9. WHEN the user presses the Escape key, THE Keyboard_Handler SHALL exit fullscreen or close any open modals

### Requirement 3: Visual Time Warnings (Traffic Light System)

**User Story:** As a speaker, I want visual color cues about my timing status, so that I can instantly know if I'm on track without reading the exact time.

#### Acceptance Criteria

1. WHILE more than 30 seconds remain in the current section, THE Timer_Display SHALL display in green (#22c55e)
2. WHILE between 10 and 30 seconds remain in the current section, THE Timer_Display SHALL display in yellow (#eab308)
3. WHILE less than 10 seconds remain in the current section, THE Timer_Display SHALL display in red (#ef4444)
4. WHILE the current section is overtime, THE Timer_Display SHALL pulse red with a 500ms animation cycle
5. WHEN the warning state changes, THE Timer_Display SHALL transition colors smoothly over 300ms
6. THE Traffic_Light_System SHALL apply color changes to the timer text, background glow, and progress bar segment

### Requirement 4: Progress Visualization

**User Story:** As a speaker, I want to see my overall talk progress at a glance, so that I can understand how much of my presentation remains.

#### Acceptance Criteria

1. THE Progress_Bar SHALL display as a horizontal bar below the timer with 8px height and 4px border-radius
2. THE Progress_Bar SHALL be segmented by sections with widths proportional to each section's duration
3. WHILE a section is complete, THE Progress_Bar segment SHALL display as filled
4. WHILE a section is current, THE Progress_Bar segment SHALL display as highlighted
5. WHILE a section is upcoming, THE Progress_Bar segment SHALL display as outlined/unfilled
6. WHEN the timer advances, THE Progress_Bar SHALL update to reflect the current position

### Requirement 5: Placeholder and Onboarding Text

**User Story:** As a first-time user, I want to see example agenda format in the input area, so that I understand how to enter my presentation timing.

#### Acceptance Criteria

1. WHEN the textarea is empty and unfocused, THE Editor SHALL display placeholder text showing the expected format
2. THE Editor placeholder SHALL include a complete example agenda with Introduction, Main topic, Demo, Q&A, and FINISH entries
3. THE Editor SHALL display a format hint below the textarea: "Format: MM:SS Section name (one per line)"
4. WHEN the user focuses on the textarea, THE Editor SHALL clear the placeholder text
5. WHEN the user blurs the textarea and it is empty, THE Editor SHALL restore the placeholder text
