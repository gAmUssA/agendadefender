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

function drawSampleAgenda(event) {
    let item;
    const topics = ["This is Time My Talk!",
        "List your agenda items",
        "Times are local, 24-hour clock, HH:mm",
        "Put the FINISH time last",
        "Then click 'GO!'",
        "Use it to run meetings,",
        "for giving talks and presentations,",
        "or whatever you like, really :)"];
    const time = new Date();
    const items = [];
    time.setMinutes(time.getMinutes() - 5);
    for (let i = 0; i < 8; i++) {
        item = time.getHours().toString().padStart(2, '0') + ":" + time.getMinutes().toString().padStart(2, '0') + " " + topics[i];
        items.push(item);
        time.setMinutes(time.getMinutes() + 2);
    }
    item = time.getHours().toString().padStart(2, '0') + ":" + time.getMinutes().toString().padStart(2, '0') + " FINISH";
    items.push(item);
    let agenda = items.join("\n");
    $("#agenda").html(agenda);
    if (event && event.preventDefault) event.preventDefault();
    return false;
}

function draw45MinuteTalk(event) {
    $("#agenda").html(`00:00 Intro and welcome
05:00 Context: why are database deployments hard?
08:00 Rolling forward, rolling back
13:00 Schema management
18:00 Working with static data and lookup data
25:00 Live demonstration
40:00 Conclusion and next steps
45:00 FINISH`);
    event.preventDefault();
    return false;
}

function drawLightningTalk(event) {
    $("#agenda").html(`00:00 Introduction to lightning talks
00:30 How I learned to love three-minute talks
01:00 The history of pecha kucha
01:30 Rehearsal tips for lightning talks
02:00 Scheduling tips
02:30 Funny stories
03:00 FINISH`);
    event.preventDefault();
    return false;
}

// function saveToUrlHash() {
//     var base64 = btoa($("#agenda").html());
//     var hash = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
//     window.location.hash = hash;
// }

// function loadUrlHash() {
//     var hash = window.location.hash.substring(1);
//     if (! hash) return(false);
//     try {
//     var base64 = hash.replace(/-/g, '+').replace(/_/g, '/') + "==";
//     $("#agenda").html(atob(base64));
//     return(true);
//     } catch(err) {
//         console.log(err);
//         return(false);
//     }
// }

function runMeeting() {
    let agendaString = $("#agenda").val();
    let agenda = Agenda.parse(agendaString);
    let $ticker = $("#ticker");
    $ticker.html('');

    agenda.forEach(function (item, index, array) {
        $div = $("<div class='agenda-item' />");
        $span = $("<span class='agenda-item-text' />")
        $span.text(item.text);

        // Calculate font size based on viewport height and number of items
        let viewportHeight = window.innerHeight;
        let fontSize = Math.min(72, Math.max(24, Math.floor(viewportHeight / (agenda.length * 2))));
        $span.css("font-size", fontSize + "px");
        $span.css("line-height", (fontSize * 1.2) + "px");

        $div.append($span);

        $progressBar = $("<div class='progress-bar' />");
        if (item.color) $progressBar.css("background-color", item.color);

        item.element = $div;
        item.progressBar = $progressBar;
        $div.append($progressBar);
        $ticker.append($div);
    });

    $("#ticker").show();
    $("a#close-ticker").show();
    window.ticker = window.setInterval(makeTicker(agenda), 10);
    window.running = true;

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

function makeTicker(agenda) {
    return function () {
        let now = new Date();
        agenda.forEach(function (item, index, array) {
            if (item.concludesAt < now) {
                item.progressBar.hide();
                item.element.addClass('finished');
            }
            if (item.commencesAt < now && item.concludesAt > now) {
                let duration = item.concludesAt.valueOf() - item.commencesAt.valueOf();
                let elapsed = now.valueOf() - item.commencesAt.valueOf();
                let multiplier = elapsed / duration;
                let newWidth = item.element.width() * multiplier;
                item.progressBar.css("width", newWidth + "px");
            }
        });
    };
}

function stopMeeting() {
    window.clearInterval(window.ticker);
    window.running = false;
    $("#ticker").hide();
    $("a#close-ticker").hide();
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

    setTheme(theme) {
        console.log('🎨 Setting theme to:', theme);
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.applyTheme(theme);
        this.updateToggleButton(theme);
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

    // if (!loadUrlHash()) 
    drawSampleAgenda();
    window.addEventListener("resize", function () {
        if (window.running) runMeeting();
    }, false);
    // $("#agenda").on("keyup", saveToUrlHash);

    // Use event delegation for example links
    $("#controls-wrapper").on("click", "a#lightning-talk", drawLightningTalk);
    $("#controls-wrapper").on("click", "a#45-minute-talk", draw45MinuteTalk);
    $("#controls-wrapper").on("click", "a#absolute-example", drawSampleAgenda);

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
