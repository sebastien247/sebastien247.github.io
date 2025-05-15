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
    if (json.hasOwnProperty("wrongresolution")) {
        alert("Browser resolution doesn't match app resolution. Updating values and restarting app.");
        location.reload();
        return;
    }
    
    if (json.hasOwnProperty("resolutionChanged")) {
        console.log("Resolution adjusted dynamically to " + json.width + "x" + json.height);
        
        // Mémoriser les nouvelles dimensions
        width = json.width;
        height = json.height;
        
        // Mettre à jour uniquement le zoom et le scaling CSS, pas les dimensions du canvas
        zoom = Math.max(1, window.innerHeight / height);
        
        // Ne pas modifier directement canvasElement.width/height car le canvas a été transféré
        // Demander au worker de faire les changements à la place
        
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
    }
    if (json.hasOwnProperty("debug")) {
        debug = json.debug;
    }
    if (json.hasOwnProperty("usebt")) {
        usebt = json.usebt;
    }
    port = json.port;
    if (json.hasOwnProperty("width") && json.hasOwnProperty("height")) {
        width = json.width;
        height = json.height;
        console.log("Received dimensions from server: " + width + "x" + height);
    } else if (json.resolution === 2) {
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

    // Si le canvas n'est pas encore transféré au worker
    if (!offscreen) {
        console.log("Initializing worker with canvas dimensions: " + width + "x" + height);
        
        // S'assurer que le canvas est initialisé avec les bonnes dimensions AVANT le transfert
        if (!canvasElement) {
            canvasElement = document.querySelector('canvas');
        }
        
        // Définir les dimensions du canvas AVANT le transfert
        canvasElement.width = width;
        canvasElement.height = height;
        console.log("Canvas initialized with dimensions: " + width + "x" + height);
        
        // Définir le style pour le zoom
        zoom = Math.max(1, window.innerHeight / height);
        canvasElement.style.position = "fixed";
        canvasElement.style.top = "0";
        canvasElement.style.left = "50%";
        canvasElement.style.transform = "translateX(-50%) scale(" + zoom + ")";
        canvasElement.style.transformOrigin = "top center";
        canvasElement.style.display = "block"; // S'assurer que le canvas est visible
        
        // Transférer le contrôle du canvas après avoir défini ses dimensions
        offscreen = canvasElement.transferControlToOffscreen();
        
        // Initialiser le worker et ajouter le gestionnaire d'événements
        // Ceci est l'initialisation INITIALE du worker uniquement
        if (!demuxDecodeWorker._initiated) {
            demuxDecodeWorker.addEventListener("message", handleDecoderMessage);
            demuxDecodeWorker._initiated = true;
        }
        
        // Initialiser le worker avec les dimensions correctes
        demuxDecodeWorker.postMessage({
            canvas: offscreen, 
            port: port, 
            action: 'INIT', 
            width: width,
            height: height,
            appVersion: appVersion, 
            broadway: forceBroadway
        }, [offscreen]);
    }

    if (!usebt) //If useBT is disabled start 2 websockets for PCM audio and create audio context
    {
        usebt = json.usebt;
        document.getElementById("muteicon").style.display="block";

    }

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

// Modifier la fonction handleResize pour ne pas toucher aux dimensions du canvas
function handleResize() {
    if (height) {
        // Recalculer le zoom basé sur la hauteur de la fenêtre
        zoom = Math.max(1, window.innerHeight / height);
        
        // Mettre à jour uniquement le style de transformation
        // Si canvasElement est encore accessible (avant transfert)
        if (canvasElement) {
            canvasElement.style.transform = "translateX(-50%) scale(" + zoom + ")";
        }
        
        console.log("Window resized, new zoom: " + zoom);
    }
}

// Ajouter cette fonction pour gérer les messages du décodeur
function handleDecoderMessage(e) {
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
            warningElement.style.display = "block";
            logElement.style.display = "none";
            warningElement.innerText = e.data.error;
        }
    } else if (e.data.hasOwnProperty('fps')) {
        if (debug) {
            logElement.innerText = "FPS: " + e.data.fps + " - Queue: " + e.data.decodeQueueSize + " - Pending: " + e.data.pendingFrames;
        } else {
            logElement.innerText = "";
        }
    } else if (e.data.hasOwnProperty('warning')) {
        warningElement.style.display = "block";
        logElement.style.display = "none";
        warningElement.innerText = e.data.warning;
        
        // Hide warning after 5 seconds
        setTimeout(function() {
            warningElement.style.display = "none";
            logElement.style.display = "block";
        }, 5000);
    }
}

// Ajouter l'écouteur de redimensionnement
window.addEventListener('resize', handleResize);




