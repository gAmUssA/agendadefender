/**
 * Controls Dimmer - Auto-dims ticker controls after inactivity
 * Dims the controls panel after 3 seconds of no button clicks
 * Restores visibility on mouse hover
 */
(function() {
    'use strict';

    const INACTIVITY_TIMEOUT = 3000; // 3 seconds
    let dimTimer = null;
    let controlsElement = null;

    function resetDimTimer() {
        // Clear existing timer
        if (dimTimer) {
            clearTimeout(dimTimer);
        }
        
        // Remove dimmed state
        if (controlsElement) {
            controlsElement.classList.remove('dimmed');
        }
        
        // Start new timer
        dimTimer = setTimeout(function() {
            if (controlsElement) {
                controlsElement.classList.add('dimmed');
            }
        }, INACTIVITY_TIMEOUT);
    }

    function init() {
        controlsElement = document.getElementById('ticker-controls');
        if (!controlsElement) return;

        // Reset timer on any button click within controls
        controlsElement.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('a')) {
                resetDimTimer();
            }
        });

        // Also reset on mouseenter to ensure controls stay visible while interacting
        controlsElement.addEventListener('mouseenter', function() {
            if (dimTimer) {
                clearTimeout(dimTimer);
            }
            controlsElement.classList.remove('dimmed');
        });

        // Start dim timer when mouse leaves
        controlsElement.addEventListener('mouseleave', function() {
            resetDimTimer();
        });
    }

    // Start dim timer when ticker becomes visible
    function startDimming() {
        resetDimTimer();
    }

    // Stop dimming and clear timer when ticker is hidden
    function stopDimming() {
        if (dimTimer) {
            clearTimeout(dimTimer);
            dimTimer = null;
        }
        if (controlsElement) {
            controlsElement.classList.remove('dimmed');
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for use by other modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { startDimming, stopDimming, resetDimTimer };
    } else {
        window.ControlsDimmer = { startDimming, stopDimming, resetDimTimer };
    }
})();
