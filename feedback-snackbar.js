/**
 * Feedback Snackbar Component for TaaDa
 * Shows a notification in bottom-right corner prompting users to give feedback
 */

const FeedbackSnackbar = (function() {
    // Configuration
    const AUTO_HIDE_DELAY = 10000; // 10 seconds in milliseconds
    const ANIMATION_DURATION = 300; // ms

    // State
    let snackbarElement = null;
    let hideTimeout = null;
    let isVisible = false;

    /**
     * Create the snackbar HTML element
     */
    function createSnackbar() {
        // Check if already exists
        if (document.getElementById('feedback-snackbar')) {
            snackbarElement = document.getElementById('feedback-snackbar');
            return;
        }

        const snackbar = document.createElement('div');
        snackbar.id = 'feedback-snackbar';
        snackbar.className = 'feedback-snackbar';
        snackbar.innerHTML = `
            <div class="feedback-snackbar-content">
                <div class="feedback-snackbar-icon">💬</div>
                <div class="feedback-snackbar-text">
                    <span class="feedback-snackbar-title">How's your experience?</span>
                    <span class="feedback-snackbar-subtitle">Help us improve TaaDa</span>
                </div>
            </div>
            <div class="feedback-snackbar-actions">
                <button class="feedback-snackbar-btn feedback-snackbar-btn-primary" id="feedback-snackbar-open">
                    Give Feedback
                </button>
                <button class="feedback-snackbar-btn feedback-snackbar-btn-dismiss" id="feedback-snackbar-dismiss" aria-label="Dismiss">
                    ✕
                </button>
            </div>
            <div class="feedback-snackbar-timer" id="feedback-snackbar-timer"></div>
        `;

        document.body.appendChild(snackbar);
        snackbarElement = snackbar;

        // Prevent touch events from bubbling to the body (which handles Android Auto stream interactions)
        // Only stopping touch events because main.js only listens to touch events.
        ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(eventType => {
            snackbar.addEventListener(eventType, (e) => {
                e.stopPropagation();
            }, { passive: false });
        });

        // Attach event listeners
        document.getElementById('feedback-snackbar-open').addEventListener('click', handleOpenClick);
        document.getElementById('feedback-snackbar-dismiss').addEventListener('click', handleDismissClick);
    }

    /**
     * Show the snackbar with animation
     */
    function show() {
        if (isVisible) return;

        createSnackbar();

        // Trigger animation
        requestAnimationFrame(() => {
            snackbarElement.classList.add('feedback-snackbar-visible');
        });

        isVisible = true;

        // Start auto-hide timer
        startAutoHideTimer();

        console.log('[FeedbackSnackbar] Shown');
    }

    /**
     * Hide the snackbar with animation
     */
    function hide() {
        if (!isVisible || !snackbarElement) return;

        clearAutoHideTimer();

        snackbarElement.classList.remove('feedback-snackbar-visible');
        snackbarElement.classList.add('feedback-snackbar-hiding');

        // Remove element after animation
        setTimeout(() => {
            if (snackbarElement) {
                snackbarElement.classList.remove('feedback-snackbar-hiding');
            }
        }, ANIMATION_DURATION);

        isVisible = false;

        console.log('[FeedbackSnackbar] Hidden');
    }

    /**
     * Start the auto-hide timer with visual indicator
     */
    function startAutoHideTimer() {
        clearAutoHideTimer();

        const timerBar = document.getElementById('feedback-snackbar-timer');
        if (timerBar) {
            timerBar.style.animation = `feedbackTimerProgress ${AUTO_HIDE_DELAY}ms linear forwards`;
        }

        hideTimeout = setTimeout(() => {
            hide();
        }, AUTO_HIDE_DELAY);
    }

    /**
     * Clear the auto-hide timer
     */
    function clearAutoHideTimer() {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }

        const timerBar = document.getElementById('feedback-snackbar-timer');
        if (timerBar) {
            timerBar.style.animation = 'none';
        }
    }

    /**
     * Handle click on "Give Feedback" button
     */
    function handleOpenClick() {
        hide();
        
        // Open the feedback dialog
        if (window.FeedbackDialog && typeof window.FeedbackDialog.open === 'function') {
            window.FeedbackDialog.open();
        } else {
            console.error('[FeedbackSnackbar] FeedbackDialog not available');
        }
    }

    /**
     * Handle click on dismiss button
     */
    function handleDismissClick() {
        hide();
    }

    /**
     * Check if snackbar is currently visible
     */
    function getIsVisible() {
        return isVisible;
    }

    // Public API
    return {
        show: show,
        hide: hide,
        isVisible: getIsVisible
    };
})();

// Export for global access
window.FeedbackSnackbar = FeedbackSnackbar;

// Auto-show on page load after a short delay
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to not interfere with initial page load
    setTimeout(() => {
        FeedbackSnackbar.show();
    }, 2000); // Show after 2 seconds
});
