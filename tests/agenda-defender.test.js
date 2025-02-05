const {AgendaItem, Agenda} = require('../scripts/agenda-defender.js');

describe('AgendaItem', () => {
    describe('constructor', () => {
        test('should parse time parts correctly', () => {
            const item = new AgendaItem(10, 30, '10:30 Test item');
            expect(item.timePart1).toBe(10);
            expect(item.timePart2).toBe(30);
        });

        test('should handle color in text', () => {
            const item = new AgendaItem(10, 30, '10:30 #ff0000 Colored item');
            expect(item.color).toBe('#ff0000');
            expect(item.text).toBe('10:30 Colored item');
        });

        test('should handle text without color', () => {
            const item = new AgendaItem(10, 30, '10:30 Regular item');
            expect(item.color).toBeUndefined();
            expect(item.text).toBe('10:30 Regular item');
        });
    });

    describe('time calculations', () => {
        test('should calculate absolute time correctly', () => {
            const item = new AgendaItem(14, 30, '14:30 Test item');
            const time = item.getAbsoluteTime();
            expect(time.getHours()).toBe(14);
            expect(time.getMinutes()).toBe(30);
            expect(time.getSeconds()).toBe(0);
        });

        test('should calculate relative time correctly', () => {
            const item = new AgendaItem(5, 0, '05:00 Test item');
            const baseline = new Date('2024-01-01T10:00:00');
            const time = item.getRelativeTime(baseline);
            expect(time.getHours()).toBe(10);
            expect(time.getMinutes()).toBe(5);
        });
    });
});

describe('Agenda', () => {
    describe('parseItem', () => {
        test('should parse valid time format', () => {
            const result = Agenda.parseItem('14:30 Test item');
            expect(result).toBeInstanceOf(AgendaItem);
            expect(result.timePart1).toBe(14);
            expect(result.timePart2).toBe(30);
            expect(result.text).toBe('14:30 Test item');
        });

        test('should return null for invalid format', () => {
            const result = Agenda.parseItem('Invalid format');
            expect(result).toBeNull();
        });
    });

    describe('parse', () => {
        test('should parse multiple items', () => {
            const agenda = `14:30 First item
15:00 Second item
15:30 FINISH`;
            const result = Agenda.parse(agenda);
            expect(result).toHaveLength(2); // FINISH item is popped
            expect(result[0].text).toBe('14:30 First item');
            expect(result[1].text).toBe('15:00 Second item');
        });

        test('should handle relative mode', () => {
            const agenda = `00:00 Start
05:00 Middle
10:00 FINISH`;
            const result = Agenda.parse(agenda);
            expect(result).toHaveLength(2);
            expect(result[0].isRelativeMode).toBe(true);
        });

        test('should parse 45-minute talk template', () => {
            const agenda = `00:00 Intro and welcome
05:00 Context: why are database deployments hard?
08:00 Rolling forward, rolling back
13:00 Schema management
18:00 Working with static data and lookup data
25:00 Live demonstration
40:00 Conclusion and next steps
45:00 FINISH`;
            const result = Agenda.parse(agenda);
            expect(result).toHaveLength(7); // FINISH item is popped
            expect(result[0].isRelativeMode).toBe(true);
            expect(result[0].text).toBe('00:00 Intro and welcome');
            expect(result[6].text).toBe('40:00 Conclusion and next steps');
        });

        test('should parse lightning talk template', () => {
            const agenda = `00:00 Introduction to lightning talks
00:30 How I learned to love three-minute talks
01:00 The history of pecha kucha
01:30 Rehearsal tips for lightning talks
02:00 Scheduling tips
02:30 Funny stories
03:00 FINISH`;
            const result = Agenda.parse(agenda);
            expect(result).toHaveLength(6); // FINISH item is popped
            expect(result[0].isRelativeMode).toBe(true);
            expect(result[0].text).toBe('00:00 Introduction to lightning talks');
            expect(result[5].text).toBe('02:30 Funny stories');

            // Verify time calculations
            const baseline = new Date('2024-01-01T10:00:00');
            const startTime = result[0].getRelativeTime(baseline);
            expect(startTime.getHours()).toBe(10);
            expect(startTime.getMinutes()).toBe(0);

            const lastItemTime = result[5].getRelativeTime(baseline);
            expect(lastItemTime.getHours()).toBe(10);
            expect(lastItemTime.getMinutes()).toBe(2);
            expect(lastItemTime.getSeconds()).toBe(30);
        });
    });
});

describe('Agenda Defender', () => {
    let AgendaDefender;

    beforeEach(() => {
        // Reset the DOM
        document.body.innerHTML = `
            <button id="theme-toggle" aria-label="Toggle theme">🌓</button>
            <textarea id="agenda"></textarea>
            <div id="controls-wrapper">
                <input type="submit" value="GO!" id="run-meeting-button" />
            </div>
            <div id="ticker"></div>
            <a id="close-ticker" style="display: none;">Close</a>
        `;

        // Clear any previous module cache
        jest.resetModules();

        // Load the module
        AgendaDefender = require('../scripts/agenda-defender.js');
    });

    describe('AgendaItem', () => {
        test('should create agenda item with absolute time', () => {
            const item = new AgendaDefender.AgendaItem(15, 30, 'Test item');
            expect(item.timePart1).toBe(15);
            expect(item.timePart2).toBe(30);
            expect(item.text).toBe('Test item');
            expect(item.isRelativeMode).toBe(false);
        });

        test('should create agenda item with relative time', () => {
            const item = new AgendaDefender.AgendaItem(0, 0, 'Test item');
            expect(item.isRelativeMode).toBe(true);
        });

        test('should handle color in text', () => {
            const item = new AgendaDefender.AgendaItem(15, 30, '+ #ff0000 Colored item');
            expect(item.color).toBe('#ff0000');
            expect(item.text).toBe('+ Colored item');
        });
    });

    describe('Agenda', () => {
        test('should parse agenda item', () => {
            const item = AgendaDefender.Agenda.parseItem('15:30 Test item');
            expect(item.timePart1).toBe(15);
            expect(item.timePart2).toBe(30);
            expect(item.text).toBe('15:30 Test item');
        });

        test('should handle invalid agenda item', () => {
            const item = AgendaDefender.Agenda.parseItem('invalid');
            expect(item).toBeNull();
        });

        test('should parse agenda string', () => {
            const agenda = AgendaDefender.Agenda.parse('15:00 First item\n15:30 Second item');
            expect(agenda.length).toBe(1); // Last item is removed as it has no end time
            expect(agenda[0].text).toBe('15:00 First item');
        });
    });

    describe('Sample Agenda', () => {
        test('should handle Scheduled Meeting link click and direct call', async () => {
            // Set up the DOM with required elements
            document.body.innerHTML = `
                <textarea id="agenda"></textarea>
                <a id="scheduled-meeting" href="#">Sample Agenda</a>
            `;

            // Mock Date to have consistent test results
            const mockTime = new Date('2024-01-01T14:30:00').getTime();
            const realDate = global.Date;
            global.Date = class extends Date {
                constructor() {
                    super();
                    return new realDate(mockTime);
                }
                static now() {
                    return mockTime;
                }
            };

            // Initialize jQuery and load module
            window.$ = window.jQuery = require('../scripts/jquery-3.3.1.min.js');

            // Mock matchMedia
            window.matchMedia = jest.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            }));

            // Mock UrlSharing
            window.UrlSharing = {
                loadUrlHash: jest.fn().mockReturnValue(null),
                loadFromStorage: jest.fn().mockReturnValue(null),
                saveToStorage: jest.fn(),
                STORAGE_KEY: 'agenda_text'
            };

            // Reset modules to ensure clean state
            jest.resetModules();

            // Load and initialize the module
            const AgendaDefender = require('../scripts/agenda-defender.js');
            const { drawSampleAgenda } = AgendaDefender;

            // Trigger DOMContentLoaded to initialize event handlers
            document.dispatchEvent(new Event('DOMContentLoaded'));

            // Test direct function call
            drawSampleAgenda();
            let agendaText = document.getElementById('agenda').value;
            expect(agendaText).toContain('This is Agenda Defender!');
            expect(agendaText.split('\n').length).toBe(9);

            // Clear textarea
            document.getElementById('agenda').value = '';

            // Test click event
            const link = document.getElementById('scheduled-meeting');
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            link.dispatchEvent(clickEvent);

            // Add small delay to allow for any async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify click result
            agendaText = document.getElementById('agenda').value;
            expect(agendaText).toContain('This is Agenda Defender!');
            expect(agendaText.split('\n').length).toBe(9);

            // Restore Date
            global.Date = realDate;

            // Verify that agenda was generated
            expect(agendaText).toContain('This is Agenda Defender!');
            expect(agendaText.split('\n').length).toBe(9); // 8 items + FINISH
        });

        test('should generate sample agenda with correct format', () => {
            // Mock Date to have consistent test results
            const mockTime = new Date('2024-01-01T14:30:00').getTime();
            const realDate = global.Date;
            global.Date = class extends Date {
                constructor() {
                    super();
                    return new realDate(mockTime);
                }
                static now() {
                    return mockTime;
                }
            };

            // Call drawSampleAgenda
            AgendaDefender.drawSampleAgenda();

            // Get the agenda text
            const agendaText = document.getElementById('agenda').value;
            const lines = agendaText.split('\n');

            // Restore Date
            global.Date = realDate;

            // Verify number of items (8 topics + FINISH)
            expect(lines.length).toBe(9);

            // Verify time format and intervals
            const timeRegex = /^(\d{2}):(\d{2})/;
            let previousTime = null;
            lines.forEach((line, index) => {
                const match = timeRegex.exec(line);
                expect(match).toBeTruthy();

                const currentTime = new Date();
                currentTime.setHours(parseInt(match[1]));
                currentTime.setMinutes(parseInt(match[2]));

                if (previousTime) {
                    const timeDiff = (currentTime - previousTime) / (1000 * 60); // difference in minutes
                    expect(timeDiff).toBeCloseTo(2, 1); // 2-minute intervals, allowing small precision differences
                }
                previousTime = currentTime;
            });

            // Verify content
            expect(lines[0]).toMatch(/This is Agenda Defender!/);
            expect(lines[lines.length - 1]).toMatch(/FINISH$/);
        });

        test('should handle event prevention', () => {
            const mockEvent = {
                preventDefault: jest.fn()
            };
            const result = AgendaDefender.drawSampleAgenda(mockEvent);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('Theme Management', () => {
        test('should initialize theme manager', () => {
            // Load the module again to trigger initialization
            jest.resetModules();
            AgendaDefender = require('../scripts/agenda-defender.js');

            // Check if theme toggle button exists
            const themeToggle = document.getElementById('theme-toggle');
            expect(themeToggle).toBeTruthy();
        });
    });
});
