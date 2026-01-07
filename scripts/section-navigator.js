/**
 * SectionNavigator Module
 * 
 * Handles section jumping and navigation with visual feedback.
 * Provides methods for navigating between agenda sections during presentations.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.3, 4.4
 */

const SectionNavigator = (function() {
    'use strict';

    // Debug mode - set to true to enable console logging
    let debug = false;
    
    // Track last highlighted section to avoid redundant updates
    let lastHighlightedIndex = -1;

    /**
     * Debug log helper
     */
    function log(...args) {
        if (debug) {
            console.log('🧭 [SectionNavigator]', ...args);
        }
    }

    /**
     * Set debug mode
     * @param {boolean} state - Whether debug mode should be enabled
     */
    function setDebug(state) {
        debug = state;
        log('Debug mode:', state ? 'enabled' : 'disabled');
    }

    /**
     * Get the current section index based on time offset
     * Requirements: 2.1, 2.2, 2.3, 2.4
     * @returns {number} Current section index (0-based)
     */
    function getCurrentSectionIndex() {
        // Use the global getCurrentSectionIndex function if available
        if (typeof window !== 'undefined' && typeof window.getCurrentSectionIndex === 'function') {
            return window.getCurrentSectionIndex();
        }
        
        // Fallback: calculate from currentAgenda and timeOffset
        if (!window.currentAgenda || !window.running) {
            log('Cannot get current section: timer not running or no agenda');
            return 0;
        }
        
        let now = Date.now() + (window.timeOffset || 0);
        
        // Exclude paused duration if PauseController is available
        if (typeof PauseController !== 'undefined') {
            now -= PauseController.getPausedDuration();
        }
        
        for (let i = 0; i < window.currentAgenda.length; i++) {
            if (now < window.currentAgenda[i].concludesAt.getTime()) {
                return i;
            }
        }
        
        return window.currentAgenda.length - 1;
    }

    /**
     * Get the total number of sections
     * Requirements: 2.1, 2.2, 2.3, 2.4
     * @returns {number} Total number of sections
     */
    function getTotalSections() {
        if (!window.currentAgenda) {
            log('No agenda available');
            return 0;
        }
        
        return window.currentAgenda.length;
    }

    /**
     * Jump to the next section
     * Requirements: 2.2, 2.5
     * @returns {boolean} True if navigation was successful
     */
    function nextSection() {
        const currentIndex = getCurrentSectionIndex();
        const totalSections = getTotalSections();
        
        log('nextSection called, current:', currentIndex, 'total:', totalSections);
        
        // Check boundary condition - already at last section
        if (currentIndex >= totalSections - 1) {
            log('Already at last section');
            return false;
        }
        
        const nextIndex = currentIndex + 1;
        return jumpToSection(nextIndex);
    }

    /**
     * Jump to the previous section
     * Requirements: 2.3, 2.5
     * @returns {boolean} True if navigation was successful
     */
    function previousSection() {
        const currentIndex = getCurrentSectionIndex();
        
        log('previousSection called, current:', currentIndex);
        
        // Check boundary condition - already at first section
        if (currentIndex <= 0) {
            log('Already at first section');
            return false;
        }
        
        const prevIndex = currentIndex - 1;
        return jumpToSection(prevIndex);
    }

    /**
     * Jump to a specific section by index
     * Requirements: 2.1, 2.4, 2.5, 2.6
     * @param {number} targetIndex - 0-based section index to jump to
     * @returns {boolean} True if navigation was successful
     */
    function jumpToSection(targetIndex) {
        if (!window.currentAgenda || !window.running) {
            log('Cannot jump: timer not running or no agenda');
            return false;
        }
        
        const totalSections = getTotalSections();
        
        // Validate target index
        if (targetIndex < 0 || targetIndex >= totalSections) {
            log('Cannot jump: invalid section index', targetIndex);
            return false;
        }
        
        // Use the global jumpToSectionByIndex function
        if (typeof window.jumpToSectionByIndex === 'function') {
            window.jumpToSectionByIndex(targetIndex);
            log('Jumped to section', targetIndex);
            
            // Update UI to reflect new section
            highlightCurrentSection();
            scrollToCurrentSection();
            
            return true;
        } else {
            log('Error: jumpToSectionByIndex function not available');
            return false;
        }
    }

    /**
     * Highlight the current section in the section list
     * Requirements: 4.3
     */
    function highlightCurrentSection() {
        const sectionList = document.querySelector('.section-list');
        
        // Silently return if section list doesn't exist (not an error)
        if (!sectionList) {
            return;
        }
        
        const currentIndex = getCurrentSectionIndex();
        
        // Skip if already highlighted (avoid redundant DOM updates)
        if (currentIndex === lastHighlightedIndex) {
            return;
        }
        
        lastHighlightedIndex = currentIndex;
        
        // Remove highlight from all sections
        const allSections = sectionList.querySelectorAll('.section-item');
        allSections.forEach(section => {
            section.classList.remove('current-section');
        });
        
        // Add highlight to current section
        const currentSection = sectionList.querySelector(`[data-section-index="${currentIndex}"]`);
        if (currentSection) {
            currentSection.classList.add('current-section');
            log('Highlighted section', currentIndex);
        }
    }

    /**
     * Scroll to keep the current section visible in the section list
     * Requirements: 4.4
     */
    function scrollToCurrentSection() {
        const sectionList = document.querySelector('.section-list');
        
        // Silently return if section list doesn't exist
        if (!sectionList) {
            return;
        }
        
        const currentIndex = getCurrentSectionIndex();
        const currentSection = sectionList.querySelector(`[data-section-index="${currentIndex}"]`);
        if (currentSection && typeof currentSection.scrollIntoView === 'function') {
            // Scroll the section into view with smooth behavior
            currentSection.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
            log('Scrolled to section', currentIndex);
        }
    }

    /**
     * Create a clickable section list UI
     * Requirements: 4.3, 4.4
     * @returns {HTMLElement} Section list container element
     */
    function createSectionList() {
        if (!window.currentAgenda) {
            log('Cannot create section list: no agenda available');
            return null;
        }
        
        // Reset highlight tracking when creating new list
        lastHighlightedIndex = -1;
        
        // Create or get existing section list container
        let sectionList = document.querySelector('.section-list');
        if (!sectionList) {
            sectionList = document.createElement('div');
            sectionList.className = 'section-list';
        } else {
            // Clear existing content
            sectionList.innerHTML = '';
        }
        
        // Create section items
        window.currentAgenda.forEach((item, index) => {
            const sectionItem = document.createElement('div');
            sectionItem.className = 'section-item';
            sectionItem.setAttribute('data-section-index', index);
            
            // Create section number
            const sectionNumber = document.createElement('span');
            sectionNumber.className = 'section-number';
            sectionNumber.textContent = (index + 1) + '.';
            
            // Create section text
            const sectionText = document.createElement('span');
            sectionText.className = 'section-text';
            sectionText.textContent = item.text;
            
            // Assemble section item
            sectionItem.appendChild(sectionNumber);
            sectionItem.appendChild(sectionText);
            
            // Add click handler for navigation
            sectionItem.addEventListener('click', () => {
                log('Section clicked:', index);
                jumpToSection(index);
            });
            
            sectionList.appendChild(sectionItem);
        });
        
        // Highlight current section
        highlightCurrentSection();
        
        log('Section list created with', window.currentAgenda.length, 'sections');
        return sectionList;
    }

    /**
     * Initialize the section navigator
     * Sets up event listeners and UI
     */
    function initialize() {
        log('Initializing section navigator...');
        
        // Create section list if agenda is available
        if (window.currentAgenda) {
            const sectionList = createSectionList();
            if (sectionList) {
                // Append to ticker if not already present
                const ticker = document.getElementById('ticker');
                if (ticker && !ticker.querySelector('.section-list')) {
                    ticker.appendChild(sectionList);
                }
            }
        }
        
        log('Section navigator initialized ✓');
    }

    /**
     * Cleanup and reset
     */
    function destroy() {
        const sectionList = document.querySelector('.section-list');
        if (sectionList) {
            sectionList.remove();
        }
        lastHighlightedIndex = -1;
        log('Section navigator destroyed');
    }

    // Public API
    return {
        initialize: initialize,
        destroy: destroy,
        setDebug: setDebug,
        getCurrentSectionIndex: getCurrentSectionIndex,
        getTotalSections: getTotalSections,
        nextSection: nextSection,
        previousSection: previousSection,
        jumpToSection: jumpToSection,
        highlightCurrentSection: highlightCurrentSection,
        scrollToCurrentSection: scrollToCurrentSection,
        createSectionList: createSectionList
    };
})();

// Export for Node.js/testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SectionNavigator;
}
