/**
 * Firebase Configuration for TaaDa Feedback System
 * 
 * IMPORTANT: Replace the placeholder values below with your actual Firebase project credentials.
 * You can find these in the Firebase Console > Project Settings > General > Your apps > Web app
 */

// Firebase configuration object
// TODO: Replace with your actual Firebase credentials
const firebaseConfig = {
    apiKey: "AIzaSyCJkxfhAFhVhOctq216oCKqvHAg__pYFXo",
    authDomain: "taada-bba92.firebaseapp.com",
    projectId: "taada-bba92",
    storageBucket: "taada-bba92.firebasestorage.app",
    messagingSenderId: "1036844774925",
    appId: "1:1036844774925:web:79d3aea7dc7eea52360744",
    measurementId: "G-G3NMHSJ3JS"
};

// Firebase module references (will be set after SDK loads)
let firebaseApp = null;
let firestoreDb = null;

/**
 * Initialize Firebase with the configuration
 * Called after Firebase SDK is loaded
 */
function initializeFirebase() {
    try {
        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            console.error('[Firebase] SDK not loaded');
            return false;
        }

        // Check if already initialized
        if (firebaseApp) {
            console.log('[Firebase] Already initialized');
            return true;
        }

        // Initialize Firebase app
        firebaseApp = firebase.initializeApp(firebaseConfig);
        
        // Initialize Firestore
        firestoreDb = firebase.firestore();

        console.log('[Firebase] Initialized successfully');
        return true;
    } catch (error) {
        console.error('[Firebase] Initialization error:', error);
        return false;
    }
}

/**
 * Get Firestore database instance
 * @returns {firebase.firestore.Firestore|null} Firestore instance or null if not initialized
 */
function getFirestoreDb() {
    if (!firestoreDb) {
        console.warn('[Firebase] Firestore not initialized. Call initializeFirebase() first.');
    }
    return firestoreDb;
}

/**
 * Check if Firebase is properly configured (not using placeholder values)
 * @returns {boolean} True if configured with real credentials
 */
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY" && 
           firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

// Export for use in other modules
window.FirebaseConfig = {
    init: initializeFirebase,
    getDb: getFirestoreDb,
    isConfigured: isFirebaseConfigured
};
