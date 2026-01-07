function AgendaItem(timePart1, timePart2, text) {
    this.timePart1 = timePart1;
    this.timePart2 = timePart2;
    var tokens = text.split(' ');
    if (/^#[0-9a-f]{3,6}$/i.test(tokens[1])) {
        var prefix = tokens.shift();
        this.color = tokens.shift();
        this.text = prefix + ' ' + tokens.join(' ');
    } else {
        this.text = text;
    }
    this.isRelativeMode = timePart1 == 0 && timePart2 == 0;
    this.getAbsoluteTime = function () {
        let time = new Date();
        time.setHours(timePart1);
        time.setMinutes(timePart2);
        time.setSeconds(0);
        time.setMilliseconds(0);
        return time;
    }
    this.getRelativeTime = function (baseline) {
        let time = new Date(baseline);
        time.setMinutes(time.getMinutes() + timePart1);
        time.setSeconds(time.getSeconds() + timePart2);
        return (time);
    }
}

// Global time offset for section jumping (in milliseconds)
// Positive offset = jump forward in time, Negative offset = jump backward
let timeOffset = 0;

// Store current agenda for section jumping (exposed to window for SectionNavigator)
let currentAgenda = null;
window.currentAgenda = null;

let Agenda = {
    parseItem: function (itemString) {
        try {
            let agendaItemRegExp = /^(\d\d):(\d\d)\s+(.*)$/;
            let tokens = agendaItemRegExp.exec(itemString);
            let p1 = parseInt(tokens[1]);
            let p2 = parseInt(tokens[2]);
            return new AgendaItem(p1, p2, itemString);
        } catch (e) {
            console.warn(e);
            return null;
        }
    },

    parse: function (agendaString) {
        let items = agendaString.split(/\n/).map(line => this.parseItem(line)).filter(line => line != null);
        let relativeMode = items[0].isRelativeMode;
        let now = new Date();
        items.forEach(item => item.commencesAt = (relativeMode ? item.getRelativeTime(now) : item.getAbsoluteTime()));
        for (let i = 0; i < (items.length - 1); i++) items[i].concludesAt = items[i + 1].commencesAt;
        items.pop();
        console.debug(items);
        return items;
    }
};

function makeTicker(agenda) {
    let $ticker = $("#ticker");
    // Note: ticker is already cleared in runMeeting(), no need to clear again

    agenda.forEach(function (item, index, array) {
        let $div = $("<div>").addClass("agenda-item");
        let $span = $("<span>").addClass("agenda-item-text").text(item.text);

        // Calculate font size based on viewport height and number of items
        let viewportHeight = window.innerHeight;
        let fontSize = Math.min(72, Math.max(24, Math.floor(viewportHeight / (agenda.length * 2))));
        $span.css({
            "font-size": fontSize + "px",
            "line-height": (fontSize * 1.2) + "px"
        });

        $div.append($span);

        let $progressBar = $("<div>").addClass("progress-bar");
        if (item.color) $progressBar.css("background-color", item.color);

        item.element = $div;
        item.progressBar = $progressBar;
        $div.append($progressBar);
        $ticker.append($div);
    });

    // Store last update time for smooth animation
    let lastUpdate = Date.now();
    let lastProgress = {};
    agenda.forEach(item => lastProgress[item.text] = 0);

    return function () {
        // Check pause state before updating displays (Requirements: 1.4, 1.5)
        if (typeof PauseController !== 'undefined' && !PauseController.shouldUpdate()) {
            return; // Skip all updates when paused
        }

        // Apply time offset for section jumping and exclude paused duration
        let now = Date.now() + timeOffset;
        
        // Exclude paused duration from time calculations (Requirements: 1.4, 1.5)
        if (typeof PauseController !== 'undefined') {
            now -= PauseController.getPausedDuration();
        }
        
        let deltaTime = now - lastUpdate;
        lastUpdate = now;

        let currentItemIndex = 0;
        let currentItem = null;

        // Find the current agenda item (compare with getTime() for proper timestamp comparison)
        while (currentItemIndex < agenda.length) {
            let item = agenda[currentItemIndex];
            if (now < item.concludesAt.getTime()) {
                currentItem = item;
                break;
            }
            currentItemIndex++;
        }

        if (currentItem) {
            let timeLeft = currentItem.concludesAt - now;
            let minutes = Math.floor(timeLeft / 60000);
            let seconds = Math.floor((timeLeft % 60000) / 1000);
            let milliseconds = timeLeft % 1000;

            // Update progress bar with smooth interpolation
            let totalTime = currentItem.concludesAt - currentItem.commencesAt;
            let targetProgress = 100 * (1 - timeLeft / totalTime);
            let currentProgress = lastProgress[currentItem.text] || 0;

            // Smoothly interpolate between current and target progress
            let smoothProgress = currentProgress + (targetProgress - currentProgress) * (deltaTime / 100);
            lastProgress[currentItem.text] = smoothProgress;

            currentItem.progressBar.css("width", smoothProgress + "%");

            // Update overall progress bar (Requirements: 4.6)
            if (typeof ProgressBar !== 'undefined') {
                ProgressBar.update(currentItemIndex);
            }
            
            // Update section list highlighting (Requirements: 4.3)
            if (typeof SectionNavigator !== 'undefined') {
                SectionNavigator.highlightCurrentSection();
            }

            // Update StateManager with current section (Requirements: 7.1)
            if (typeof StateManager !== 'undefined') {
                StateManager.setCurrentSection(currentItemIndex);
            }

            // Update item text with subsecond precision for smoother countdown
            let timeString = minutes + ":" +
                (seconds < 10 ? "0" : "") + seconds;
            currentItem.element.find(".agenda-item-text")
                .text(currentItem.text + " - " + timeString);

            // Apply time warnings (traffic light system) to timer text and progress bar
            // Requirements: 3.6 - Apply color changes to timer text and progress bar
            // Prevent alerts and warnings during pause (Requirements: 1.4, 1.5)
            if (typeof TimeWarnings !== 'undefined' && 
                (typeof PauseController === 'undefined' || !PauseController.isPaused())) {
                TimeWarnings.applyWarning(currentItem.element[0], timeLeft);
                TimeWarnings.applyWarning(currentItem.progressBar[0], timeLeft);
            }

            // Add pulsing effect when 5 seconds or less remaining, but only if not finished
            if (seconds <= 5 && minutes === 0 && timeLeft > 0) {
                currentItem.element.addClass("pulse");
            } else {
                currentItem.element.removeClass("pulse");
            }

            // Mark previous items as finished
            for (let i = 0; i < currentItemIndex; i++) {
                agenda[i].progressBar.css("width", "100%");
                agenda[i].element.addClass("finished").removeClass("pulse");
                lastProgress[agenda[i].text] = 100;
                // Reset text to original (remove countdown) for finished items
                agenda[i].element.find(".agenda-item-text").text(agenda[i].text);
                // Remove warning classes from finished items
                if (typeof TimeWarnings !== 'undefined') {
                    agenda[i].element[0].classList.remove('warning-green', 'warning-yellow', 'warning-red', 'warning-overtime');
                    agenda[i].progressBar[0].classList.remove('warning-green', 'warning-yellow', 'warning-red', 'warning-overtime');
                }
            }
            
            // Reset upcoming items (for when jumping backward)
            // Remove finished class and reset progress for items after current
            for (let i = currentItemIndex + 1; i < agenda.length; i++) {
                agenda[i].element.removeClass("finished").removeClass("pulse");
                agenda[i].progressBar.css("width", "0%");
                lastProgress[agenda[i].text] = 0;
                // Reset the text to original (remove countdown)
                agenda[i].element.find(".agenda-item-text").text(agenda[i].text);
                // Remove warning classes from upcoming items
                if (typeof TimeWarnings !== 'undefined') {
                    agenda[i].element[0].classList.remove('warning-green', 'warning-yellow', 'warning-red', 'warning-overtime');
                    agenda[i].progressBar[0].classList.remove('warning-green', 'warning-yellow', 'warning-red', 'warning-overtime');
                }
            }
            
            // Also reset current item's finished state (in case we jumped back to it)
            currentItem.element.removeClass("finished");
        } else {
            // All items finished - handle completion (Requirements: 7.5)
            // Check if completion was already triggered to prevent duplicate calls
            if (typeof StateManager !== 'undefined' && StateManager.isCompleted()) {
                return; // Already completed, skip
            }
            
            // Mark as completed before triggering stop
            if (typeof StateManager !== 'undefined') {
                StateManager.markCompleted();
            }
            
            $("#ticker").find(".agenda-item").addClass("finished").removeClass("pulse");
            $("#ticker").find(".progress-bar").css("width", "100%");
            agenda.forEach(item => lastProgress[item.text] = 100);
            stopMeeting();
        }
    };
}

function runMeeting() {
    let agendaString = $("#agenda").val();
    let agenda = Agenda.parse(agendaString);

    if (!agenda || agenda.length === 0) {
        console.error("No valid agenda items found");
        return;
    }

    // Store agenda globally for section jumping
    currentAgenda = agenda;
    window.currentAgenda = agenda;
    
    // Reset time offset
    timeOffset = 0;

    // Update keyboard shortcuts timer state with agenda info
    if (typeof KeyboardShortcuts !== 'undefined') {
        KeyboardShortcuts.updateTimerState({
            isRunning: true,
            totalSections: agenda.length,
            currentSectionIndex: 0,
            isPaused: false
        });
        console.log('⌨️ Timer state updated: totalSections =', agenda.length);
    }

    // Initialize StateManager with timer state (Requirements: 7.1, 7.4)
    if (typeof StateManager !== 'undefined') {
        StateManager.initializeFromTimer(agenda);
        console.log('📊 StateManager initialized with', agenda.length, 'sections');
    }

    // Hide theme toggle button when entering meeting mode
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.style.display = 'none';
    }

    let $ticker = $("#ticker");
    $ticker.html('');

    // Track timer start
    Analytics.trackTimerStart('meeting');
    startTime = new Date();

    let tickerUpdate = makeTicker(agenda);

    // Initialize and render overall progress bar AFTER makeTicker (Requirements: 4.6)
    // Must be after makeTicker since makeTicker clears the ticker
    if (typeof ProgressBar !== 'undefined') {
        const progressBarContainer = ProgressBar.initialize();
        ProgressBar.render(agenda, 0);
        $ticker.append(progressBarContainer);
    }
    
    // Note: Section list removed - the main agenda display already shows sections
    // Section navigation is handled via keyboard shortcuts (N/P, arrow keys, 1-9)
    // and clicking on sections in the progress bar
    
    $("#ticker").show();
    $("#ticker-controls").show();
    
    // Start auto-dim timer for controls
    if (typeof ControlsDimmer !== 'undefined') {
        ControlsDimmer.startDimming();
    }
    
    // Initialize touch gesture handler for mobile support (Requirements: 6.1-6.7)
    if (typeof TouchGestureHandler !== 'undefined') {
        TouchGestureHandler.initialize();
    }
    
    window.ticker = window.setInterval(tickerUpdate, 50); // Update more frequently for smoother animation
    window.running = true;
    $("#run-meeting-button").val("STOP!");
    $("#run-meeting-button").addClass("stop");

    // Add resize handler to adjust font size when window is resized
    $(window).on('resize.agendaDefender', function () {
        let viewportHeight = window.innerHeight;
        let fontSize = Math.min(72, Math.max(24, Math.floor(viewportHeight / (agenda.length * 2))));
        $('.agenda-item-text').css({
            "font-size": fontSize + "px",
            "line-height": (fontSize * 1.2) + "px"
        });
    });
}

function stopMeeting() {
    if (!window.running) return;

    window.clearInterval(window.ticker);
    window.running = false;
    $("#ticker").hide();
    $("#ticker-controls").hide();
    
    // Stop auto-dim timer for controls
    if (typeof ControlsDimmer !== 'undefined') {
        ControlsDimmer.stopDimming();
    }
    
    $("#run-meeting-button").val("GO!");
    $("#run-meeting-button").removeClass("stop");

    // Clear agenda and reset time offset
    currentAgenda = null;
    window.currentAgenda = null;
    timeOffset = 0;

    // Reset pause controller state (Requirements: Integration)
    if (typeof PauseController !== 'undefined') {
        PauseController.reset();
    }
    
    // Reset time adjuster state (Requirements: Integration)
    if (typeof TimeAdjuster !== 'undefined') {
        TimeAdjuster.reset();
    }
    
    // Clean up SectionNavigator (Requirements: Integration)
    if (typeof SectionNavigator !== 'undefined') {
        SectionNavigator.destroy();
    }
    
    // Clean up TouchGestureHandler (Requirements: Integration)
    if (typeof TouchGestureHandler !== 'undefined') {
        TouchGestureHandler.destroy();
    }

    // Reset StateManager state (Requirements: 7.1, 7.4)
    if (typeof StateManager !== 'undefined') {
        StateManager.reset();
    }

    // Update keyboard shortcuts timer state
    if (typeof KeyboardShortcuts !== 'undefined') {
        KeyboardShortcuts.updateTimerState({
            isRunning: false,
            currentSectionIndex: 0,
            totalSections: 0
        });
    }

    // Exit fullscreen mode if active
    if (typeof FullscreenManager !== 'undefined' && FullscreenManager.getState()) {
        FullscreenManager.exit();
    }

    // Show theme toggle button when exiting meeting mode
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.style.display = '';
    }

    // Calculate elapsed time in seconds
    let elapsedTime = Math.floor((new Date() - startTime) / 1000);
    Analytics.trackTimerStop('meeting', elapsedTime);

    // Remove resize handler
    $(window).off('resize.agendaDefender');
}

/**
 * Jump to a specific section by index
 * Adjusts the time offset to make the timer show the target section
 * @param {number} targetIndex - 0-based section index to jump to
 */
function jumpToSectionByIndex(targetIndex) {
    if (!currentAgenda || !window.running) {
        console.log('⌨️ Cannot jump: timer not running or no agenda');
        return;
    }
    
    if (targetIndex < 0 || targetIndex >= currentAgenda.length) {
        console.log('⌨️ Cannot jump: invalid section index', targetIndex);
        return;
    }
    
    // Calculate the current effective time
    let now = Date.now() + timeOffset;
    
    // Find the target section's start time
    let targetSection = currentAgenda[targetIndex];
    let targetStartTime = targetSection.commencesAt.getTime();
    
    // Calculate new offset to make "now" appear at the start of target section
    // We add a small buffer (100ms) so we're clearly in the new section
    timeOffset = targetStartTime - Date.now() + 100;
    
    console.log('⌨️ Jumped to section', targetIndex, ':', targetSection.text);
    console.log('⌨️ New time offset:', timeOffset, 'ms');
    
    // Update keyboard shortcuts state
    if (typeof KeyboardShortcuts !== 'undefined') {
        KeyboardShortcuts.updateTimerState({
            currentSectionIndex: targetIndex
        });
    }
}

/**
 * Get the current section index based on time offset
 * @returns {number} Current section index
 */
function getCurrentSectionIndex() {
    if (!currentAgenda || !window.running) {
        return 0;
    }
    
    let now = Date.now() + timeOffset;
    
    for (let i = 0; i < currentAgenda.length; i++) {
        if (now < currentAgenda[i].concludesAt.getTime()) {
            return i;
        }
    }
    
    return currentAgenda.length - 1;
}

// Theme management
const ThemeManager = {
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark',
        SYSTEM: 'system'
    },

    getCurrentTheme() {
        const theme = document.documentElement.getAttribute('data-theme') || this.THEMES.SYSTEM;
        console.log('📱 Current theme:', theme);
        return theme;
    },

    setTheme: function (theme) {
        console.log('🎨 Setting theme to:', theme);
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.applyTheme(theme);
        this.updateToggleButton(theme);
        Analytics.trackThemeChange(theme);
    },

    applyTheme(theme) {
        console.log('✨ Applying theme:', theme);
        if (theme === this.THEMES.SYSTEM) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            console.log('🖥️ System prefers dark mode:', prefersDark);
            document.documentElement.classList.toggle('dark-theme', prefersDark);
            this.updateToggleButton(prefersDark ? this.THEMES.DARK : this.THEMES.LIGHT);
        } else {
            document.documentElement.classList.toggle('dark-theme', theme === this.THEMES.DARK);
            this.updateToggleButton(theme);
        }
    },

    updateToggleButton(theme) {
        const button = document.getElementById('theme-toggle');
        if (!button) {
            console.error('❌ Theme toggle button not found!');
            return;
        }

        console.log('🔄 Updating button for theme:', theme);
        switch (theme) {
            case this.THEMES.LIGHT:
                button.textContent = '🌙'; // Moon for light mode (switch to dark)
                break;
            case this.THEMES.DARK:
                button.textContent = '☀️'; // Sun for dark mode (switch to system)
                break;
            case this.THEMES.SYSTEM:
                button.textContent = '🌓'; // Half moon for system mode (switch to light)
                break;
        }
        console.log('🎯 Button icon set to:', button.textContent);
    },

    initialize() {
        console.log('🚀 Initializing theme manager');

        // Check system preference first
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        console.log('🖥️ Initial system dark mode preference:', prefersDark);

        // Get saved theme or use system preference
        const savedTheme = localStorage.getItem('theme');
        console.log('💾 Saved theme from localStorage:', savedTheme);

        const initialTheme = savedTheme || this.THEMES.SYSTEM;
        console.log('🎬 Setting initial theme to:', initialTheme);

        // Apply initial theme
        this.setTheme(initialTheme);

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            console.log('🔄 System theme changed, prefers dark:', e.matches);
            if (this.getCurrentTheme() === this.THEMES.SYSTEM) {
                this.applyTheme(this.THEMES.SYSTEM);
            }
        });

        // Setup theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) {
            console.error('❌ Theme toggle button not found during initialization!');
            return;
        }

        themeToggle.addEventListener('click', () => {
            console.log('🖱️ Theme toggle clicked');
            const currentTheme = this.getCurrentTheme();
            const newTheme = currentTheme === this.THEMES.LIGHT ? this.THEMES.DARK :
                currentTheme === this.THEMES.DARK ? this.THEMES.SYSTEM :
                    this.THEMES.LIGHT;
            console.log('🔄 Switching from', currentTheme, 'to', newTheme);
            this.setTheme(newTheme);
        });

        console.log('✅ Theme manager initialization complete');
    }
};

$(function () {
    // Initialize theme manager
    ThemeManager.initialize();

    // Initialize keyboard shortcuts (Requirements: 2.1-2.9)
    if (typeof KeyboardShortcuts !== 'undefined') {
        KeyboardShortcuts.initialize();
        console.log('⌨️ Keyboard shortcuts initialized. Press ? for help.');
        
        // Wire up keyboard actions to timer functions (Requirements: 2.1, 2.2, 2.3, 2.4)
        KeyboardShortcuts.setCallbacks({
            onTogglePlayPause: function(isRunning) {
                console.log('⌨️ Toggle play/pause, running:', window.running);
                
                // If timer is running, use PauseController for pause/resume (Requirements: 5.1)
                if (window.running && typeof PauseController !== 'undefined') {
                    PauseController.toggle();
                } else {
                    // Toggle between running and stopped states
                    if (window.running) {
                        stopMeeting();
                    } else {
                        runMeeting();
                    }
                }
            },
            onReset: function() {
                console.log('⌨️ Reset timer');
                // Reset timer to beginning (0:00) while keeping it running (Requirements: 5.2)
                if (window.running && currentAgenda && currentAgenda.length > 0) {
                    // Reset to the start of the first section
                    const firstSection = currentAgenda[0];
                    const firstSectionStart = firstSection.commencesAt.getTime();
                    
                    // Calculate new offset to make "now" appear at the start of first section
                    timeOffset = firstSectionStart - Date.now() + 100;
                    
                    // Reset pause state and clear accumulated paused time (Requirements: 5.2)
                    if (typeof PauseController !== 'undefined') {
                        PauseController.reset();
                    }
                    
                    // Reset time adjuster state
                    if (typeof TimeAdjuster !== 'undefined') {
                        TimeAdjuster.reset();
                    }
                    
                    // Reset section navigation to first section (Requirements: 5.2)
                    if (typeof SectionNavigator !== 'undefined') {
                        SectionNavigator.highlightCurrentSection();
                        SectionNavigator.scrollToCurrentSection();
                    }
                    
                    // Update keyboard shortcuts state
                    if (typeof KeyboardShortcuts !== 'undefined') {
                        KeyboardShortcuts.updateTimerState({
                            currentSectionIndex: 0,
                            isPaused: false
                        });
                    }
                    
                    console.log('⌨️ Timer reset to beginning (0:00)');
                } else if (!window.running) {
                    // If timer is not running, just log
                    console.log('⌨️ Timer not running, nothing to reset');
                }
            },
            onNextSection: function(index) {
                console.log('⌨️ Next section: jumping to index', index);
                // Use SectionNavigator if available (Requirements: 5.3)
                if (typeof SectionNavigator !== 'undefined') {
                    SectionNavigator.nextSection();
                } else {
                    jumpToSectionByIndex(index);
                }
            },
            onPrevSection: function(index) {
                console.log('⌨️ Previous section: jumping to index', index);
                // Use SectionNavigator if available (Requirements: 5.4)
                if (typeof SectionNavigator !== 'undefined') {
                    SectionNavigator.previousSection();
                } else {
                    jumpToSectionByIndex(index);
                }
            },
            onToggleMute: function(isMuted) {
                console.log('⌨️ Toggle mute:', isMuted);
                // Audio mute toggle - future Phase 2 feature
            },
            onJumpToSection: function(index) {
                console.log('⌨️ Jump to section: jumping to index', index);
                // Use SectionNavigator if available (Requirements: 5.5)
                if (typeof SectionNavigator !== 'undefined') {
                    SectionNavigator.jumpToSection(index);
                } else {
                    jumpToSectionByIndex(index);
                }
            }
        });
    } else {
        console.warn('⌨️ KeyboardShortcuts module not loaded');
    }

    // Try to load from hash or storage, otherwise show default agenda
    const urlText = UrlSharing.loadUrlHash();
    if (urlText) {
        $("#agenda").val(urlText);
    } else {
        const storageText = UrlSharing.loadFromStorage();
        if (storageText) {
            $("#agenda").val(storageText);
        } else {
            // Load a default agenda
            drawSampleAgenda();
        }
    }

    // Handle hash changes
    window.addEventListener("hashchange", function () {
        const urlText = UrlSharing.loadUrlHash();
        if (urlText) {
            $("#agenda").val(urlText);
        }
    }, false);

    $("#close-ticker").click(stopMeeting);

    // Wire up pause button to PauseController (Requirements: 1.1)
    $("#pause-button").click(function() {
        if (typeof PauseController !== 'undefined') {
            PauseController.toggle();
        }
    });

    // Wire up time adjustment buttons to TimeAdjuster (Requirements: 3.1, 3.2, 4.5)
    $("#add-time-btn").click(function() {
        if (typeof TimeAdjuster !== 'undefined') {
            TimeAdjuster.addTime(30);
        }
    });
    
    $("#subtract-time-btn").click(function() {
        if (typeof TimeAdjuster !== 'undefined') {
            TimeAdjuster.subtractTime(30);
        }
    });

    // Initialize keyboard help button
    $("#keyboard-help-button").click(function() {
        if (typeof KeyboardShortcuts !== 'undefined') {
            KeyboardShortcuts.showHelpOverlay();
        }
    });

    // Initialize fullscreen toggle button
    $("#fullscreen-toggle").click(function() {
        if (typeof FullscreenManager !== 'undefined') {
            FullscreenManager.toggle();
        }
    });

    // Initialize FullscreenManager if available
    if (typeof FullscreenManager !== 'undefined') {
        FullscreenManager.initialize();
    }

    $("#run-meeting-button").click(runMeeting);
    document.getElementById('scheduled-meeting')?.addEventListener('click', (e) => {
        e.preventDefault();
        drawSampleAgenda();
        return false;
    });

    $(document).on('keyup', function (e) {
        if (e.key === "Escape") stopMeeting();
    });
});

// Export for testing
function drawSampleAgenda(event) {
    console.log('[DEBUG_LOG] drawSampleAgenda called', event);
    console.log('[DEBUG_LOG] Textarea element:', document.getElementById('agenda'));
    let item;
    let topics = ["This is Agenda Defender!",
        "List your agenda items",
        "Times are local, 24-hour clock, HH:mm",
        "Put the FINISH time last",
        "Then click 'GO!'",
        "Use it to run meetings,",
        "for giving talks and presentations,",
        "or whatever you like, really :)"];
    let time = new Date();
    let items = [];
    time.setMinutes(time.getMinutes() - 5);
    for (let i = 0; i < topics.length; i++) {
        item = time.getHours().toString().padStart(2, '0') + ":" + time.getMinutes().toString().padStart(2, '0') + " " + topics[i];
        items.push(item);
        time.setMinutes(time.getMinutes() + 2);
    }
    item = time.getHours().toString().padStart(2, '0') + ":" + time.getMinutes().toString().padStart(2, '0') + " FINISH";
    items.push(item);
    let agenda = items.join("\n");
    $("#agenda").val(agenda);
    if (event && event.preventDefault) event.preventDefault();
    return false;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {AgendaItem, Agenda, drawSampleAgenda, runMeeting, stopMeeting};
}
