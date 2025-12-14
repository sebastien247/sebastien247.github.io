/**
 * Feedback Dialog Component for TaaDa
 * Modal overlay with feedback form including star rating, category, message, and optional email
 */

const FeedbackDialog = (function() {
    // State
    let dialogElement = null;
    let isOpen = false;
    let currentRating = 0;

    // Categories available for feedback
    const CATEGORIES = [
        { value: '', label: 'Select a category...' },
        { value: 'bug', label: '🐛 Bug Report' },
        { value: 'feature', label: '💡 Feature Request' },
        { value: 'performance', label: '⚡ Performance Issue' },
        { value: 'ui', label: '🎨 UI/UX Feedback' },
        { value: 'general', label: '💬 General Feedback' }
    ];

    /**
     * Create the dialog HTML element
     */
    function createDialog() {
        // Check if already exists
        if (document.getElementById('feedback-dialog')) {
            dialogElement = document.getElementById('feedback-dialog');
            return;
        }

        const categoryOptions = CATEGORIES.map(cat => 
            `<option value="${cat.value}">${cat.label}</option>`
        ).join('');

        const dialog = document.createElement('div');
        dialog.id = 'feedback-dialog';
        dialog.className = 'feedback-dialog-overlay';
        dialog.innerHTML = `
            <div class="feedback-dialog" role="dialog" aria-labelledby="feedback-dialog-title" aria-modal="true">
                <div class="feedback-dialog-header">
                    <h2 id="feedback-dialog-title">Share Your Feedback</h2>
                    <button class="feedback-dialog-close" id="feedback-dialog-close" aria-label="Close dialog">
                        ✕
                    </button>
                </div>

                <form id="feedback-form" class="feedback-dialog-form">
                    <!-- Star Rating -->
                    <div class="feedback-form-group">
                        <label class="feedback-form-label">How would you rate TaaDa?</label>
                        <div class="feedback-star-rating" id="feedback-star-rating">
                            <button type="button" class="feedback-star" data-rating="1" aria-label="1 star">★</button>
                            <button type="button" class="feedback-star" data-rating="2" aria-label="2 stars">★</button>
                            <button type="button" class="feedback-star" data-rating="3" aria-label="3 stars">★</button>
                            <button type="button" class="feedback-star" data-rating="4" aria-label="4 stars">★</button>
                            <button type="button" class="feedback-star" data-rating="5" aria-label="5 stars">★</button>
                        </div>
                        <span class="feedback-rating-text" id="feedback-rating-text"></span>
                    </div>

                    <!-- Category -->
                    <div class="feedback-form-group">
                        <label class="feedback-form-label" for="feedback-category">Category</label>
                        <select id="feedback-category" class="feedback-form-select" required>
                            ${categoryOptions}
                        </select>
                    </div>

                    <!-- Message -->
                    <div class="feedback-form-group">
                        <label class="feedback-form-label" for="feedback-message">Your feedback</label>
                        <textarea 
                            id="feedback-message" 
                            class="feedback-form-textarea" 
                            placeholder="Tell us what you think... What's working well? What could be improved?"
                            rows="4"
                            maxlength="2000"
                        ></textarea>
                        <span class="feedback-char-count" id="feedback-char-count">0 / 2000</span>
                    </div>

                    <!-- Email (optional) -->
                    <div class="feedback-form-group">
                        <label class="feedback-form-label" for="feedback-email">
                            Email <span class="feedback-form-optional">(optional - for follow-up)</span>
                        </label>
                        <input 
                            type="email" 
                            id="feedback-email" 
                            class="feedback-form-input" 
                            placeholder="your@email.com"
                        />
                    </div>

                    <!-- Error message -->
                    <div class="feedback-form-error" id="feedback-form-error" style="display: none;"></div>

                    <!-- Submit button -->
                    <div class="feedback-form-actions">
                        <button type="button" class="feedback-btn feedback-btn-secondary" id="feedback-cancel">
                            Cancel
                        </button>
                        <button type="submit" class="feedback-btn feedback-btn-primary" id="feedback-submit">
                            <span class="feedback-btn-text">Send Feedback</span>
                            <span class="feedback-btn-loading" style="display: none;">
                                <span class="feedback-spinner"></span>
                                Sending...
                            </span>
                        </button>
                    </div>
                </form>

                <!-- Success state -->
                <div class="feedback-dialog-success" id="feedback-success" style="display: none;">
                    <div class="feedback-success-icon">✓</div>
                    <h3>Thank you!</h3>
                    <p>Your feedback has been submitted successfully.</p>
                    <button class="feedback-btn feedback-btn-primary" id="feedback-success-close">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        dialogElement = dialog;

        // Prevent touch events from bubbling to the body
        ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mouseup', 'mousemove', 'click'].forEach(eventType => {
            dialog.addEventListener(eventType, (e) => {
                e.stopPropagation();
            }, { passive: false });
        });

        // Attach event listeners
        attachEventListeners();
    }

    /**
     * Attach event listeners to dialog elements
     */
    function attachEventListeners() {
        // Close buttons
        document.getElementById('feedback-dialog-close').addEventListener('click', close);
        document.getElementById('feedback-cancel').addEventListener('click', close);
        document.getElementById('feedback-success-close').addEventListener('click', close);

        // Click outside to close
        dialogElement.addEventListener('click', function(e) {
            if (e.target === dialogElement) {
                close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isOpen) {
                close();
            }
        });

        // Star rating
        const stars = document.querySelectorAll('.feedback-star');
        stars.forEach(star => {
            star.addEventListener('click', function() {
                setRating(parseInt(this.dataset.rating));
            });
            star.addEventListener('mouseenter', function() {
                highlightStars(parseInt(this.dataset.rating));
            });
        });

        document.getElementById('feedback-star-rating').addEventListener('mouseleave', function() {
            highlightStars(currentRating);
        });

        // Character count
        document.getElementById('feedback-message').addEventListener('input', updateCharCount);

        // Form submission
        document.getElementById('feedback-form').addEventListener('submit', handleSubmit);
    }

    /**
     * Set the rating value
     */
    function setRating(rating) {
        currentRating = rating;
        highlightStars(rating);
        updateRatingText(rating);
    }

    /**
     * Highlight stars up to the given rating
     */
    function highlightStars(rating) {
        const stars = document.querySelectorAll('.feedback-star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    /**
     * Update rating text description
     */
    function updateRatingText(rating) {
        const texts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        document.getElementById('feedback-rating-text').textContent = texts[rating] || '';
    }

    /**
     * Update character count display
     */
    function updateCharCount() {
        const textarea = document.getElementById('feedback-message');
        const count = textarea.value.length;
        document.getElementById('feedback-char-count').textContent = `${count} / 2000`;
    }

    /**
     * Show error message
     */
    function showError(message) {
        const errorEl = document.getElementById('feedback-form-error');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    /**
     * Hide error message
     */
    function hideError() {
        document.getElementById('feedback-form-error').style.display = 'none';
    }

    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();
        hideError();

        // Get form data
        const feedbackData = {
            rating: currentRating,
            category: document.getElementById('feedback-category').value,
            message: document.getElementById('feedback-message').value.trim(),
            email: document.getElementById('feedback-email').value.trim()
        };

        // Validate
        const validation = window.FeedbackService.validate(feedbackData);
        if (!validation.valid) {
            showError(validation.errors.join('. '));
            return;
        }

        // Submit
        setSubmitLoading(true);

        try {
            const result = await window.FeedbackService.submit(feedbackData);
            
            if (result.success) {
                showSuccess();
            } else {
                showError(result.message);
            }
        } catch (error) {
            showError('An unexpected error occurred. Please try again.');
            console.error('[FeedbackDialog] Submit error:', error);
        } finally {
            setSubmitLoading(false);
        }
    }

    /**
     * Set submit button loading state
     */
    function setSubmitLoading(loading) {
        const btn = document.getElementById('feedback-submit');
        const textEl = btn.querySelector('.feedback-btn-text');
        const loadingEl = btn.querySelector('.feedback-btn-loading');

        btn.disabled = loading;
        textEl.style.display = loading ? 'none' : '';
        loadingEl.style.display = loading ? 'inline-flex' : 'none';
    }

    /**
     * Show success state
     */
    function showSuccess() {
        document.getElementById('feedback-form').style.display = 'none';
        document.getElementById('feedback-success').style.display = 'flex';
    }

    /**
     * Reset form to initial state
     */
    function resetForm() {
        document.getElementById('feedback-form').reset();
        document.getElementById('feedback-form').style.display = 'block';
        document.getElementById('feedback-success').style.display = 'none';
        currentRating = 0;
        highlightStars(0);
        updateRatingText(0);
        updateCharCount();
        hideError();
    }

    /**
     * Open the dialog
     */
    function open() {
        if (isOpen) return;

        createDialog();
        resetForm();

        requestAnimationFrame(() => {
            dialogElement.classList.add('feedback-dialog-open');
        });

        isOpen = true;
        document.body.style.overflow = 'hidden'; // Prevent background scroll

        console.log('[FeedbackDialog] Opened');
    }

    /**
     * Close the dialog
     */
    function close() {
        if (!isOpen || !dialogElement) return;

        dialogElement.classList.remove('feedback-dialog-open');
        isOpen = false;
        document.body.style.overflow = ''; // Restore scroll

        console.log('[FeedbackDialog] Closed');
    }

    // Public API
    return {
        open: open,
        close: close,
        isOpen: function() { return isOpen; }
    };
})();

// Export for global access
window.FeedbackDialog = FeedbackDialog;
