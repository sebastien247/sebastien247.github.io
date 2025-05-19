const demuxDecodeWorker = new Worker("./async_decoder.js"),
    latestVersion = 2,
    logElement = document.getElementById('log'),
    warningElement = document.getElementById('warning'),
    canvasElement = document.querySelector('canvas'),
    bodyElement = document.querySelector('body'),
    supportedWebCodec = true, //ToDo consider if older browser should be supported or not, ones without WebCodec, since Tesla does support this might not be needed.
    urlToFetch = `https://taada.top:8081/getsocketport?w=${window.innerWidth}&h=${window.innerHeight}&webcodec=${supportedWebCodec}`;

let zoom = Math.max(1, window.innerHeight / 1080),
    appVersion = 0,
    offscreen = null,
    forcedRefreshCounter = 0,
    debug = false,
    usebt = true,
    width,
    height,
    controller,
    socket,
    port,
    drageventCounter=0,
    // Variables pour traçage du décalage
    lastCanvasStyleTransform = "",
    lastSocketPort = 0,
    lastWindowDimensions = {w: window.innerWidth, h: window.innerHeight},
    lastZoom = zoom;

console.log("[DIAG] Initialisation - dimensions initiales:", window.innerWidth, "x", window.innerHeight, "zoom:", zoom);

// Fonction pour logger l'état du canvas et des variables de dimension
function logCanvasState(prefix) {
    console.log(`[DIAG] ${prefix} - Canvas: ${canvasElement.width}x${canvasElement.height}, Screen: ${window.innerWidth}x${window.innerHeight}, Zoom: ${zoom}, Transform: ${canvasElement.style.transform}`);
    console.log(`[DIAG] ${prefix} - Computed position:`, window.getComputedStyle(canvasElement).getPropertyValue('transform'), window.getComputedStyle(canvasElement).getPropertyValue('transform-origin'));
}

// Log l'état initial
logCanvasState("Initial");

canvasElement.style.display = "none";




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
    controller.abort()
}

function checkPhone() {
    console.log('Now fetching');
    controller = new AbortController();

    const wait = setTimeout(() => {
        abortFetching();
    }, 5000);

    fetch(urlToFetch, {method: 'get', signal: controller.signal})
        .then(response => response.text())
        .then(data => {
            clearTimeout(wait);
            if (document.hidden) {
                setTimeout(() => {
                    checkPhone();
                }, 2000);
                return
            }
            if (isJson(data)) {
                const json = JSON.parse(data);
                postWorkerMessages(json)
            } else {
                alert("You need to run TeslAA 2.0 or newer to use this page");
            }
        })
        .catch((error) => {
            console.error(error);
            clearTimeout(wait);
            setTimeout(() => {
                checkPhone()
            }, 2000);
        });
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

// Ajouter une variable pour suivre l'état du transfert
let canvasTransferred = false;

// Remplacer la vérification du canvas avec une surveillance de l'état de transfert
function checkCanvasState() {
    console.log("[DIAG] Vérification état du canvas - Transféré:", canvasTransferred);
    
    if (canvasTransferred) {
        // Si le canvas est transféré, on ne peut pas modifier ses dimensions
        console.log("[DIAG] ℹ️ Canvas déjà transféré à OffscreenCanvas, correction via CSS uniquement");
        
        if (!canvasElement.style.width || !canvasElement.style.height || 
            canvasElement.style.width !== width + "px" || 
            canvasElement.style.height !== height + "px") {
            console.log("[DIAG] ⚠️ Correction des dimensions CSS:", 
                      canvasElement.style.width + "x" + canvasElement.style.height,
                      "→", width + "px" + "x" + height + "px");
            canvasElement.style.width = width + "px";
            canvasElement.style.height = height + "px";
        }
        
        // Vérifier si le transform est appliqué
        if (!canvasElement.style.transform || canvasElement.style.transform === "") {
            console.log("[DIAG] ⚠️ Correction du transform manquant");
            canvasElement.style.transform = "scale(" + zoom + ")";
        }
        
        // Vérifier le transform-origin
        if (!canvasElement.style.transformOrigin || canvasElement.style.transformOrigin !== "top left") {
            console.log("[DIAG] ⚠️ Correction du transform-origin:", 
                      canvasElement.style.transformOrigin, "→ top left");
            canvasElement.style.transformOrigin = "top left";
        }
        
        // Logger l'état après les tentatives de correction CSS
        console.log("[DIAG] État après correction CSS:", {
            "styleWidth": canvasElement.style.width,
            "styleHeight": canvasElement.style.height,
            "transform": canvasElement.style.transform,
            "transformOrigin": canvasElement.style.transformOrigin
        });
        return;
    }
    
    // Le code existant pour les canvas non transférés
    console.log("[DIAG] Vérification état du canvas");
    
    // Vérifier si les dimensions sont correctes
    if (canvasElement.width !== width || canvasElement.height !== height) {
        console.log("[DIAG] ⚠️ Correction des dimensions du canvas:", 
                  canvasElement.width + "x" + canvasElement.height,
                  "→", width + "x" + height);
                  
        canvasElement.width = width;
        canvasElement.height = height;
    }
    
    // Vérifier si le transform est appliqué
    if (!canvasElement.style.transform || canvasElement.style.transform === "") {
        console.log("[DIAG] ⚠️ Correction du transform manquant");
        canvasElement.style.transform = "scale(" + zoom + ")";
    }
    
    // Vérifier le transform-origin
    if (!canvasElement.style.transformOrigin || canvasElement.style.transformOrigin !== "top left") {
        console.log("[DIAG] ⚠️ Correction du transform-origin:", 
                  canvasElement.style.transformOrigin, "→ top left");
        canvasElement.style.transformOrigin = "top left";
    }
    
    logCanvasState("Après vérification");
}

function postWorkerMessages(json) {
    console.log("[DIAG] postWorkerMessages - Données reçues:", JSON.stringify(json));
    logCanvasState("Avant traitement");
    
    // Stocker les valeurs précédentes pour comparaison
    const previousWidth = width;
    const previousHeight = height;
    const previousZoom = zoom;
    
    if (json.hasOwnProperty("wrongresolution")) {
        console.log("[DIAG] wrongresolution détecté:", json.width, "x", json.height);
        alert("Browser resolution doesn't match app resolution. Updating values and restarting app.");
        location.reload();
        return;
    }
    
    if (json.hasOwnProperty("resolutionChanged")) {
        console.log("[DIAG] resolutionChanged détecté - Ancien:", previousWidth, "x", previousHeight, "Nouveau:", json.width, "x", json.height);
        
        // CORRECTION - Au lieu de recharger immédiatement, appliquer les changements CSS d'abord
        if (canvasTransferred) {
            console.log("[DIAG] Canvas transféré, adaptation via CSS uniquement");
            // Définir les nouvelles dimensions
            width = json.width;
            height = json.height;
            
            // Mettre à jour les propriétés CSS
            canvasElement.style.width = width + "px";
            canvasElement.style.height = height + "px";
            
            // Recalculer le zoom
            zoom = Math.max(1, window.innerHeight / height);
            canvasElement.style.transform = "scale(" + zoom + ")";
            canvasElement.style.transformOrigin = "top left";
            
            // Informer le worker de la nouvelle résolution
            demuxDecodeWorker.postMessage({
                action: "RESIZE", 
                width: width, 
                height: height
            });
            
            // Nettoyer les buffers existants et demander un nouveau keyframe
            demuxDecodeWorker.postMessage({action: "CLEAR_BUFFERS"});
            
            // Afficher un message temporaire
            warningElement.style.display = "block";
            logElement.style.display = "none";
            warningElement.innerText = "Résolution ajustée à " + width + "x" + height;
            setTimeout(function() {
                warningElement.style.display = "none";
                logElement.style.display = "block";
            }, 3000);
            
            console.log("[DIAG] Adaptation terminée, pas de rechargement nécessaire");
        } else {
            // Si le canvas n'est pas transféré, procéder au rechargement normal
            console.log("Resolution adjusted dynamically to " + json.width + "x" + json.height);
            location.reload();
        }
        return;
    }
    if (json.hasOwnProperty("debug")) {
        debug = json.debug;
        console.log("[DIAG] debug modifié:", debug);
    }
    if (json.hasOwnProperty("usebt")) {
        usebt = json.usebt;
        console.log("[DIAG] usebt modifié:", usebt);
    }
    
    lastSocketPort = port;
    port = json.port;
    console.log("[DIAG] Port modifié:", lastSocketPort, "→", port);
    
    // Récupérer et log les dimensions et style actuels du canvas avant modification
    console.log("[DIAG] État du canvas AVANT changement de résolution:", {
        "elementWidth": canvasElement.width,
        "elementHeight": canvasElement.height,
        "styleWidth": canvasElement.style.width,
        "styleHeight": canvasElement.style.height,
        "transform": canvasElement.style.transform,
        "transformOrigin": canvasElement.style.transformOrigin
    });
    
    if (json.resolution === 2) {
        width = 1920;
        height = 1080;
        zoom = Math.max(1, window.innerHeight / 1080);
        console.log("[DIAG] Resolution 2 (HD) appliquée:", width, "x", height, "zoom:", zoom);
    } else if (json.resolution === 1) {
        width = 1280;
        height = 720;
        zoom = Math.max(1, window.innerHeight / 720);
        console.log("[DIAG] Resolution 1 (Medium) appliquée:", width, "x", height, "zoom:", zoom);
        
        // Traçage détaillé pour la résolution 1
        console.log("[DIAG] Affectation canvas 1280x720");
        canvasElement.width = width;
        console.log("[DIAG] Canvas width après affectation:", canvasElement.width);
        
        canvasElement.height = height;
        console.log("[DIAG] Canvas height après affectation:", canvasElement.height);
        
        console.log("[DIAG] Application du style height");
        document.querySelector("canvas").style.height = "max(100vh,720px)";
        console.log("[DIAG] Style height après affectation:", document.querySelector("canvas").style.height);
    } else {
        width = 800;
        height = 480;
        zoom = Math.max(1, window.innerHeight / 480);
        console.log("[DIAG] Resolution 0 (Low) appliquée:", width, "x", height, "zoom:", zoom);
        
        console.log("[DIAG] Application du style height");
        document.querySelector("canvas").style.height = "max(100vh,480px)";
    }
    
    // Récupérer et log les dimensions et style du canvas après modification
    console.log("[DIAG] État du canvas APRÈS changement de résolution:", {
        "elementWidth": canvasElement.width,
        "elementHeight": canvasElement.height,
        "styleWidth": canvasElement.style.width,
        "styleHeight": canvasElement.style.height,
        "transform": canvasElement.style.transform,
        "transformOrigin": canvasElement.style.transformOrigin
    });
    
    // Comparer les changements
    if (previousWidth !== width || previousHeight !== height || previousZoom !== zoom) {
        console.log("[DIAG] Changement détecté - Dimensions:", 
                    previousWidth + "x" + previousHeight, "→", width + "x" + height, 
                    "Zoom:", previousZoom, "→", zoom);
        
        // Appliquer transform-origin pour corriger le positionnement
        console.log("[DIAG] Application explicite du transform-origin");
        canvasElement.style.transformOrigin = "top left";
        
        // Vérifier si le transform est appliqué
        if (!canvasElement.style.transform || canvasElement.style.transform === "") {
            console.log("[DIAG] ⚠️ Transform manquant - Application de scale("+zoom+")");
            canvasElement.style.transform = "scale(" + zoom + ")";
        }
    }
    
    lastCanvasStyleTransform = canvasElement.style.transform;
    
    // Logger l'état après traitement
    logCanvasState("Après traitement");
    
    if (json.hasOwnProperty("buildversion")) {
        appVersion = parseInt(json.buildversion);
        if (latestVersion > parseInt(json.buildversion)) {
            if (parseInt(localStorage.getItem("showupdate")) !== latestVersion) {
                alert("There is a new version in playsotre, please update your app.");
                localStorage.setItem("showupdate", latestVersion);
            }
        }
    }

    if (appVersion <= 22) {
        alert("You need to run TeslAA 2.3 or newer to use this page, please update.");
        return;
    }

    const forceBroadway = findGetParameter("broadway") === "1";


    canvasElement.width = width;
    canvasElement.height = height;

    offscreen = canvasElement.transferControlToOffscreen();

    demuxDecodeWorker.postMessage({canvas: offscreen, port: port, action: 'INIT', appVersion: appVersion, broadway: forceBroadway}, [offscreen]);

    if (!usebt) //If useBT is disabled start 2 websockets for PCM audio and create audio context
    {
        usebt = json.usebt;
        document.getElementById("muteicon").style.display="block";

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

    canvasElement.style.display = "block";
    document.getElementById("info").style.display = "none";
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
    demuxDecodeWorker.postMessage({
        action: "DOWN",
        X: Math.floor(event.touches[0].clientX / zoom),
        Y: Math.floor(event.touches[0].clientY / zoom),
        timestamp: performance.now()
    });
}, { passive: false }); // Important pour permettre preventDefault

bodyElement.addEventListener('touchend', (event) => {
    // Utiliser preventDefault pour éviter les délais de clic du navigateur
    event.preventDefault();
    
    demuxDecodeWorker.postMessage({
        action: "UP",
        X: Math.floor(event.changedTouches[0].clientX / zoom),
        Y: Math.floor(event.changedTouches[0].clientY / zoom),
        timestamp: performance.now()
    });
}, { passive: false }); // Important pour permettre preventDefault

bodyElement.addEventListener('touchcancel', (event) => {
    demuxDecodeWorker.postMessage({
        action: "UP",
        X: Math.floor(event.touches[0].clientX / zoom),
        Y: Math.floor(event.touches[0].clientY / zoom)
    });
});

bodyElement.addEventListener('touchmove', (event) => {
    const now = performance.now();
    // Limiter le nombre d'événements envoyés en fonction du temps écoulé
    if (now - lastTouchMoveTime >= TOUCH_THROTTLE_MS) {
        lastTouchMoveTime = now;
        
        demuxDecodeWorker.postMessage({
            action: "DRAG",
            X: Math.floor(event.touches[0].clientX / zoom),
            Y: Math.floor(event.touches[0].clientY / zoom),
        });
    }
});



checkPhone();



let audiostart=false;
let mediaPCM;
let ttsPCM;
let mediaPCMSocket;
let ttsPCMSocket;


function startAudio(){
    mediaPCMSocket = new WebSocket(`wss://taada.top:${port+1}`);
    mediaPCMSocket.binaryType = "arraybuffer";
    mediaPCMSocket.addEventListener('open', () => {
        mediaPCMSocket.binaryType = "arraybuffer";
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
    });
    ttsPCMSocket.addEventListener('message', event =>
    {
        var data = new Uint8Array(event.data);
        ttsPCMSocket.send(JSON.stringify({action:"ACK"}));
        ttsPCM.feed(data);
    });
}

// Ajouter fonction de surveillance des dimensions
window.addEventListener('resize', function() {
    console.log("[DIAG] RESIZE EVENT - Nouvelles dimensions:", window.innerWidth, "x", window.innerHeight);
    logCanvasState("Redimensionnement");
    // Stocker les dernières dimensions
    lastWindowDimensions = {w: window.innerWidth, h: window.innerHeight};
});

// Ajouter monitoring pour les reconnexions WebSocket
function setupWebSocketConnection() {
    console.log(`[DIAG] Tentative de connexion au WebSocket: ws://taada.top:${port}`);
    
    // Vérifier l'état du canvas avant de créer une nouvelle connexion
    console.log("[DIAG] État du canvas AVANT création WebSocket:", {
        "dimensions": width + "x" + height,
        "canvasDimensions": canvasElement.width + "x" + canvasElement.height,
        "styleWidth": canvasElement.style.width,
        "styleHeight": canvasElement.style.height,
        "transform": canvasElement.style.transform
    });
    
    socket = new WebSocket(`ws://taada.top:${port}`);
    
    socket.onopen = function() {
        console.log("[DIAG] WebSocket connecté, port:", port);
        logCanvasState("WebSocket ouvert");
        
        // Forcer une mise à jour du canvas après connexion
        console.log("[DIAG] Mise à jour forcée du canvas après connexion");
        canvasElement.width = width;
        canvasElement.height = height;
        canvasElement.style.transform = "scale(" + zoom + ")";
        canvasElement.style.transformOrigin = "top left";
        
        console.log("[DIAG] État du canvas APRÈS mise à jour forcée:", {
            "dimensions": width + "x" + height,
            "canvasDimensions": canvasElement.width + "x" + canvasElement.height,
            "transform": canvasElement.style.transform,
            "transformOrigin": canvasElement.style.transformOrigin
        });
        
        // ... existing code ...
    };

    socket.onclose = function(event) {
        console.log("[DIAG] WebSocket fermé - code:", event.code, "raison:", event.reason);
        console.log("[DIAG] État du canvas au moment de la fermeture:");
        logCanvasState("WebSocket fermé");
        
        // Si le socket est fermé de façon anormale (redémarrage service backend)
        if (event.code !== 1000) {
            console.log("[DIAG] Fermeture anormale, tentative de reconnexion après délai...");
            setTimeout(function() {
                console.log("[DIAG] Tentative de reconnexion...");
                // Sauvegarder l'état avant reconnexion
                const oldWidth = width;
                const oldHeight = height;
                const oldZoom = zoom;
                const oldTransform = canvasElement.style.transform;
                
                // Tenter de se reconnecter
                checkPhone();
                
                // Logger les changements après reconnexion
                console.log("[DIAG] État avant/après reconnexion:");
                console.log(`[DIAG] Dimensions: ${oldWidth}x${oldHeight} → ${width}x${height}`);
                console.log(`[DIAG] Zoom: ${oldZoom} → ${zoom}`);
                console.log(`[DIAG] Transform: ${oldTransform} → ${canvasElement.style.transform}`);
            }, 3000);
        }
    };

    socket.onerror = function(error) {
        console.log("[DIAG] Erreur WebSocket:", error);
    };

    socket.onmessage = function(event) {
        console.log("[DIAG] Message WebSocket reçu - taille:", event.data.length);
        
        // Vérifier si les dimensions du canvas sont correctes à chaque message reçu
        if (canvasElement.width !== width || canvasElement.height !== height) {
            console.log("[DIAG] ⚠️ ALERTE: Dimensions du canvas incorrectes:", 
                        canvasElement.width + "x" + canvasElement.height,
                        "attendu:", width + "x" + height);
        }
        
        // ... existing code ...
    };
}

// Remplacer l'appel direct de la connexion WebSocket par notre fonction
function startConnection() {
    console.log("[DIAG] Démarrage connexion");
    setupWebSocketConnection();
}

// Trouver l'appel à transferControlToOffscreen() et ajouter un log
// Dans la partie initiale du script ou dans setupCanvas/initBuffers etc.

// Exemple: chercher dans le code où le canvas est initialisé et ajouter:
function setupOffscreenCanvas() {
    try {
        console.log("[DIAG] Tentative de transfert du canvas vers OffscreenCanvas");
        offscreen = canvasElement.transferControlToOffscreen();
        canvasTransferred = true;
        console.log("[DIAG] Canvas transféré avec succès");
        
        // Stocker les dimensions avant transfert
        console.log("[DIAG] Dimensions avant transfert:", width + "x" + height);
        
        // Envoyer l'offscreen au worker
        demuxDecodeWorker.postMessage({
            action: "INIT_CANVAS",
            canvas: offscreen,
            width: width,
            height: height
        }, [offscreen]);
        
        // Une fois transféré, appliquer le style pour conserver le visuel correct
        canvasElement.style.width = width + "px";
        canvasElement.style.height = height + "px";
        canvasElement.style.transform = "scale(" + zoom + ")";
        canvasElement.style.transformOrigin = "top left";
        
        console.log("[DIAG] Styles appliqués après transfert:");
        console.log("[DIAG] width:", canvasElement.style.width);
        console.log("[DIAG] height:", canvasElement.style.height);
        console.log("[DIAG] transform:", canvasElement.style.transform);
        console.log("[DIAG] transformOrigin:", canvasElement.style.transformOrigin);
    } catch (e) {
        console.error("[DIAG] Erreur lors du transfert du canvas:", e);
    }
}

// Appeler cette fonction périodiquement
setInterval(checkCanvasState, 5000);

// Ajouter un écouteur pour les rechargements de page
window.addEventListener("pageshow", function(event) {
    console.log("[DIAG] Événement pageshow - persisted:", event.persisted);
    if (event.persisted) {
        // La page est restaurée depuis le cache de navigation
        console.log("[DIAG] Page restaurée depuis le cache, vérification du canvas");
        checkCanvasState();
    }
});

// Définir une fonction d'initialisation correcte du canvas
function initCanvas() {
    console.log("[DIAG] Initialisation explicite du canvas");
    
    // Définir les dimensions de base si pas encore définies
    if (!width || !height) {
        console.log("[DIAG] ⚠️ width/height non définis lors de l'initialisation du canvas");
        return;
    }
    
    // Appliquer les dimensions
    canvasElement.width = width;
    canvasElement.height = height;
    
    // Appliquer le zoom et l'origine
    zoom = Math.max(1, window.innerHeight / height);
    canvasElement.style.transform = "scale(" + zoom + ")";
    canvasElement.style.transformOrigin = "top left";
    
    console.log("[DIAG] Canvas initialisé avec:", {
        "dimensions": width + "x" + height,
        "zoom": zoom,
        "transform": canvasElement.style.transform,
        "transformOrigin": canvasElement.style.transformOrigin
    });
}

// Ajouter un écouteur pour les visibilitychange (quand l'utilisateur change d'onglet)
document.addEventListener("visibilitychange", function() {
    console.log("[DIAG] Visibilité changée:", document.visibilityState);
    if (document.visibilityState === "visible") {
        console.log("[DIAG] Onglet redevenu visible, vérification du canvas");
        checkCanvasState();
    }
});

// Appeler initCanvas après le chargement initial
window.addEventListener("load", function() {
    console.log("[DIAG] Événement load - Initialisation du canvas");
    // Attendre un court délai pour s'assurer que les variables sont initialisées
    setTimeout(initCanvas, 500);
});




