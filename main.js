const demuxDecodeWorker = new Worker("./async_decoder.js"),
    latestVersion = 2,
    logElement = document.getElementById('log'),
    warningElement = document.getElementById('warning'),
    canvasElement = document.querySelector('canvas'),
    bodyElement = document.querySelector('body'),
    waitingMessageElement = document.getElementById('waiting-message'),
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
    timeoutId;

canvasElement.style.display = "none";

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
                alert("There is a new version in playsotre, please update your app.");
                localStorage.setItem("showupdate", latestVersion);
            }
        }
    }

    if (appVersion <= 37) {
        alert("You need to run TaaDa 1.4.1 or newer to use this page, please update.");
        return;
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
    } else {
        console.error("waitingMessageElement is null, trying to get it again");
        waitingMessageElement = document.getElementById('waiting-message');
        if (waitingMessageElement) {
            console.log("Got waitingMessageElement, showing it");
            waitingMessageElement.style.display = "flex";
        } else {
            console.error("waitingMessageElement still not found");
        }
    }

    demuxDecodeWorker.addEventListener("message", function (e) {

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
                    document.location.reload();
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

        if (e.data.hasOwnProperty('warning')) {
            warningElement.style.display="block";
            logElement.style.display="none";
            warningElement.innerText=e.data.warning;
            setTimeout(function (){
                warningElement.style.display="none";
                logElement.style.display="block";
            },2000);
        }

        // Hide the waiting message when first video frame is received
        if (e.data.hasOwnProperty('videoFrameReceived')) {
            console.log("Video frame received message received!", e.data);
            videoFrameReceived = true;
            if (waitingMessageElement) {
                waitingMessageElement.style.display = "none";
                console.log("Hiding waiting message");
            } else {
                console.error("waitingMessageElement not found");
            }
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

// Ajout de variables pour la gestion optimisée des événements tactiles
let lastTouchMoveTime = 0;

const TOUCH_THROTTLE_MS = 4;
// 4ms (250Hz) → plus fluide mais plus gourmand en ressources
// 8ms (120Hz) → bon équilibre entre fluidité et performance
// 16ms (60Hz) → économie supplémentaire de ressources mais un peu moins fluide

bodyElement.addEventListener('touchstart', (event) => {
    if (!audiostart && !usebt)
    {
        mediaPCM = new PCMPlayer({
            encoding: '16bitInt',
            channels: 2,
            sampleRate: 48000
        });
        ttsPCM= new PCMPlayer({
            encoding: '16bitInt',
            channels: 1,
            sampleRate: 16000
        });
        document.getElementById("muteicon").remove();
        startAudio();
        audiostart=true;
    }
    
    // Utiliser preventDefault pour éviter les délais de clic du navigateur
    event.preventDefault();
    
    // Envoi immédiat sans requestAnimationFrame car ces événements sont critiques
    const coords = convertToCanvasCoordinates(event.touches[0].clientX, event.touches[0].clientY);
    demuxDecodeWorker.postMessage({
        action: "DOWN",
        X: coords.x,
        Y: coords.y,
        timestamp: performance.now()
    });
}, { passive: false }); // Important pour permettre preventDefault

bodyElement.addEventListener('touchend', (event) => {
    // Utiliser preventDefault pour éviter les délais de clic du navigateur
    event.preventDefault();
    
    const coords = convertToCanvasCoordinates(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
    demuxDecodeWorker.postMessage({
        action: "UP",
        X: coords.x,
        Y: coords.y,
        timestamp: performance.now()
    });
}, { passive: false }); // Important pour permettre preventDefault

bodyElement.addEventListener('touchcancel', (event) => {
    if (event.touches.length > 0) {
        const coords = convertToCanvasCoordinates(event.touches[0].clientX, event.touches[0].clientY);
        demuxDecodeWorker.postMessage({
            action: "UP",
            X: coords.x,
            Y: coords.y
        });
    }
});

bodyElement.addEventListener('touchmove', (event) => {
    const now = performance.now();
    // Limiter le nombre d'événements envoyés en fonction du temps écoulé
    if (now - lastTouchMoveTime >= TOUCH_THROTTLE_MS) {
        lastTouchMoveTime = now;
        
        const coords = convertToCanvasCoordinates(event.touches[0].clientX, event.touches[0].clientY);
        demuxDecodeWorker.postMessage({
            action: "DRAG",
            X: coords.x,
            Y: coords.y,
        });
    }
});

// Ajouter un écouteur d'événement pour le redimensionnement de la fenêtre
window.addEventListener('resize', () => {
    if (width && height) {
        updateCanvasSize();
    }
});

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
