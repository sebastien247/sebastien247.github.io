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

    timeoutId;

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

function postWorkerMessages(json) {
    // Ajout de logs sur les dimensions reçues
    console.log("📊 DIMENSIONS REÇUES DU SERVEUR: " + JSON.stringify({
        resolution: json.resolution,
        width: json.width || (json.resolution === 2 ? 1920 : (json.resolution === 1 ? 1280 : 800)),
        height: json.height || (json.resolution === 2 ? 1080 : (json.resolution === 1 ? 720 : 480)),
        browser_width: window.innerWidth,
        browser_height: window.innerHeight
    }));
    
    if (json.hasOwnProperty("wrongresolution")) {
        console.error("❌ RÉSOLUTION INCORRECTE: Actualisation nécessaire");
        alert("Browser resolution doesn't match app resolution. Updating values and restarting app.");
        location.reload();
        return;
    }
    
    if (json.hasOwnProperty("resolutionChanged")) {
        console.log("🔄 Resolution change detected: " + json.width + "x" + json.height);
        
        // Ajout de logs pour le changement de résolution
        console.log("📐 CHANGEMENT DE RÉSOLUTION: Avant=" + width + "x" + height + ", Après=" + json.width + "x" + json.height + ", Zoom avant=" + zoom);
        
        // Ajuster le canvas sans recharger la page
        width = json.width;
        height = json.height;
        
        // Seul le worker peut mettre à jour le canvas après transferControlToOffscreen
        // Envoyer les deux messages séparément pour plus de clarté
        
        // 1. Informer le worker de la nouvelle résolution du décodeur
        console.log("📤 Sending RESIZE to worker: " + width + "x" + height);
        demuxDecodeWorker.postMessage({
            action: "RESIZE", 
            width: width, 
            height: height
        });
        
        // 2. Demander une nouvelle keyframe pour obtenir la bonne résolution
        console.log("📤 Requesting keyframe after resize");
        demuxDecodeWorker.postMessage({
            action: "CLEAR_BUFFERS"
        });
        
        // Mettre à jour le zoom pour l'interface utilisateur
        zoom = Math.max(1, window.innerHeight / height);
        console.log("🔎 Zoom recalculé: " + zoom);
        
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
    
    // Ajout de logs détaillés sur la configuration de résolution
    let oldWidth = width;
    let oldHeight = height;
    let oldZoom = zoom;
    
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
    
    // Log uniquement si la résolution a changé
    if (oldWidth !== width || oldHeight !== height || oldZoom !== zoom) {
        console.log("🖼️ RÉSOLUTION MISE À JOUR: " + oldWidth + "x" + oldHeight + " → " + width + "x" + height + 
                    ", Zoom: " + oldZoom + " → " + zoom + ", Résolution code: " + json.resolution);
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

    // Logs sur les dimensions du canvas et le zoom
    console.log("🖼️ Setting initial canvas size: " + width + "x" + height + 
                ", Window size: " + window.innerWidth + "x" + window.innerHeight);
    
    canvasElement.width = width;
    canvasElement.height = height;
    
    // Appliquer la transformation d'échelle au conteneur
    canvasElement.style.transform = "scale(" + zoom + ")";
    console.log("🔎 Setting initial zoom scale: " + zoom + ", Computed style height: " + 
                window.getComputedStyle(canvasElement).height);

    // Transfert du contrôle au worker
    console.log("🚀 Transferring canvas control to worker thread");
    offscreen = canvasElement.transferControlToOffscreen();

    // Initialiser le worker avec le canvas offscreen
    console.log("📤 Sending INIT to worker with dimensions: " + width + "x" + height);
    demuxDecodeWorker.postMessage(
        {canvas: offscreen, port: port, action: 'INIT', appVersion: appVersion, broadway: forceBroadway, width: width, height: height}, 
        [offscreen]
    );

    if (!usebt) //If useBT is disabled start 2 websockets for PCM audio and create audio context
    {
        usebt = json.usebt;
        document.getElementById("muteicon").style.display="block";

    }

    demuxDecodeWorker.addEventListener("message", function (e) {
        // Ajout de logs pour les keyframes et les erreurs
        if (e.data.hasOwnProperty('keyframeRequested')) {
            console.log("🔑 KEYFRAME DEMANDÉE: " + e.data.keyframeRequested);
        }
        
        if (e.data.hasOwnProperty('keyframeReceived')) {
            console.log("🔑 KEYFRAME REÇUE: " + JSON.stringify(e.data.keyframeReceived));
        }
        
        if (e.data.hasOwnProperty('dimensionsInfo')) {
            console.log("📊 DIMENSIONS WORKER REÇUES: ", e.data.dimensionsInfo);
            
            // Comparer les dimensions du thread principal avec celles du worker
            const mainThread = {
                width: width,
                height: height,
                zoom: zoom,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight
            };
            
            // Vérifier si les dimensions correspondent
            const workerDimensions = e.data.dimensionsInfo.decoder;
            const frameDimensions = {
                width: e.data.dimensionsInfo.decoder.lastFrameWidth, 
                height: e.data.dimensionsInfo.decoder.lastFrameHeight
            };
            
            console.log("📊 COMPARAISON DIMENSIONS: " +
                JSON.stringify({
                    main: mainThread,
                    worker: workerDimensions,
                    frame: frameDimensions,
                    match: {
                        mainVsWorker: mainThread.width === workerDimensions.width && 
                                        mainThread.height === workerDimensions.height,
                        workerVsFrame: workerDimensions.width === frameDimensions.width && 
                                        workerDimensions.height === frameDimensions.height,
                        allMatch: mainThread.width === workerDimensions.width && 
                                mainThread.height === workerDimensions.height &&
                                workerDimensions.width === frameDimensions.width && 
                                workerDimensions.height === frameDimensions.height
                    }
                })
            );
            
            // Afficher un avertissement si les dimensions ne correspondent pas
            if (mainThread.width !== workerDimensions.width || 
                mainThread.height !== workerDimensions.height ||
                workerDimensions.width !== frameDimensions.width || 
                workerDimensions.height !== frameDimensions.height) {
                
                console.warn("⚠️ DÉSYNCHRONISATION DIMENSIONS DÉTECTÉE:");
                console.warn(`Main: ${mainThread.width}x${mainThread.height}, Worker: ${workerDimensions.width}x${workerDimensions.height}, Frame: ${frameDimensions.width}x${frameDimensions.height}`);
            }
        }

        if (e.data.hasOwnProperty('error')) {
            console.error('⚠️ ERREUR SOCKET: ', e.data.error);
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
            console.warn("⚠️ AVERTISSEMENT: " + e.data.warning);
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

// Ajout d'écouteur pour surveiller les changements de taille de fenêtre
window.addEventListener('resize', function() {
    console.log("📏 REDIMENSIONNEMENT FENÊTRE: " + window.innerWidth + "x" + window.innerHeight + 
                ", Canvas: " + canvasElement.width + "x" + canvasElement.height + 
                ", Zoom actuel: " + zoom);
});

// Juste avant la fin du fichier, avant la dernière accolade
// Ajout d'un bouton flottant pour demander manuellement un keyframe 
// (utile pour le débogage)

// Créer un bouton flottant pour demander un keyframe
const keyframeButton = document.createElement('button');
keyframeButton.innerText = '🔑';
keyframeButton.title = 'Demander un keyframe';
keyframeButton.style.position = 'fixed';
keyframeButton.style.bottom = '10px';
keyframeButton.style.right = '10px';
keyframeButton.style.zIndex = '9999';
keyframeButton.style.padding = '5px 10px';
keyframeButton.style.borderRadius = '5px';
keyframeButton.style.backgroundColor = '#007bff';
keyframeButton.style.color = 'white';
keyframeButton.style.border = 'none';
keyframeButton.style.fontSize = '20px';
keyframeButton.style.opacity = '0.7';
keyframeButton.style.cursor = 'pointer';

keyframeButton.addEventListener('click', function() {
    console.log("🔑 DEMANDE MANUELLE DE KEYFRAME (via bouton)");
    demuxDecodeWorker.postMessage({action: "REQUEST_KEYFRAME"});
    
    // Animation de clic
    this.style.backgroundColor = '#0056b3';
    setTimeout(() => {
        this.style.backgroundColor = '#007bff';
    }, 200);
});

// Ajouter le bouton au DOM
document.body.appendChild(keyframeButton);

// Juste après le keyframeButton, avant la fin du fichier

// Créer un bouton pour afficher les dimensions actuelles (debug)
const dimensionsButton = document.createElement('button');
dimensionsButton.innerText = '📐';
dimensionsButton.title = 'Afficher les dimensions actuelles';
dimensionsButton.style.position = 'fixed';
dimensionsButton.style.bottom = '10px';
dimensionsButton.style.right = '60px'; // positionné à droite du bouton keyframe
dimensionsButton.style.zIndex = '9999';
dimensionsButton.style.padding = '5px 10px';
dimensionsButton.style.borderRadius = '5px';
dimensionsButton.style.backgroundColor = '#28a745';
dimensionsButton.style.color = 'white';
dimensionsButton.style.border = 'none';
dimensionsButton.style.fontSize = '20px';
dimensionsButton.style.opacity = '0.7';
dimensionsButton.style.cursor = 'pointer';

dimensionsButton.addEventListener('click', function() {
    // Récupérer toutes les informations de dimensions
    const dimensionsInfo = {
        window: {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio
        },
        canvas: {
            width: canvasElement.width,
            height: canvasElement.height,
            clientWidth: canvasElement.clientWidth,
            clientHeight: canvasElement.clientHeight,
            style: {
                width: canvasElement.style.width,
                height: canvasElement.style.height,
                transform: canvasElement.style.transform
            },
            computed: {
                width: window.getComputedStyle(canvasElement).width,
                height: window.getComputedStyle(canvasElement).height
            }
        },
        config: {
            width: width,
            height: height,
            zoom: zoom
        },
        body: {
            clientWidth: document.body.clientWidth,
            clientHeight: document.body.clientHeight
        }
    };
    
    // Afficher les informations dans la console
    console.log("📊 DIMENSIONS DEBUG:", dimensionsInfo);
    
    // Créer un message visible à l'utilisateur
    const infoMessage = 
        `📐 Dimensions actuelles:
        - Window: ${dimensionsInfo.window.innerWidth}x${dimensionsInfo.window.innerHeight} (pixel ratio: ${dimensionsInfo.window.devicePixelRatio})
        - Canvas: ${dimensionsInfo.canvas.width}x${dimensionsInfo.canvas.height}
        - Config: ${dimensionsInfo.config.width}x${dimensionsInfo.config.height} (zoom: ${dimensionsInfo.config.zoom.toFixed(2)})`;
    
    // Afficher temporairement les dimensions
    warningElement.style.display = "block";
    logElement.style.display = "none";
    warningElement.innerText = infoMessage;
    
    // Revenir à l'affichage normal après quelques secondes
    setTimeout(function() {
        warningElement.style.display = "none";
        logElement.style.display = "block";
    }, 5000);
    
    // Animation de clic
    this.style.backgroundColor = '#218838';
    setTimeout(() => {
        this.style.backgroundColor = '#28a745';
    }, 200);
    
    // Demander une mise à jour des dimensions au worker
    demuxDecodeWorker.postMessage({action: "GET_DIMENSIONS"});
});

// Ajouter le bouton au DOM
document.body.appendChild(dimensionsButton);




