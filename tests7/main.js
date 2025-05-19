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
    lastCanvasParams = null,
    socketReconnectCount = 0,
    connectFailCount = 0;

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

function logDebugState(reason) {
    console.log(`[DEBUG STATE - ${reason}]`);
    console.log(`- Dimensions: ${width}x${height}`);
    console.log(`- Canvas dimensions: ${canvasElement.width}x${canvasElement.height}`);
    console.log(`- Zoom: ${zoom}`);
    console.log(`- Transform: ${canvasElement.style.transform}`);
    console.log(`- Window dimensions: ${window.innerWidth}x${window.innerHeight}`);
    console.log(`- Port: ${port}`);
    console.log(`- Socket reconnects: ${socketReconnectCount}`);
    
    const currentParams = {
        width: canvasElement.width,
        height: canvasElement.height,
        transform: canvasElement.style.transform,
        zoom: zoom
    };
    
    if (lastCanvasParams !== null) {
        console.log(`- Canvas changed: ${JSON.stringify(lastCanvasParams) !== JSON.stringify(currentParams)}`);
        if (JSON.stringify(lastCanvasParams) !== JSON.stringify(currentParams)) {
            console.log(`  From: ${JSON.stringify(lastCanvasParams)}`);
            console.log(`  To:   ${JSON.stringify(currentParams)}`);
        }
    }
    
    lastCanvasParams = currentParams;
}

function postWorkerMessages(json) {
    logDebugState("Before processing message");
    console.log("Received JSON:", JSON.stringify(json));
    
    if (json.width && json.height && (width !== json.width || height !== json.height)) {
        console.log(`Dimensions changed from ${width}x${height} to ${json.width}x${json.height}`);
        width = json.width;
        height = json.height;
        fixCanvasPositioning();
    }
    
    if (json.hasOwnProperty("wrongresolution")) {
        alert("Browser resolution doesn't match app resolution. Updating values and restarting app.");
        location.reload();
        return;
    }
    
    if (json.hasOwnProperty("resolutionChanged")) {
        console.log("Resolution adjusted dynamically to " + json.width + "x" + json.height);
        location.reload();
        return;
        /*width = json.width;
        height = json.height;
        
        canvasElement.width = width;
        canvasElement.height = height;
        
        zoom = Math.max(1, window.innerHeight / height);
        canvasElement.style.transform = "scale(" + zoom + ")";
        
        demuxDecodeWorker.postMessage({
            action: "RESIZE", 
            width: width, 
            height: height
        });
        
        demuxDecodeWorker.postMessage({action: "CLEAR_BUFFERS"});
        
        warningElement.style.display = "block";
        logElement.style.display = "none";
        warningElement.innerText = "Résolution ajustée à " + width + "x" + height;
        setTimeout(function() {
            warningElement.style.display = "none";
            logElement.style.display = "block";
        }, 3000);*/
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
        zoom = Math.max(1, window.innerHeight / 1080);
    } else if (json.resolution === 1) {
        width = 1280;
        height = 720;
        zoom = Math.max(1, window.innerHeight / 720);
        document.querySelector("canvas").style.height = "max(100vh,720px)";
    } else {
        width = 800;
        height = 480;
        zoom = Math.max(1, window.innerHeight / 480);
        document.querySelector("canvas").style.height = "max(100vh,480px)";
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

function connectWebSocket() {
    try {
        // Déconnecter l'ancien socket si existant
        if (socket) {
            console.log("Fermeture du socket existant avant reconnexion");
            socket.onclose = null; // Éviter l'appel récursif à connectWebSocket
            socket.close();
        }
        
        logDebugState("Before WebSocket connection");
        socket = new WebSocket("wss://" + window.location.hostname + ":" + port);
        
        socket.onopen = function() {
            socketReconnectCount++;
            console.log("Socket connected (reconnect #" + socketReconnectCount + ")");
            logDebugState("Socket connected");
            
            // Corriger le positionnement du canvas après reconnexion
            if (socketReconnectCount > 1) {
                console.log("Reconnexion détectée, correction du positionnement");
                fixCanvasPositioning();
            }
            
            // Demander immédiatement un keyframe pour s'assurer que l'image est mise à jour
            socket.send(JSON.stringify({type: "keyframe"}));
            
            // Reset du compteur d'échec de connexion
            connectFailCount = 0;
            canvasElement.style.display = "block";
        };
        
        socket.onclose = function(event) {
            console.log("Socket closed with code: " + event.code + ", reason: " + event.reason);
            logDebugState("Socket closed");
            
            // Tentative de reconnexion après délai
            setTimeout(function() {
                console.log("Tentative de reconnexion...");
                connectWebSocket();
            }, 1000);
        };
        
        socket.onerror = function(error) {
            console.error("WebSocket error: ", error);
            logDebugState("Socket error");
        };
        
        // Gestion de l'état du socket quand l'onglet perd le focus
        document.addEventListener("visibilitychange", function() {
            if (document.hidden) {
                logDebugState("Tab hidden");
            } else {
                logDebugState("Tab visible");
                // Demander un keyframe quand l'onglet redevient visible
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({type: "keyframe"}));
                }
            }
        });
        
        // Gestion des messages (unchanged)
        // ... existing code ...
    } catch (error) {
        console.error("Error in connectWebSocket: ", error);
    }
}

// Remise à zéro des variables persistantes
function resetPersistentState() {
    console.log("Resetting persistent state variables");
    // Réinitialisation des variables qui pourraient causer des problèmes
    lastCanvasParams = null;
    forcedRefreshCounter = 0;
    // Ne pas réinitialiser socketReconnectCount pour garder trace des reconnexions
}

// Ajouter un écouteur pour détecter les redimensionnements de fenêtre
window.addEventListener('resize', function() {
    logDebugState("Window resized");
});

function fixCanvasPositioning() {
    console.log("Fixing canvas positioning");
    
    // Assurer que le canvas est correctement positionné
    canvasElement.style.transformOrigin = "top left";
    
    // Recalculer le zoom en fonction des nouvelles dimensions
    zoom = Math.max(1, window.innerHeight / height);
    canvasElement.style.transform = `scale(${zoom})`;
    
    // S'assurer que les dimensions du canvas sont correctes
    canvasElement.width = width;
    canvasElement.height = height;
    
    // Forcer un redraw complet
    const ctx = canvasElement.getContext('2d');
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Demander un keyframe pour actualiser l'image
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Requesting keyframe for refreshed display");
        socket.send(JSON.stringify({type: "keyframe"}));
    }
    
    logDebugState("After fixing canvas positioning");
}

// Ajouter cette fonction pour initialiser les dimensions et position du canvas
function initializeCanvas() {
    console.log("Initializing canvas");
    
    // S'assurer que le canvas a les dimensions correctes
    canvasElement.width = width || 1920;  // Valeur par défaut si width n'est pas défini
    canvasElement.height = height || 1080; // Valeur par défaut si height n'est pas défini
    
    // Définir le point d'origine de la transformation
    canvasElement.style.transformOrigin = "top left";
    
    // Calculer et appliquer le zoom
    zoom = Math.max(1, window.innerHeight / canvasElement.height);
    canvasElement.style.transform = `scale(${zoom})`;
    
    logDebugState("After canvas initialization");
}

// Ajouter un événement pour l'initialisation au chargement de la page
window.addEventListener('load', function() {
    logDebugState("Page loaded");
    initializeCanvas();
    
    // Vérifier si les dimensions ont été perdues/mal initialisées
    if (!width || !height) {
        console.warn("Canvas dimensions not properly initialized, using defaults");
        width = width || 1920;
        height = height || 1080;
        fixCanvasPositioning();
    }
});

// Mise à jour du handler de message pour garantir la cohérence des dimensions
function handleMessage(event) {
    // ... existing code ...
    
    // Vérifier si les dimensions du canvas sont synchronisées avec les variables
    if (canvasElement.width !== width || canvasElement.height !== height) {
        console.log("Canvas dimensions out of sync, fixing");
        fixCanvasPositioning();
    }
    
    // ... existing code ...
}




