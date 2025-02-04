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
    });
});