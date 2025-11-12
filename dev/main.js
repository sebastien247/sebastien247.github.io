const demuxDecodeWorker = new Worker("./async_decoder.js"),
    latestVersion = 2,
    logElement = document.getElementById('log'),
    warningElement = document.getElementById('warning'),
    canvasElement = document.querySelector('canvas'),
    bodyElement = document.querySelector('body'),
    waitingMessageElement = document.getElementById('waiting-message'),
    errorOverlay = document.getElementById('error-overlay'),
    errorMessage = document.getElementById('error-message'),
    supportedWebCodec = true, //ToDo consider if older browser should be supported or not, ones without WebCodec, since Tesla does support this might not be needed.
    DEFAULT_HTTPS_PORT = 8081,
    MAX_PORT_RETRIES = 5;

let zoom = Math.max(1, window.innerHeight / 1080),
    appVersion = 0,
    offscreen = null,
    forcedRefreshCounter = 0,
    debug = false,
    usebt = true,
    width,
    height,
    widthMargin,
    heightMargin,
    controller,
    socket,
    port,
    drageventCounter=0,
    videoFrameReceived = false,
    timeoutId,
    isServerShuttingDown = false; // 🚨 Flag pour éviter les actions en double lors du shutdown

canvasElement.style.display = "none";

/**
 * 🚨 NOUVEAU: Affiche un message d'erreur dans l'overlay permanent
 * @param {string} message - Le message à afficher
 */
function showErrorOverlay(message) {
    if (errorOverlay && errorMessage) {
        errorMessage.textContent = message;
        errorOverlay.style.display = "flex";
    } else {
        console.error('Error overlay elements not found');
    }
}

/**
 * 🚨 NOUVEAU: Cache l'overlay d'erreur
 */
function hideErrorOverlay() {
    if (errorOverlay) {
        errorOverlay.style.display = "none";
    }
}

/**
 * Vérifie si le serveur est accessible
 * @returns {Promise<boolean>} True si le serveur est accessible
 */
async function checkServerReachability() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        // Essayer de ping le serveur principal
        const response = await fetch(`https://taada.top:${DEFAULT_HTTPS_PORT}/getsocketport`, {
            method: 'HEAD',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.log('Server not reachable:', error.message);
        return false;
    }
}

/**
 * Attend que la connexion internet revienne
 * @returns {Promise<void>} Se résout quand la connexion est rétablie
 */
function waitForConnection() {
    return new Promise((resolve) => {
        console.log('Waiting for internet connection...');
        showErrorOverlay("No internet connection. Waiting to reconnect...");

        let checkInterval;
        let isChecking = false;

        // Fonction pour vérifier la connexion
        const checkConnection = async () => {
            // Éviter les vérifications concurrentes
            if (isChecking) return;
            isChecking = true;

            console.log('Checking connection... navigator.onLine =', navigator.onLine);

            if (navigator.onLine) {
                const isReachable = await checkServerReachability();
                console.log('Server reachable:', isReachable);

                if (isReachable) {
                    // Connexion rétablie !
                    if (checkInterval) {
                        clearInterval(checkInterval);
                    }
                    window.removeEventListener('online', checkConnection);
                    showErrorOverlay("Connection restored. Reloading...");
                    resolve();
                }
            }

            isChecking = false;
        };

        // Vérifier périodiquement toutes les 2 secondes
        checkInterval = setInterval(checkConnection, 2000);

        // Écouter aussi l'événement 'online' du navigateur pour réagir rapidement
        window.addEventListener('online', checkConnection);

        // Faire une première vérification immédiate
        checkConnection();
    });
}

/**
 * Recharge la page seulement quand internet est disponible
 * Attend si nécessaire que la connexion revienne
 * @param {string} reason - Raison du rechargement (pour les logs)
 */
async function reloadWhenOnline(reason = 'Unknown') {
    console.log(`Reload requested: ${reason}`);

    // Vérifier d'abord si nous sommes en ligne
    if (navigator.onLine) {
        // Faire un ping réel au serveur pour confirmer
        const isReachable = await checkServerReachability();

        if (isReachable) {
            console.log('Internet available, reloading page');
            location.reload();
            return;
        }
    }

    // Pas de connexion ou serveur injoignable, attendre
    console.log('No connection or server unreachable, waiting...');
    await waitForConnection();

    // Une fois la connexion rétablie, attendre 1 seconde puis recharger
    setTimeout(() => {
        console.log('Connection restored, reloading page');
        location.reload();
    }, 1000);
}

/**
 * Updates the connection progress indicator with step-by-step status
 * @param {number} step - Current step (1, 2, or 3)
 * @param {string} message - Status message to display
 */
function updateConnectionProgress(step, message) {
    const statusText = document.getElementById('connection-status-text');
    const stepElements = {
        1: document.getElementById('step-1'),
        2: document.getElementById('step-2'),
        3: document.getElementById('step-3')
    };

    if (statusText) {
        statusText.textContent = message;
    }

    // Update step indicators
    for (let i = 1; i <= 3; i++) {
        const stepElement = stepElements[i];
        if (!stepElement) continue;

        if (i < step) {
            // Previous steps are completed
            stepElement.classList.remove('active');
            stepElement.classList.add('completed');
        } else if (i === step) {
            // Current step is active
            stepElement.classList.remove('completed');
            stepElement.classList.add('active');
        } else {
            // Future steps are inactive
            stepElement.classList.remove('active', 'completed');
        }
    }
}

/**
 * Converts screen coordinates to canvas coordinates, accounting for canvas position, scaling,
 * and image margins within the canvas
 * @param {number} screenX - The X coordinate on the screen
 * @param {number} screenY - The Y coordinate on the screen
 * @returns {{x: number, y: number}} The converted coordinates relative to the canvas
 */
function convertToCanvasCoordinates(screenX, screenY) {
    // Get the canvas's bounding rectangle, which includes any CSS transformations
    const canvasRect = canvasElement.getBoundingClientRect();
    
    // Calculate the position relative to the canvas's top-left corner
    const canvasRelativeX = screenX - canvasRect.left;
    const canvasRelativeY = screenY - canvasRect.top;
    
    // Taille réelle de l'image (sans les marges internes du canvas)
    const imageWidth = width - (widthMargin || 0);
    const imageHeight = height - (heightMargin || 0);
    
    // Calculer les facteurs de zoom appliqués (même logique que updateCanvasSize)
    const zoomFactorWidth = window.innerWidth / imageWidth;
    const zoomFactorHeight = window.innerHeight / imageHeight;
    const actualZoomFactor = Math.min(zoomFactorWidth, zoomFactorHeight);
    
    // Taille réelle de l'image affichée après zoom
    const displayedImageWidth = imageWidth * actualZoomFactor;
    const displayedImageHeight = imageHeight * actualZoomFactor;
    
    // Calculer les marges d'affichage (bandes noires) autour de l'image
    const displayMarginX = (canvasRect.width - displayedImageWidth) / 2;
    const displayMarginY = (canvasRect.height - displayedImageHeight) / 2;
    
    // Position relative à l'image affichée (en excluant les marges d'affichage)
    const imageRelativeX = canvasRelativeX - displayMarginX;
    const imageRelativeY = canvasRelativeY - displayMarginY;
    
    // Calculer les pourcentages par rapport à la taille de l'image affichée
    const percentX = imageRelativeX / displayedImageWidth;
    const percentY = imageRelativeY / displayedImageHeight;
    
    // Appliquer les pourcentages aux dimensions réelles du canvas et ajouter l'offset des marges internes
    // La marge interne est divisée par 2 car elle est répartie des deux côtés
    const x = Math.floor((widthMargin || 0) / 2 + (percentX * imageWidth));
    const y = Math.floor((heightMargin || 0) / 2 + (percentY * imageHeight));
    
    return { x, y };
}

function handlepossition(possition){
    demuxDecodeWorker.postMessage({
        action: "GPS",
        accuracy: possition.coords.accuracy,
        latitude: possition.coords.latitude,
        longitude: possition.coords.longitude,
        altitude: possition.coords.altitude,
        heading: possition.coords.heading,
        speed: possition.coords.speed
    });
}

function abortFetching() {
    console.log('Now aborting');
    if (controller) {
        controller.abort();
    }
}

/**
 * Essaie de se connecter à un port spécifique
 * @param {number} port - Le port à tester
 * @param {AbortController} controller - Le contrôleur d'abandon
 * @returns {Promise} Promise qui se résout avec les données ou se rejette
 */
async function tryPort(port, controller) {
    const urlToFetch = `https://taada.top:${port}/getsocketport?w=${window.innerWidth}&h=${window.innerHeight}&webcodec=${supportedWebCodec}`;
    
    console.log(`Trying port ${port}...`);
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Timeout on port ${port}`));
        }, 3000); // Timeout plus court par port
        
        fetch(urlToFetch, {method: 'get', signal: controller.signal})
            .then(response => {
                clearTimeout(timeout);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} on port ${port}`);
                }
                return response.text();
            })
            .then(data => {
                if (isJson(data)) {
                    console.log(`Successfully connected to port ${port}`);
                    resolve({data, port});
                } else {
                    reject(new Error(`Invalid response from port ${port}`));
                }
            })
            .catch(error => {
                clearTimeout(timeout);
                reject(error);
            });
    });
}

/**
 * Teste plusieurs ports successivement jusqu'à trouver un serveur
 */
async function checkPhone() {
    console.log('Starting server discovery...');

    // Step 1/3: Server Discovery
    updateConnectionProgress(1, '1/3 - Discovering server...');

    controller = new AbortController();

    try {
        // Essayer chaque port successivement
        for (let i = 0; i < MAX_PORT_RETRIES; i++) {
            const port = DEFAULT_HTTPS_PORT + i;
            
            try {
                const result = await tryPort(port, controller);
                
                // Vérifier si la page est cachée avant de traiter
                if (document.hidden) {
                    setTimeout(() => {
                        checkPhone();
                    }, 2000);
                    return;
                }
                
                // Serveur trouvé, traiter la réponse
                const json = JSON.parse(result.data);

                // Ajouter le port utilisé aux logs pour information
                console.log(`Server found on port ${result.port}, processing response...`);

                // Update progress: Server found, moving to next step
                updateConnectionProgress(1, '1/3 - Server found!');

                postWorkerMessages(json);
                return; // Succès, arrêter la recherche
                
            } catch (error) {
                console.log(`Port ${port} failed: ${error.message}`);
                
                // Continuer avec le port suivant
                if (i === MAX_PORT_RETRIES - 1) {
                    // C'était la dernière tentative
                    throw new Error(`No server found after testing ports ${DEFAULT_HTTPS_PORT} to ${DEFAULT_HTTPS_PORT + MAX_PORT_RETRIES - 1}`);
                }
            }
        }
    } catch (error) {
        console.error('Server discovery failed:', error);
        
        // Afficher un message d'erreur à l'utilisateur
        /*if (warningElement) {
            warningElement.style.display = "block";
            logElement.style.display = "none";
            warningElement.innerText = "Unable to connect to server. Please check that TaaDa is running.";
        }*/
        
        // Réessayer après un délai
        setTimeout(() => {
            /*if (warningElement) {
                warningElement.style.display = "none";
                logElement.style.display = "block";
            }*/
            checkPhone();
        }, 5000);
    }
}

function findGetParameter(parameterName) {
    var result = null,
        tmp = [];
    location.search
        .substring(1)
        .split("&")
        .forEach(function (item) {
            tmp = item.split("=");
            if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
}

/**
 * Ajuste la taille d'affichage du canvas pour maximiser l'utilisation de l'écran
 */
function updateCanvasSize() {
    // Taille réelle de l'image dans le canvas (sans les marges)
    const imageWidth = width - (widthMargin || 0);
    const imageHeight = height - (heightMargin || 0);
    
    // Calculer les facteurs de zoom nécessaires pour chaque dimension
    const zoomFactorWidth = window.innerWidth / imageWidth;
    const zoomFactorHeight = window.innerHeight / imageHeight;
    
    // Choisir le facteur de zoom le plus petit pour que l'image soit entièrement visible
    // (comportement "contain" - l'image remplit au maximum une dimension sans déborder)
    if (zoomFactorWidth <= zoomFactorHeight) {
        // On zoom en largeur : l'image remplira horizontalement, des bandes noires possibles verticalement
        canvasElement.style.width = `${width * zoomFactorWidth}px`;
        canvasElement.style.height = '';
    } else {
        // On zoom en hauteur : l'image remplira verticalement, des bandes noires possibles horizontalement
        canvasElement.style.height = `${height * zoomFactorHeight}px`;
        canvasElement.style.width = '';
    }
}

function postWorkerMessages(json) {  
    if (json.hasOwnProperty("resolutionChanged")) {
        console.log("Resolution adjusted dynamically to " + json.width + "x" + json.height);
        
        // Ajuster le canvas sans recharger la page
        width = json.width;
        height = json.height;

        widthMargin = json.widthMargin;
        heightMargin = json.heightMargin;
        
        // Seul le worker peut mettre à jour le canvas après transferControlToOffscreen
        // Envoyer les deux messages séparément pour plus de clarté
        
        // 1. Informer le worker de la nouvelle résolution du décodeur
        demuxDecodeWorker.postMessage({
            action: "RESIZE", 
            width: width, 
            height: height
        });
        
        // 2. Demander une nouvelle keyframe pour obtenir la bonne résolution
        demuxDecodeWorker.postMessage({
            action: "CLEAR_BUFFERS"
        });
                
        // Afficher un message temporaire
        warningElement.style.display = "block";
        logElement.style.display = "none";
        warningElement.innerText = "Résolution ajustée à " + width + "x" + height;
        setTimeout(function() {
            warningElement.style.display = "none";
            logElement.style.display = "block";
        }, 3000);
    }
    if (json.hasOwnProperty("debug")) {
        debug = json.debug;
    }
    if (json.hasOwnProperty("usebt")) {
        usebt = json.usebt;
    }
    port = json.port;
    if (json.resolution === 2) {
        width = 1920;
        height = 1080;
        
        // Valeurs par défaut pour les marges si non spécifiées
        widthMargin = json.widthMargin || 0;
        heightMargin = json.heightMargin || 0;
        
        updateCanvasSize();
    } else if (json.resolution === 1) {
        width = 1280;
        height = 720;
        
        // Valeurs par défaut pour les marges si non spécifiées
        widthMargin = json.widthMargin || 0;
        heightMargin = json.heightMargin || 0;
        
        updateCanvasSize();
    } else {
        width = 800;
        height = 480;
        
        // Valeurs par défaut pour les marges si non spécifiées
        widthMargin = json.widthMargin || 0;
        heightMargin = json.heightMargin || 0;
        
        updateCanvasSize();
    }

    if (json.hasOwnProperty("buildversion")) {
        appVersion = parseInt(json.buildversion);
        if (latestVersion > parseInt(json.buildversion)) {
            if (parseInt(localStorage.getItem("showupdate")) !== latestVersion) {
                alert("There is a new version in playstore, please update your app.");
                localStorage.setItem("showupdate", latestVersion);
            }
        }
    }

    if (appVersion < 45) {
        alert("You need to run TaaDa 1.5.5 (build 45) or newer to use this page. Your current build is " + appVersion + ", please update.\n\nIf the problem persists, contact me at seb.duboc.dev @ gmail.com");
        //return;
    }

    const forceBroadway = findGetParameter("broadway") === "1";


    canvasElement.width = width;
    canvasElement.height = height;
    
    // Appliquer la transformation d'échelle au conteneur
    //canvasElement.style.transform = "scale(" + zoom + ")";

    // Transfert du contrôle au worker
    offscreen = canvasElement.transferControlToOffscreen();
    
    // Initialiser le worker avec le canvas offscreen
    demuxDecodeWorker.postMessage(
        {canvas: offscreen, port: port, action: 'INIT', appVersion: appVersion, broadway: forceBroadway, width: width, height: height}, 
        [offscreen]
    );

    if (!usebt) //If useBT is disabled start 2 websockets for PCM audio and create audio context
    {
        usebt = json.usebt;
        document.getElementById("muteicon").style.display="block";

    }

    // Show the waiting message after socket port is retrieved
    canvasElement.style.display = "block";
    document.getElementById("info").style.display = "none";

    // Vérifier que waitingMessageElement existe
    if (waitingMessageElement) {
        console.log("Showing waiting message");
        waitingMessageElement.style.display = "flex";
        // Step 2/3: Socket connection will be handled by worker
        updateConnectionProgress(2, '2/3 - Connecting to stream...');
    } else {
        console.error("waitingMessageElement is null, trying to get it again");
        waitingMessageElement = document.getElementById('waiting-message');
        if (waitingMessageElement) {
            console.log("Got waitingMessageElement, showing it");
            waitingMessageElement.style.display = "flex";
            updateConnectionProgress(2, '2/3 - Connecting to stream...');
        } else {
            console.error("waitingMessageElement still not found");
        }
    }

    demuxDecodeWorker.addEventListener("message", function (e) {

        // 🚨 NOUVEAU: Gérer le shutdown du serveur EN PREMIER (priorité maximale)
        if (e.data.hasOwnProperty('serverShutdown')) {
            console.warn('Server shutdown detected:', e.data.reason);

            // Marquer le flag pour éviter les actions en double
            isServerShuttingDown = true;

            // Cacher le message waiting
            if (waitingMessageElement) {
                waitingMessageElement.style.display = "none";
            }

            // 🚨 Afficher l'overlay d'erreur permanent
            showErrorOverlay("Server disconnected. Checking connection...");

            setTimeout(() => {
                reloadWhenOnline('Server shutdown');
            }, 3000);

            return;
        }

        // 🚨 NOUVEAU: Ignorer tous les autres messages si le serveur est en shutdown
        if (isServerShuttingDown) {
            console.log('Server is shutting down, ignoring message:', e.data);
            return;
        }

        if (e.data.hasOwnProperty('error')) {
            console.error('Socket error received:', e.data.error);
            forcedRefreshCounter++;

            // Only reload if error contains critical information
            // Show warning instead for most errors
            if (typeof e.data.error === 'string' &&
                (e.data.error.includes("no pong") ||
                e.data.error === "Reconnecting...")) {

                warningElement.style.display = "block";
                logElement.style.display = "none";
                warningElement.innerText = "Connection issue detected: " + e.data.error;

                // Use a delayed reload to allow logging to appear
                setTimeout(function() {
                    console.log("Reloading page due to connection error");
                    reloadWhenOnline('Connection error: ' + e.data.error);
                }, 2000);
            } else {
                // For less critical errors, just show a warning
                warningElement.style.display = "block";
                logElement.style.display = "none";
                warningElement.innerText = "Error detected: " + e.data.error;
                setTimeout(function() {
                    warningElement.style.display = "none";
                    logElement.style.display = "block";
                }, 5000);
            }
            return;
        }

        // 🚨 NOUVEAU: Gérer la perte de connexion
        if (e.data.hasOwnProperty('connectionLost')) {
            console.error('Connection lost to server:', e.data.reason);

            // Cacher le message waiting
            if (waitingMessageElement) {
                waitingMessageElement.style.display = "none";
            }

            // 🚨 Afficher l'overlay d'erreur permanent
            showErrorOverlay("Connection lost: " + e.data.reason + ". Reconnecting...");

            // Cacher l'overlay après 5 secondes si la reconnexion réussit
            setTimeout(() => {
                if (!isServerShuttingDown) {
                    hideErrorOverlay();
                }
            }, 5000);

            return;
        }

        if (e.data.hasOwnProperty('warning')) {
            warningElement.style.display="block";
            logElement.style.display="none";
            warningElement.innerText=e.data.warning;
            setTimeout(function (){
                warningElement.style.display="none";
                logElement.style.display="block";
            },2000);
        }

        // Handle connection progress updates from worker
        if (e.data.hasOwnProperty('connectionProgress')) {
            const progress = e.data.connectionProgress;
            updateConnectionProgress(progress.step, progress.message);
        }

        // Hide the waiting message when first video frame is received
        if (e.data.hasOwnProperty('videoFrameReceived')) {
            console.log("Video frame received message received!", e.data);
            videoFrameReceived = true;

            // Update to step 3/3 - Stream ready
            updateConnectionProgress(3, '3/3 - Stream ready!');

            // Hide the waiting message after a short delay to show completion
            setTimeout(() => {
                if (waitingMessageElement) {
                    waitingMessageElement.style.display = "none";
                    console.log("Hiding waiting message");
                } else {
                    console.error("waitingMessageElement not found");
                }
            }, 1000);
        }

        if (debug) {
            logElement.innerText = `${height}p - FPS ${e.data.fps}, decoder que: ${e.data.decodeQueueSize}, pendingFrame: ${e.data.pendingFrames}, forced refresh counter: ${forcedRefreshCounter}`;
        }

    });

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        demuxDecodeWorker.postMessage({action: "NIGHT", value: true});
    } else {
        demuxDecodeWorker.postMessage({action: "NIGHT", value: false});
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        demuxDecodeWorker.postMessage({action: "NIGHT", value: event.matches});
    });

    //setInterval(function(){navigator.geolocation.getCurrentPosition(handlepossition);},500);
}

function getLocation() {
    navigator.geolocation.getCurrentPosition(getPosition);
}

function getPosition(pos) {
    clearTimeout(timeoutId);
    socket.send(JSON.stringify({
        action: "GPS",
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        altitude: pos.coords.altitude,
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed
    }));
    timeoutId = setTimeout(getLocation, 250);
}

function isJson(item) {
    item = typeof item !== "string"
        ? JSON.stringify(item)
        : item;
    try {
        item = JSON.parse(item);
    } catch (e) {
        return false;
    }
    return typeof item === "object" && item !== null;
}

// Ajout de variables pour la gestion optimisée des événements tactiles multitouch
let activeTouches = new Map(); // Suivi des touches actives avec leurs IDs
let touchMovePending = false;
let latestTouchData = null;  // Stocke les données converties, pas l'événement
// 4ms (250Hz) → plus fluide mais plus gourmand en ressources
// 8ms (120Hz) → bon équilibre entre fluidité et performance
// 16ms (60Hz) → économie supplémentaire de ressources mais un peu moins fluide

/**
 * Convertit une TouchList en tableau de coordonnées avec leurs IDs
 * @param {TouchList} touchList - Liste des touches
 * @returns {Array} Tableau d'objets {id, x, y}
 */
function convertTouchListToCoords(touchList) {
    const coords = [];
    for (let i = 0; i < touchList.length; i++) {
        const touch = touchList[i];
        const canvasCoords = convertToCanvasCoordinates(touch.clientX, touch.clientY);
        coords.push({
            id: touch.identifier,
            x: canvasCoords.x,
            y: canvasCoords.y
        });
    }
    return coords;
}

/**
 * Initialise l'audio au premier contact tactile si nécessaire
 */
function initializeAudioOnFirstTouch() {
    if (!audiostart && !usebt) {
        mediaPCM = new PCMPlayer({
            encoding: '16bitInt',
            channels: 2,
            sampleRate: 48000
        });
        ttsPCM = new PCMPlayer({
            encoding: '16bitInt',
            channels: 1,
            sampleRate: 16000
        });
        const muteIcon = document.getElementById("muteicon");
        if (muteIcon) {
            muteIcon.remove();
        }
        startAudio();
        audiostart = true;
    }
}

/**
 * Gère l'événement touchstart
 * @param {TouchEvent} event - L'événement tactile
 */
function handleTouchStart(event) {
    event.preventDefault();
    initializeAudioOnFirstTouch();

    const newTouches = convertTouchListToCoords(event.changedTouches);
    newTouches.forEach(touch => activeTouches.set(touch.id, touch));

    const allTouches = convertTouchListToCoords(event.touches);

    // DEBUG: Logs détaillés pour comprendre le problème
    console.log('[MULTITOUCH_DOWN] event.changedTouches.length:', event.changedTouches.length);
    console.log('[MULTITOUCH_DOWN] event.touches.length:', event.touches.length);
    console.log('[MULTITOUCH_DOWN] newTouches:', JSON.stringify(newTouches));
    console.log('[MULTITOUCH_DOWN] allTouches:', JSON.stringify(allTouches));
    console.log('[MULTITOUCH_DOWN] activeTouches.size:', activeTouches.size);

    // Envoyer l'événement multitouch principal
    demuxDecodeWorker.postMessage({
        action: "MULTITOUCH_DOWN",
        touches: newTouches,
        allTouches: allTouches,
        timestamp: performance.now()
    });

    // Note: Les événements legacy (DOWN) ont été supprimés car MULTITOUCH_DOWN
    // gère maintenant à la fois le single touch et le multitouch
}

bodyElement.addEventListener('touchstart', handleTouchStart, { passive: false });

/**
 * Gère les événements touchend et touchcancel
 * @param {TouchEvent} event - L'événement tactile
 */
function handleTouchEnd(event) {
    event.preventDefault();

    // CRITIQUE: Annuler tout MULTITOUCH_MOVE en attente pour éviter le bug "sticky touch"
    // Si un touchmove a programmé un requestAnimationFrame qui n'a pas encore été exécuté,
    // on doit l'empêcher de traiter les anciennes données de touch
    latestTouchData = null;

    const endedTouches = convertTouchListToCoords(event.changedTouches);
    endedTouches.forEach(touch => activeTouches.delete(touch.id));

    const allTouches = convertTouchListToCoords(event.touches);
    const action = event.type === 'touchend' ? 'MULTITOUCH_UP' : 'MULTITOUCH_CANCEL';

    // DEBUG: Logs pour MULTITOUCH_UP/CANCEL
    console.log('[' + action + '] event.changedTouches.length:', event.changedTouches.length);
    console.log('[' + action + '] event.touches.length:', event.touches.length);
    console.log('[' + action + '] endedTouches:', JSON.stringify(endedTouches));
    console.log('[' + action + '] allTouches:', JSON.stringify(allTouches));
    console.log('[' + action + '] activeTouches.size:', activeTouches.size);

    // Envoyer l'événement multitouch principal
    demuxDecodeWorker.postMessage({
        action: action,
        touches: endedTouches,
        allTouches: allTouches,
        timestamp: performance.now()
    });

    // Note: Les événements legacy (UP) ont été supprimés car MULTITOUCH_UP
    // gère maintenant à la fois le single touch et le multitouch
}

bodyElement.addEventListener('touchend', handleTouchEnd, { passive: false });
bodyElement.addEventListener('touchcancel', handleTouchEnd, { passive: false });

/**
 * Boucle de mise à jour optimisée avec requestAnimationFrame
 * N'envoie que le dernier événement tactile avant le prochain rendu du navigateur
 */
function processTouchMove() {
    if (!latestTouchData) {
        touchMovePending = false;
        return;
    }

    const movingTouches = latestTouchData.touches;
    const timestamp = latestTouchData.timestamp;

    // Mettre à jour le suivi des touches actives
    movingTouches.forEach(touch => {
        activeTouches.set(touch.id, touch);
    });

    // DEBUG: Logs pour MULTITOUCH_MOVE
    console.log('[MULTITOUCH_MOVE] movingTouches.length:', movingTouches.length);
    console.log('[MULTITOUCH_MOVE] movingTouches:', JSON.stringify(movingTouches));
    console.log('[MULTITOUCH_MOVE] activeTouches.size:', activeTouches.size);

    // Envoyer l'événement multitouch optimisé
    demuxDecodeWorker.postMessage({
        action: "MULTITOUCH_MOVE",
        touches: movingTouches,
        allTouches: movingTouches,  // CRUCIAL pour le multitouch en binaire !
        timestamp: timestamp
    });

    // Note: Les événements legacy (DRAG) ont été supprimés car MULTITOUCH_MOVE
    // gère maintenant à la fois le single touch et le multitouch

    latestTouchData = null;
    touchMovePending = false;
}

bodyElement.addEventListener('touchmove', (event) => {
    // Convertir les données tactiles IMMÉDIATEMENT pour éviter la mutation de l'événement
    // (le navigateur peut réutiliser l'objet TouchEvent pour des raisons de performance)
    latestTouchData = {
        touches: convertTouchListToCoords(event.touches),
        timestamp: performance.now()
    };

    // Si une mise à jour n'est pas déjà en attente, en programmer une
    if (!touchMovePending) {
        touchMovePending = true;
        requestAnimationFrame(processTouchMove);
    }
});

// Ajouter un écouteur d'événement pour le redimensionnement de la fenêtre
window.addEventListener('resize', () => {
    if (width && height) {
        updateCanvasSize();
    }
});

/**
 * Fonction de test pour simuler des événements multitouch
 * Utilisable depuis la console du navigateur
 */
window.simulateMultitouch = function(testType = 'basic') {
    console.log(`🟢 Simulating multitouch event: ${testType}`);
    
    if (testType === 'basic') {
        // Test basique avec 2 touches
        const touches = [
            { id: 0, x: 100, y: 100 },
            { id: 1, x: 200, y: 200 }
        ];
        
        console.log('📝 Sending MULTITOUCH_DOWN with 2 touches');
        demuxDecodeWorker.postMessage({
            action: "MULTITOUCH_DOWN",
            touches: touches,
            allTouches: touches,
            timestamp: performance.now()
        });
        
        // Simuler un mouvement après 500ms
        setTimeout(() => {
            const movedTouches = [
                { id: 0, x: 150, y: 150 },
                { id: 1, x: 250, y: 250 }
            ];
            console.log('📝 Sending MULTITOUCH_MOVE');
            demuxDecodeWorker.postMessage({
                action: "MULTITOUCH_MOVE",
                touches: movedTouches,
                allTouches: movedTouches,
                timestamp: performance.now()
            });
        }, 500);
        
        // Simuler la fin après 1000ms
        setTimeout(() => {
            console.log('📝 Sending MULTITOUCH_UP');
            demuxDecodeWorker.postMessage({
                action: "MULTITOUCH_UP",
                touches: touches,
                allTouches: [],
                timestamp: performance.now()
            });
        }, 1000);
        
    } else if (testType === 'pinch') {
        // Test de pincement (zoom)
        console.log('📝 Simulating pinch gesture');
        const startTouches = [
            { id: 0, x: 200, y: 200 },
            { id: 1, x: 300, y: 300 }
        ];
        
        demuxDecodeWorker.postMessage({
            action: "MULTITOUCH_DOWN",
            touches: startTouches,
            allTouches: startTouches,
            timestamp: performance.now()
        });
        
        // Simuler le rapprochement des doigts
        let step = 0;
        const pinchInterval = setInterval(() => {
            step++;
            const distance = 100 + (50 - step * 5); // Réduire la distance
            const centerX = 250;
            const centerY = 250;
            
            const pinchTouches = [
                { id: 0, x: centerX - distance/2, y: centerY - distance/2 },
                { id: 1, x: centerX + distance/2, y: centerY + distance/2 }
            ];
            
            console.log(`📝 Pinch step ${step}, distance: ${distance}`);
            demuxDecodeWorker.postMessage({
                action: "MULTITOUCH_MOVE",
                touches: pinchTouches,
                allTouches: pinchTouches,
                timestamp: performance.now()
            });
            
            if (step >= 10) {
                clearInterval(pinchInterval);
                demuxDecodeWorker.postMessage({
                    action: "MULTITOUCH_UP",
                    touches: pinchTouches,
                    allTouches: [],
                    timestamp: performance.now()
                });
                console.log('📝 Pinch gesture completed');
            }
        }, 100);
    }
    
    return true;
};

// Function to display email address only on user click to prevent bot detection
function setupContactLink() {
    const link = document.getElementById('contact-link');
    if (link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const email = 'seb.duboc.dev' + '@' + 'gmail.com';
            this.href = 'mailto:' + email;
            this.textContent = email;
            this.style.textDecoration = 'underline'; // Add underline to the email
            // Remove the click listener to allow normal link behavior
            this.removeEventListener('click', arguments.callee);
        });
    }
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', setupContactLink);
checkPhone();

let audiostart=false;
let mediaPCM;
let ttsPCM;
let mediaPCMSocket;
let ttsPCMSocket;


function startAudio(){
    // Note: port est maintenant le port HTTPS découvert dynamiquement
    // Les ports audio restent relatifs à ce port de base
    mediaPCMSocket = new WebSocket(`wss://taada.top:${port+1}`);
    mediaPCMSocket.binaryType = "arraybuffer";
    mediaPCMSocket.addEventListener('open', () => {
        mediaPCMSocket.binaryType = "arraybuffer";
        console.log(`Media audio connected to port ${port+1}`);
    });
    mediaPCMSocket.addEventListener('message', event =>
    {
        var data = new Uint8Array(event.data);
        mediaPCM.feed(data);
    });

    ttsPCMSocket = new WebSocket(`wss://taada.top:${port+2}`);
    ttsPCMSocket.binaryType = "arraybuffer";
    ttsPCMSocket.addEventListener('open', () => {
        ttsPCMSocket.binaryType = "arraybuffer";
        console.log(`TTS audio connected to port ${port+2}`);
    });
    ttsPCMSocket.addEventListener('message', event =>
    {
        var data = new Uint8Array(event.data);
        ttsPCMSocket.send(JSON.stringify({action:"ACK"}));
        ttsPCM.feed(data);
    });
}
