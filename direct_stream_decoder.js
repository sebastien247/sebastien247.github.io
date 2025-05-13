/**
 * Décodeur de flux vidéo direct pour TaaDa
 * 
 * Ce script gère la réception et le décodage des flux vidéo bruts 
 * envoyés directement depuis l'application Android sans traitement intermédiaire.
 */

// Configuration
const HEADER_SIZE = 4; // Taille de l'en-tête pour la longueur des métadonnées (octets)
const MAX_BACKLOG = 5; // Nombre maximum de frames en file d'attente avant d'envoyer un ACK

// Statistiques
let framesReceived = 0;
let framesDecoded = 0;
let codecErrors = 0;
let lastStatsTime = performance.now();
let fps = 0;
let decodeFps = 0;

// État du décodeur
let videoDecoder = null;
let fallbackDecoder = null;
let useHardwareDecoder = true;
let isDecoderConfigured = false;
let decoderConfig = null;
let pendingFrames = [];
let isDecoding = false;
let codecType = 'avc'; // par défaut H.264
let onStatusCallback = null;
let onFrameCallback = null;
let underflow = true;

/**
 * Initialise le décodeur de flux vidéo direct
 * 
 * @param {Function} onFrame Callback appelé avec la frame décodée
 * @param {Function} onStatus Callback appelé avec les mises à jour d'état
 * @param {boolean} forceSoftwareDecoder Force l'utilisation du décodeur logiciel
 */
function initDirectDecoder(onFrame, onStatus, forceSoftwareDecoder = false) {
    onFrameCallback = onFrame;
    onStatusCallback = onStatus;
    useHardwareDecoder = !forceSoftwareDecoder;

    // Réinitialiser les compteurs
    framesReceived = 0;
    framesDecoded = 0;
    codecErrors = 0;
    
    // Initialiser un intervalle pour les statistiques
    setInterval(() => {
        const now = performance.now();
        const elapsed = (now - lastStatsTime) / 1000; // en secondes
        
        if (elapsed > 0) {
            fps = framesReceived / elapsed;
            decodeFps = framesDecoded / elapsed;
            
            // Remettre les compteurs à zéro
            framesReceived = 0;
            framesDecoded = 0;
            lastStatsTime = now;
            
            // Envoyer les stats au callback
            if (onStatusCallback) {
                onStatusCallback({
                    fps: fps.toFixed(1),
                    decodeFps: decodeFps.toFixed(1),
                    pendingFrames: pendingFrames.length,
                    codecErrors: codecErrors,
                    codecType: codecType,
                    hardwareDecoder: useHardwareDecoder && videoDecoder !== null
                });
            }
        }
    }, 1000);
    
    // Tenter d'initialiser le décodeur hardware
    if (useHardwareDecoder) {
        try {
            initHardwareDecoder();
        } catch (e) {
            console.error("Failed to initialize hardware decoder:", e);
            useHardwareDecoder = false;
            
            // Fallback au décodeur logiciel
            if (typeof Decoder !== 'undefined') {
                initSoftwareDecoder();
            } else {
                console.error("Decoder.js not loaded, cannot initialize software decoder");
                if (onStatusCallback) {
                    onStatusCallback({
                        error: "No video decoder available. Please check browser compatibility."
                    });
                }
            }
        }
    } else {
        initSoftwareDecoder();
    }
    
    return {
        processMessage: processMessage,
        close: closeDecoder
    };
}

/**
 * Initialise le décodeur matériel en utilisant l'API WebCodecs
 */
function initHardwareDecoder() {
    if (typeof VideoDecoder === 'undefined') {
        throw new Error("WebCodecs API is not available in this browser");
    }
    
    videoDecoder = new VideoDecoder({
        output: (frame) => {
            framesDecoded++;
            pendingFrames.push(frame);
            if (underflow) {
                renderNextFrame();
            }
        },
        error: (e) => {
            console.error("Hardware decoder error:", e);
            codecErrors++;
            
            // Si le décodeur hardware échoue, revenir au décodeur logiciel
            useHardwareDecoder = false;
            if (videoDecoder) {
                try {
                    videoDecoder.close();
                } catch (e) {}
                videoDecoder = null;
            }
            
            initSoftwareDecoder();
        }
    });
    
    console.log("Hardware decoder initialized");
}

/**
 * Initialise le décodeur logiciel Broadway
 */
function initSoftwareDecoder() {
    if (typeof Decoder === 'undefined') {
        throw new Error("Broadway Decoder is not available");
    }
    
    fallbackDecoder = new Decoder({rgb: true});
    fallbackDecoder.onPictureDecoded = function(buffer, width, height) {
        framesDecoded++;
        
        // Créer un objet similaire à VideoFrame pour compatibilité avec l'API unifiée
        const frameData = {
            data: buffer,
            width: width,
            height: height,
            format: 'RGBA',
            timestamp: performance.now(),
            duration: 0,
            close: function() {} // fonction factice pour compatibilité
        };
        
        pendingFrames.push(frameData);
        if (underflow) {
            renderNextFrame();
        }
    };
    
    console.log("Software decoder initialized");
}

/**
 * Traite un message WebSocket contenant des données vidéo directes
 * 
 * @param {ArrayBuffer} data Données binaires reçues du WebSocket
 * @returns {boolean} true si les données ont été traitées avec succès
 */
function processMessage(data) {
    try {
        const buffer = new Uint8Array(data);
        
        // Vérifier si le message est trop petit pour contenir un en-tête
        if (buffer.length < HEADER_SIZE) {
            console.warn("Received message too small, ignoring");
            return false;
        }
        
        // Extraire la taille des métadonnées (4 octets en big-endian)
        const metadataSize = (buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3];
        
        // Vérifier si le message est trop petit pour contenir les métadonnées
        if (buffer.length < HEADER_SIZE + metadataSize) {
            console.warn("Received message too small for metadata, ignoring");
            return false;
        }
        
        // Extraire et analyser les métadonnées JSON
        const metadataBytes = buffer.slice(HEADER_SIZE, HEADER_SIZE + metadataSize);
        const metadataString = new TextDecoder().decode(metadataBytes);
        const metadata = JSON.parse(metadataString);
        
        // Extraire les données vidéo brutes
        const videoData = buffer.slice(HEADER_SIZE + metadataSize);
        
        // Incrémenter le compteur de frames reçues
        framesReceived++;
        
        // Traiter les données selon le type de message
        if (metadata.mediaMessageId === 36) { // MEDIA_MESSAGE_CODEC_CONFIG
            handleCodecConfig(videoData, metadata);
        } else if (metadata.mediaMessageId === 35) { // MEDIA_MESSAGE_DATA
            handleFrameData(videoData, metadata);
        } else {
            console.warn("Unknown media message ID:", metadata.mediaMessageId);
            return false;
        }
        
        // Si la file d'attente est courte, demander plus de données
        if (pendingFrames.length <= MAX_BACKLOG) {
            return true; // Indique qu'un ACK devrait être envoyé
        }
        
        return false;
    } catch (e) {
        console.error("Error processing direct stream message:", e);
        return false;
    }
}

/**
 * Gère les données de configuration du codec
 * 
 * @param {Uint8Array} data Données de configuration
 * @param {Object} metadata Métadonnées associées
 */
function handleCodecConfig(data, metadata) {
    // Déterminer le type de codec en examinant les données
    const isAVC = containsStartCode(data);
    codecType = isAVC ? 'avc' : 'hevc'; // H.264 ou H.265
    
    console.log("Received codec config, type:", codecType);
    
    if (useHardwareDecoder && videoDecoder) {
        try {
            // Créer la configuration adaptée au type de codec
            decoderConfig = {
                codec: isAVC ? 'avc1.640028' : 'hev1.1.6.L93.B0',
                description: data,
                codedWidth: 1920, // Valeurs par défaut, seront mises à jour avec la première frame
                codedHeight: 1080
            };
            
            // Configurer le décodeur si nécessaire
            if (videoDecoder.state === 'configured') {
                videoDecoder.reset();
            }
            
            videoDecoder.configure(decoderConfig);
            isDecoderConfigured = true;
            console.log("Hardware decoder configured:", decoderConfig);
            
        } catch (e) {
            console.error("Error configuring decoder:", e);
            codecErrors++;
        }
    } else if (fallbackDecoder) {
        // Pour le décodeur logiciel, envoyer directement les données de configuration
        try {
            fallbackDecoder.decode(data);
        } catch (e) {
            console.error("Error in software decoder config:", e);
            codecErrors++;
        }
    }
}

/**
 * Vérifie si les données contiennent un code de début d'unité NAL H.264
 * 
 * @param {Uint8Array} data Données à vérifier
 * @returns {boolean} true si un code de début a été trouvé
 */
function containsStartCode(data) {
    for (let i = 0; i < data.length - 3; i++) {
        if (data[i] === 0 && data[i+1] === 0 && data[i+2] === 0 && data[i+3] === 1) {
            return true;
        }
    }
    return false;
}

/**
 * Gère les données d'une frame vidéo
 * 
 * @param {Uint8Array} data Données de la frame
 * @param {Object} metadata Métadonnées associées
 */
function handleFrameData(data, metadata) {
    const timestamp = metadata.timestamp || performance.now();
    
    if (useHardwareDecoder && videoDecoder && isDecoderConfigured) {
        try {
            // Créer une instance EncodedVideoChunk pour le décodeur hardware
            const chunk = new EncodedVideoChunk({
                type: 'key', // Par défaut, considérer comme keyframe
                timestamp: timestamp,
                duration: 0, // Durée inconnue
                data: data
            });
            
            // Envoyer la chunk au décodeur
            videoDecoder.decode(chunk);
        } catch (e) {
            console.error("Error decoding frame with hardware:", e);
            codecErrors++;
            
            // Si le décodeur hardware échoue, essayer avec le décodeur logiciel
            if (fallbackDecoder) {
                try {
                    fallbackDecoder.decode(data);
                } catch (e2) {
                    console.error("Error in fallback decoder:", e2);
                }
            }
        }
    } else if (fallbackDecoder) {
        // Utiliser directement le décodeur logiciel
        try {
            fallbackDecoder.decode(data);
        } catch (e) {
            console.error("Error in software decoder:", e);
            codecErrors++;
        }
    }
}

/**
 * Rend la prochaine frame disponible
 */
function renderNextFrame() {
    underflow = pendingFrames.length === 0;
    if (underflow) {
        return;
    }
    
    const frame = pendingFrames.shift();
    
    if (onFrameCallback) {
        onFrameCallback(frame);
    }
    
    // Si d'autres frames sont disponibles, continuer le rendu
    if (pendingFrames.length > 0) {
        setTimeout(renderNextFrame, 0);
    }
}

/**
 * Ferme proprement les décodeurs
 */
function closeDecoder() {
    if (videoDecoder) {
        try {
            videoDecoder.close();
        } catch (e) {}
        videoDecoder = null;
    }
    
    fallbackDecoder = null;
    pendingFrames = [];
}

// Exporter les fonctions pour usage externe
self.DirectStreamDecoder = {
    init: initDirectDecoder
}; 