/**
 * ProgressBar Module
 * 
 * Provides overall progress visualization showing talk progress across all sections.
 * Displays a horizontal bar with segments proportional to each section's duration.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

const ProgressBar = (function() {
    'use strict';

    // Container element reference
    let container = null;

    /**
     * Initialize the progress bar container element
     * @returns {HTMLElement} The created container element
     */
    function initialize() {
        container = document.createElement('div');
        container.id = 'overall-progress';
        container.className = 'overall-progress-bar';
        return container;
    }

    /**
     * Get the container element (creates if not exists)
     * @returns {HTMLElement} The container element
     */
    function getContainer() {
        if (!container) {
            initialize();
        }
        return container;
    }

    /**
     * Calculate segment status based on index relative to current index
     * @param {number} segmentIndex - Index of the segment
     * @param {number} currentIndex - Index of the current section
     * @returns {string} Status: 'complete', 'current', or 'upcoming'
     */
    function getSegmentStatus(segmentIndex, currentIndex) {
        if (segmentIndex < currentIndex) return 'complete';
        if (segmentIndex === currentIndex) return 'current';
        return 'upcoming';
    }

    /**
     * Calculate segment widths as percentages based on durations
     * @param {Array} sections - Array of section objects with commencesAt and concludesAt
     * @returns {Array} Array of width percentages
     */
    function calculateWidths(sections) {
        if (!sections || sections.length === 0) return [];

        // Calculate total duration
        const totalDuration = sections.reduce(function(sum, section) {
            const duration = section.concludesAt - section.commencesAt;
            return sum + duration;
        }, 0);

        // Avoid division by zero
        if (totalDuration === 0) {
            // Equal widths if no duration info
            const equalWidth = 100 / sections.length;
            return sections.map(function() { return equalWidth; });
        }

        // Calculate proportional widths
        return sections.map(function(section) {
            const duration = section.concludesAt - section.commencesAt;
            return (duration / totalDuration) * 100;
        });
    }

    /**
     * Render the progress bar with segments for each section
     * @param {Array} sections - Array of section objects with commencesAt, concludesAt, and text
     * @param {number} currentIndex - Index of the current section (0-based)
     * @returns {HTMLElement} The container element with rendered segments
     */
    function render(sections, currentIndex) {
        const cont = getContainer();
        
        if (!sections || sections.length === 0) {
            cont.innerHTML = '';
            return cont;
        }

        const widths = calculateWidths(sections);

        const segmentsHtml = sections.map(function(section, index) {
            const status = getSegmentStatus(index, currentIndex);
            const width = widths[index];
            const title = section.text || '';
            
            return '<div class="progress-segment" ' +
                   'data-status="' + status + '" ' +
                   'style="width: ' + width + '%" ' +
                   'title="' + title.replace(/"/g, '&quot;') + '"></div>';
        }).join('');

        cont.innerHTML = segmentsHtml;
        return cont;
    }

    /**
     * Update segment statuses based on current index
     * @param {number} currentIndex - Index of the current section (0-based)
     */
    function update(currentIndex) {
        if (!container) return;

        const segments = container.querySelectorAll('.progress-segment');
        segments.forEach(function(segment, index) {
            const status = getSegmentStatus(index, currentIndex);
            segment.setAttribute('data-status', status);
        });
    }

    // Public API
    return {
        initialize: initialize,
        getContainer: getContainer,
        getSegmentStatus: getSegmentStatus,
        calculateWidths: calculateWidths,
        render: render,
        update: update
    };
})();

// Export for Node.js/testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressBar;
}
