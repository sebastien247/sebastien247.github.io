/**
 * Feedback Service for TaaDa
 * Handles submission of user feedback to Firebase Firestore
 */

const FeedbackService = (function() {
    // Firestore collection name
    const COLLECTION_NAME = 'feedback';

    /**
     * Submit feedback to Firestore
     * @param {Object} feedbackData - The feedback data to submit
     * @param {number} feedbackData.rating - Star rating (1-5)
     * @param {string} feedbackData.category - Feedback category
     * @param {string} feedbackData.message - Detailed feedback message
     * @param {string} [feedbackData.email] - Optional email for follow-up
     * @returns {Promise<{success: boolean, message: string, id?: string}>}
     */
    async function submitFeedback(feedbackData) {
        try {
            // Check if Firebase is configured
            if (!window.FirebaseConfig || !window.FirebaseConfig.isConfigured()) {
                console.warn('[FeedbackService] Firebase not configured - feedback will be logged only');
                console.log('[FeedbackService] Would submit:', feedbackData);
                
                // Return success for demo purposes when not configured
                return {
                    success: true,
                    message: 'Feedback logged (Firebase not configured)',
                    demo: true
                };
            }

            // Get Firestore instance
            const db = window.FirebaseConfig.getDb();
            if (!db) {
                throw new Error('Firestore not available');
            }

            // Prepare the document with metadata
            const feedbackDocument = {
                // User feedback data
                rating: feedbackData.rating,
                category: feedbackData.category,
                message: feedbackData.message || '',
                email: feedbackData.email || null,

                // Automatic metadata
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                windowSize: `${window.innerWidth}x${window.innerHeight}`,
                language: navigator.language,
                platform: navigator.platform,
                referrer: document.referrer || null,
                url: window.location.href
            };

            // Submit to Firestore
            const docRef = await db.collection(COLLECTION_NAME).add(feedbackDocument);

            console.log('[FeedbackService] Feedback submitted with ID:', docRef.id);

            return {
                success: true,
                message: 'Thank you for your feedback!',
                id: docRef.id
            };

        } catch (error) {
            console.error('[FeedbackService] Error submitting feedback:', error);

            return {
                success: false,
                message: 'Failed to submit feedback. Please try again later.',
                error: error.message
            };
        }
    }

    /**
     * Validate feedback data before submission
     * @param {Object} feedbackData - The feedback data to validate
     * @returns {{valid: boolean, errors: string[]}}
     */
    function validateFeedback(feedbackData) {
        const errors = [];

        // Rating is required and must be 1-5
        if (!feedbackData.rating || feedbackData.rating < 1 || feedbackData.rating > 5) {
            errors.push('Please select a rating (1-5 stars)');
        }

        // Category is required
        if (!feedbackData.category || feedbackData.category.trim() === '') {
            errors.push('Please select a category');
        }

        // Message should have some content (optional but recommended)
        if (feedbackData.message && feedbackData.message.length > 2000) {
            errors.push('Message is too long (max 2000 characters)');
        }

        // Email validation if provided
        if (feedbackData.email && feedbackData.email.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(feedbackData.email)) {
                errors.push('Please enter a valid email address');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // Public API
    return {
        submit: submitFeedback,
        validate: validateFeedback
    };
})();

// Export for global access
window.FeedbackService = FeedbackService;
