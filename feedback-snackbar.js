/**
 * Feedback Snackbar Component for TaaDa
 * Shows a notification in bottom-right corner prompting users to give feedback
 */

const FeedbackSnackbar = (function() {
    // Configuration
    const AUTO_HIDE_DELAY = 10000; // 10 seconds in milliseconds

    const SNOOZE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
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
                <button class="feedback-snackbar-btn feedback-snackbar-btn-icon" id="feedback-snackbar-snooze" aria-label="Remind me next week" title="Remind me next week">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
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
        document.getElementById('feedback-snackbar-snooze').addEventListener('click', handleSnoozeClick);
        document.getElementById('feedback-snackbar-dismiss').addEventListener('click', handleDismissClick);
    }

    /**
     * Show the snackbar with animation
     */
    function show() {
        if (isVisible) return;
        
        // Check for snooze
        const snoozeUntil = localStorage.getItem('feedback_snooze_until');
        if (snoozeUntil && Date.now() < parseInt(snoozeUntil, 10)) {
            console.log('[FeedbackSnackbar] Snoozed until ' + new Date(parseInt(snoozeUntil, 10)).toLocaleString());
            return;
        }

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
     * Handle click on "Snooze" button
     */
    function handleSnoozeClick() {
        const snoozeUntil = Date.now() + SNOOZE_DURATION;
        localStorage.setItem('feedback_snooze_until', snoozeUntil.toString());
        
        console.log('[FeedbackSnackbar] Snoozing until ' + new Date(snoozeUntil).toLocaleString());
        
        hide();
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
