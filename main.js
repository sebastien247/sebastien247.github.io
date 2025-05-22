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

/**
 * Converts screen coordinates to canvas coordinates, accounting for canvas position and scaling,
 * then adjusts them for the current resolution (width/height)
 * @param {number} screenX - The X coordinate on the screen
 * @param {number} screenY - The Y coordinate on the screen
 * @returns {{x: number, y: number}} The converted coordinates relative to the canvas and adjusted for resolution
 */
function convertToCanvasCoordinates(screenX, screenY) {
    // Get the canvas's bounding rectangle, which includes any CSS transformations
    const canvasRect = canvasElement.getBoundingClientRect();
    
    // Calculate the position relative to the canvas's top-left corner
    const canvasRelativeX = screenX - canvasRect.left;
    const canvasRelativeY = screenY - canvasRect.top;
    
    // Calculate relative position (0-1) within the displayed canvas
    const relativeX = canvasRelativeX / canvasRect.width;
    const relativeY = canvasRelativeY / canvasRect.height;
    
    // Apply the relative position to the target resolution (width/height)
    const x = Math.floor(relativeX * width);
    const y = Math.floor(relativeY * height);
    
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
        
        // Ajuster le canvas sans recharger la page
        width = json.width;
        height = json.height;
        
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
        
        // Mettre à jour le zoom pour l'interface utilisateur
        //zoom = Math.max(1, window.innerHeight / height);
        
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
        /*zoom = window.innerWidth < window.innerHeight 
            ? Math.min(1, window.innerWidth / width)
            : Math.min(1, window.innerHeight / height);*/
    } else if (json.resolution === 1) {
        width = 1280;
        height = 720;
        /*zoom = window.innerWidth < window.innerHeight 
            ? Math.min(1, window.innerWidth / width)
            : Math.min(1, window.innerHeight / height);*/
        document.querySelector("canvas").style.height = "max(100vh,720px)";
    } else {
        width = 800;
        height = 480;
        /*zoom = window.innerWidth < window.innerHeight 
            ? Math.min(1, window.innerWidth / width)
            : Math.min(1, window.innerHeight / height);*/
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




