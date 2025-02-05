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

function loadFromHash() {
    if (window.location.hash) {
        try {
            let encodedText = window.location.hash.substring(1); // Remove the # symbol
            let decodedText = decodeURIComponent(atob(encodedText));
            $("#agenda").val(decodedText);
            return true;
        } catch (e) {
            console.warn("Failed to decode hash:", e);
            return false;
        }
    }
    return false;
}

function makeTicker(agenda) {
    let $ticker = $("#ticker");
    $ticker.html('');

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

    return function() {
        let now = Date.now();
        let deltaTime = now - lastUpdate;
        lastUpdate = now;

        let currentItemIndex = 0;
        let currentItem = null;

        // Find the current agenda item
        while (currentItemIndex < agenda.length) {
            let item = agenda[currentItemIndex];
            if (now < item.concludesAt) {
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
            
            // Update item text with subsecond precision for smoother countdown
            let timeString = minutes + ":" + 
                           (seconds < 10 ? "0" : "") + seconds;
            currentItem.element.find(".agenda-item-text")
                .text(currentItem.text + " - " + timeString);

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
            }
        } else {
            // All items finished
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

    let $ticker = $("#ticker");
    $ticker.html('');

    // Track timer start
    Analytics.trackTimerStart('meeting');
    startTime = new Date();

    let tickerUpdate = makeTicker(agenda);
    $("#ticker").show();
    $("a#close-ticker").show();
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
    $("a#close-ticker").hide();
    $("#run-meeting-button").val("GO!");
    $("#run-meeting-button").removeClass("stop");
    
    // Calculate elapsed time in seconds
    let elapsedTime = Math.floor((new Date() - startTime) / 1000);
    Analytics.trackTimerStop('meeting', elapsedTime);
    
    // Remove resize handler
    $(window).off('resize.agendaDefender');
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

    setTheme: function(theme) {
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

    // Try to load from hash, otherwise show default agenda
    if (!loadFromHash()) {
        // Load a default agenda
        let defaultAgenda = "00:00 This is Time My Talk!\n" +
                          "15:05 List your agenda items\n" +
                          "15:10 Times are local, 24-hour clock, HH:mm\n" +
                          "15:15 Put the FINISH time last\n" +
                          "15:20 Then click 'GO!'\n" +
                          "15:25 Use it to run meetings,\n" +
                          "15:30 for giving talks and presentations,\n" +
                          "15:35 or whatever you like, really :)\n" +
                          "15:40 FINISH";
        $("#agenda").val(defaultAgenda);
    }

    window.addEventListener("resize", function () {
        if (window.running) runMeeting();
    }, false);

    // Handle hash changes
    window.addEventListener("hashchange", function() {
        loadFromHash();
    }, false);

    $("a#close-ticker").click(stopMeeting);
    $("#run-meeting-button").click(runMeeting);
    $(document).on('keyup', function (e) {
        if (e.key == "Escape") stopMeeting();
    });
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {AgendaItem, Agenda};
}
