importScripts("Decoder.js");
importScripts("binary_touch_protocol.js");

// ========== Constants and Variable Declarations ==========

const MAX_TEXTURE_POOL_SIZE = 5;
let pendingFrames = [],
    underflow = true,
    night = false,
    frameTimes = [],
    runtime = 0,
    frameCounter = 0,
    sps, decoder = null, socket, height, width, port, gl, heart = 0,
    frameCounterTimer = 0,
    broadwayDecoder = null,
    lastheart = 0, pongtimer, frameRate,
    lastPongAt = 0, // Timestamp of the last server PONG sentinel (unittype 31)
    connectTimeout = null, // Watchdog handle for a WebSocket stuck in CONNECTING
    isServerShuttingDown = false, // 🚨 Flag pour indiquer que le serveur s'arrête
    firstVideoFrameReceived = false; // Flag to track first video frame

const texturePool = [];

// ========== WebSocket Reconnection Management ==========
let isReconnecting = false; // Flag pour éviter les tentatives de reconnexion multiples
let reconnectionAttempt = 0; // Compteur de tentatives de reconnexion
let reconnectionTimeout = null; // Référence au timeout de reconnexion
let forceReconnectPending = false; // True between forceReconnect() and socketClose()
const SOFT_RECONNECTION_THRESHOLD = 5; // Attempts after which only the UI message changes — reconnection never stops
const BASE_RECONNECTION_DELAY = 2000; // Délai de base en ms (2 secondes)
const MAX_RECONNECTION_DELAY = 30000; // Délai maximum en ms (30 secondes)
const PONG_TIMEOUT = 6000; // No server PONG for this long ⇒ dead control channel

// The phone re-randomises the WebSocket port on every service start; the stable
// HTTP discovery endpoint is served on this fixed port range.
const DISCOVERY_PORT_BASE = 8081;
const DISCOVERY_PORT_COUNT = 5;

// ========== Binary Touch Protocol ==========
/**
 * COMPRESSION BINAIRE DES TOUCH EVENTS
 *
 * Les événements tactiles (MULTITOUCH_DOWN, MULTITOUCH_MOVE, MULTITOUCH_UP)
 * sont automatiquement encodés en format binaire avant envoi au serveur.
 *
 * Avantages:
 * - Réduction de ~90% de la bande passante (120 bytes → 12 bytes)
 * - Latence réduite sur gestures rapides
 *
 * Format binaire:
 * [1 byte: action] [1 byte: count] [6 bytes par touch] [4 bytes: timestamp delta]
 *
 * Pour activer les logs debug: Changer BINARY_TOUCH_DEBUG à true ci-dessous
 */

const BINARY_TOUCH_DEBUG = false; // Mettre à true pour voir les statistiques de compression

// Instance de l'encodeur binaire pour les touch events
let binaryTouchEncoder = null;

// Initialiser l'encodeur au premier usage
function initBinaryTouchEncoder() {
    if (!binaryTouchEncoder) {
        binaryTouchEncoder = new BinaryTouchEncoder();
        console.log('[BinaryTouch] Encoder initialized - Binary touch compression enabled');
        console.log('[BinaryTouch] Expected compression: ~90% (120 bytes → 12 bytes per event)');
    }
}

// ========== Utility Functions ==========

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function appendByteArray(buffer1, buffer2) {
    const tmp = new Uint8Array((buffer1.byteLength | 0) + (buffer2.byteLength | 0));
    tmp.set(buffer1, 0);
    tmp.set(buffer2, buffer1.byteLength | 0);
    return tmp;
}

// ========== Frame Functions ==========

function updateFrameCounter() {
    frameTimes[runtime] = frameCounter;
    frameRate = Math.round((frameCounter - frameTimes[runtime - 10]) / 10);
    runtime++;
}

function getFrameStats() {
    frameCounter++;
    return frameRate;
}

// ========== WebGL and Canvas Functions ==========

function getTexture(gl) {
    if (texturePool.length > 0) return texturePool.pop();
    return gl.createTexture();
}

function releaseTexture(gl, texture) {
    if (texturePool.length < MAX_TEXTURE_POOL_SIZE) {
        texturePool.push(texture);
    } else {
        gl.deleteTexture(texture);
    }
}

function drawImageToCanvas(image) {
    const texture = getTexture(gl);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);

    if (isPowerOf2(width) && isPowerOf2(height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindTexture(gl.TEXTURE_2D, null);
    releaseTexture(gl, texture);

    if (image.close) {
        image.close();
    }
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function switchToBroadway() {
    console.log("Switching to broadway decoder");
    decoder = null;

    broadwayDecoder = new Decoder({rgb: true});
    broadwayDecoder.onPictureDecoded = function (buffer){
        pendingFrames.push(buffer)
        if(underflow) {
            renderFrame();
        }
    }
}

/**
 * Creates a fresh WebCodecs VideoDecoder. Extracted so the decoder can be
 * recreated on reconnect — a decoder wedged on a partial GOP from before the
 * drop would otherwise stay wedged after it.
 */
function createVideoDecoder() {
    decoder = new VideoDecoder({
        output: (frame) => {
            pendingFrames.push(frame);
            if (underflow) {
                renderFrame();
            }
        },
        error: (e) => {
            switchToBroadway()
        },
    });
}

function initCanvas(canvas, forceBroadway) {

    height = canvas.height;
    width = canvas.width;

    gl = canvas.getContext('webgl2');

    const vertexSource = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0, 1);
            v_texCoord = a_texCoord;
        }
    `;
    const fragmentSource = `
        precision mediump float;
        uniform sampler2D u_image;
        varying vec2 v_texCoord;
        void main() {
            gl_FragColor = texture2D(u_image, v_texCoord);
        }
    `;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    positionLocation = gl.getAttribLocation(program, "a_position");
    texcoordLocation = gl.getAttribLocation(program, "a_texCoord");

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]), gl.STATIC_DRAW);

    texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0]), gl.STATIC_DRAW);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    if(!forceBroadway) {
        try {
            createVideoDecoder();
        } catch(e) {
            switchToBroadway();
        }
    } else {
        console.log("Forcing to broadway decoder")
        switchToBroadway();
    }

    startSocket();
}

// ========== Rendering and Decoder Functions ==========

async function renderFrame() {
    underflow = pendingFrames.length === 0;
    if (underflow) {
        return;
    }
    const frame = pendingFrames.shift();
    drawImageToCanvas(frame);

    if (pendingFrames.length < 5) {
        socket.sendObject({action: "ACK"});
    }
    try {
        self.postMessage({
            fps: getFrameStats(),
            decodeQueueSize: decoder !== null ? decoder.decodeQueueSize : 0,
            pendingFrames: pendingFrames.length
        });
    } catch (e) {
        self.postMessage({error: e});
    }
    renderFrame();
}

function separateNalUnits(event){
    let i = -1;
    return event
        .reduce((output, value, index, self) => {
            if (value === 0 && self[index + 1] === 0 && self[index + 2] === 0 && self[index + 3] === 1) {
                i++;
            }
            if (!output[i]) {
                output[i] = [];
            }
            output[i].push(value);
            return output;
        }, [])
        .map(dat => Uint8Array.from(dat));
}

function videoMagic(dat){
    let unittype = (dat[4] & 0x1f);
    if (unittype === 1) {
        if(decoder !== null) {
            let chunk = new EncodedVideoChunk({
                type: 'delta',
                timestamp: 0,
                duration: 0,
                data: dat
            });
            if (decoder.state !== 'closed') {
                try {
                    decoder.decode(chunk);
                } catch (e) {
                    console.error("Video decoder error", e);
                    switchToBroadway();
                }
            } else {
                switchToBroadway();
            }
        }

        if(broadwayDecoder !== null) {
            broadwayDecoder.decode(dat)
        }
        return;
    }

    if (unittype === 5) {
        // An IDR cannot be decoded without SPS/PPS; after a reconnect sps is
        // cleared and repopulated by the resent codec config (#80). If the
        // keyframe somehow arrives first, drop it rather than crash on
        // appendByteArray(undefined, …) — a later keyframe recovers the stream.
        if (!sps) {
            return;
        }
        let data = appendByteArray(sps, dat);
        if(decoder !== null) {
            let chunk = new EncodedVideoChunk({
                type: 'key',
                timestamp: 0,
                duration: 0,
                data: data
            });
            if (decoder.state !== 'closed') {
                try {
                    decoder.decode(chunk);
                } catch (e) {
                    console.error("Video decoder error", e);
                    switchToBroadway();
                }
            } else {
                switchToBroadway();
            }
        }

        if(broadwayDecoder !== null) {
            broadwayDecoder.decode(data)
        }
    }
}

function headerMagic(dat) {
    let unittype = (dat[4] & 0x1f);

    if (unittype === 7) {
        let config = {
            codec: "avc1.",
            codedHeight: height,
            codedWidth: width,
        }
        for (let i = 5; i < 8; ++i) {
            var h = dat[i].toString(16);
            if (h.length < 2) {
                h = '0' + h;
            }
            config.codec += h;
        }
        sps = dat;
        if(decoder !== null) {
            try {
                decoder.configure(config);
            } catch (exc) {
                switchToBroadway();
            }
        }

        return;
    }
    else if (unittype === 8)
        sps=appendByteArray(sps,dat)
    else
        videoMagic(dat);
}

// ========== Socket and Message Handling ==========

function noPong() {
    // 🚨 NOUVEAU: Ne pas envoyer d'erreur si le serveur est en shutdown
    if (isServerShuttingDown) {
        console.log('Server is shutting down, ignoring no pong');
        return;
    }
    // Transient drop: reconnect the WebSocket in place. Never reload the page —
    // it is hosted remotely and a reload hangs in a no-coverage zone.
    console.warn('No data from phone (pong watchdog) — forcing in-place reconnect');
    forceReconnect();
}

function heartbeat() {
    // 🚨 NOUVEAU: Ne pas envoyer de ping si le serveur est en shutdown
    if (isServerShuttingDown) {
        return;
    }

    // Dead control channel: the phone replies to every PING with a PONG sentinel
    // (unittype 31). lastPongAt is updated only by that sentinel, never by video
    // frames, so a half-open channel masked by trickling buffered video is still
    // caught here — independently of video flow.
    if (lastPongAt !== 0 && (Date.now() - lastPongAt) > PONG_TIMEOUT) {
        console.warn('No PONG from phone for ' + (Date.now() - lastPongAt) + 'ms — forcing in-place reconnect');
        forceReconnect();
        return;
    }

    if (lastheart !== 0) {
        if ((Date.now() - lastheart) > 3000) {
            if (socket.readyState === WebSocket.OPEN) {
                try {
                    socket.sendObject({action: "START"});
                } catch (e) {
                    self.postMessage({error: e});
                    forceReconnect();
                }
            }
        }
    }

    lastheart = Date.now();
    let pingPayload = {action: "PING"};
    if (typeof frameRate !== 'undefined') {
        pingPayload.fps = frameRate;
    }
    socket.sendObject(pingPayload);
}



function handleMessage(event) {
    // 🚨 NOUVEAU: Vérifier si c'est un message texte (JSON) ou binaire
    if (typeof event.data === 'string') {
        try {
            const message = JSON.parse(event.data);

            // Détecter le shutdown du serveur
            if (message.type === 'server_shutdown') {
                console.warn('Server is shutting down:', message.reason);

                // 🚨 Marquer le flag pour éviter les erreurs en cascade
                isServerShuttingDown = true;

                // Notifier le thread principal
                self.postMessage({
                    serverShutdown: true,
                    reason: message.reason,
                    timestamp: message.timestamp
                });

                // Arrêter le heartbeat
                if (heart) {
                    clearInterval(heart);
                    heart = 0;
                }

                // Arrêter le timer pongtimer
                if (pongtimer) {
                    clearTimeout(pongtimer);
                    pongtimer = null;
                }

                return;
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    } else {
        // Message binaire (vidéo)
        const dat = new Uint8Array(event.data)
        handleVideoMessage(dat)
    }
}

function handleVideoMessage(dat){

    // 🚨 AMÉLIORATION: Réinitialiser le watchdog sur TOUT paquet vidéo reçu
    // Cela prouve que la connexion est active même si le PING/PONG spécifique saute
    if (pongtimer !== null) clearTimeout(pongtimer);
    pongtimer = setTimeout(noPong, 3000);

    let unittype = (dat[4] & 0x1f);
    if (unittype === 31)
    {
        // Server PONG sentinel — proof the control channel is alive. Tracked
        // separately from video so heartbeat() can detect a half-open channel.
        lastPongAt = Date.now();
        return;
    }
    if (unittype === 1 || unittype === 5) {
        videoMagic(dat);

        // Dismiss the waiting overlay only on a real IDR keyframe (unittype 5),
        // never on a P-frame: a P-frame with no preceding keyframe decodes to a
        // green/corrupt image that must not be shown to the user as "ready".
        if (unittype === 5 && !firstVideoFrameReceived) {
            firstVideoFrameReceived = true;
            console.log("First IDR keyframe decoded, notifying main thread");

            // Send progress update and videoFrameReceived notification
            self.postMessage({
                connectionProgress: {
                    step: 3,
                    message: '3/3 - First frame received!'
                }
            });
            self.postMessage({videoFrameReceived: true});
        }
    }
    else
        separateNalUnits(dat).forEach(headerMagic)
}

/**
 * Réinitialise les compteurs de reconnexion (appelé au démarrage initial)
 * Permet de réessayer après avoir atteint la limite de tentatives
 */
function resetReconnectionState() {
    isReconnecting = false;
    reconnectionAttempt = 0;

    if (reconnectionTimeout) {
        clearTimeout(reconnectionTimeout);
        reconnectionTimeout = null;
    }

    console.log('🔄 Reconnection state reset');
}

/**
 * Re-queries the phone's local HTTP discovery endpoint to learn the current
 * WebSocket port. The phone re-randomises that port on every service start, so
 * the port captured at INIT goes stale after a phone-side restart. Uses
 * reconnect=true so the query is side-effect-free (no resolution change pushed
 * to Android Auto). Returns the last known port unchanged if every probe fails.
 */
async function rediscoverPort() {
    for (let i = 0; i < DISCOVERY_PORT_COUNT; i++) {
        const discoveryPort = DISCOVERY_PORT_BASE + i;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const url = `https://taada.top:${discoveryPort}/getsocketport?w=${width}&h=${height}&webcodec=true&reconnect=true`;
            const response = await fetch(url, {method: 'get', signal: controller.signal});
            clearTimeout(timeout);
            if (!response.ok) {
                continue;
            }
            const json = JSON.parse(await response.text());
            if (json && json.port) {
                console.log(`Rediscovered WebSocket port ${json.port} via discovery port ${discoveryPort}`);
                return json.port;
            }
        } catch (e) {
            console.log(`Discovery port ${discoveryPort} failed: ${e.message}`);
        }
    }
    console.warn('Port rediscovery failed on all ports, keeping last known port ' + port);
    return port;
}

/**
 * Resets per-session client state so a reconnect starts clean. Without this,
 * stale module-level state leaks across a reconnect: the waiting/ready UI never
 * reappears (firstVideoFrameReceived), the heartbeat staleness check mis-fires
 * (lastheart), a dangling timer fires against the new socket (pongtimer), and
 * pre-drop frames render after reconnect — leaking WebCodecs VideoFrames that
 * are never closed.
 */
function resetStreamStateForReconnect() {
    firstVideoFrameReceived = false;
    lastheart = 0;
    lastPongAt = 0;

    if (pongtimer) {
        clearTimeout(pongtimer);
        pongtimer = null;
    }

    for (const frame of pendingFrames) {
        if (frame && frame.close) {
            try { frame.close(); } catch (e) { /* frame already closed */ }
        }
    }
    pendingFrames = [];
    underflow = true;

    // Recreate the video decoder: one left wedged on a partial GOP from before
    // the drop stays wedged after it. The server re-sends the codec config and
    // forces a fresh IDR on reconnect, so a fresh decoder re-initialises cleanly.
    // The Broadway fallback has no VideoDecoder to recreate — it re-syncs on the
    // next SPS+IDR once pendingFrames and sps are cleared.
    sps = undefined;
    if (broadwayDecoder === null) {
        if (decoder && decoder.state !== 'closed') {
            try { decoder.close(); } catch (e) { /* already closed */ }
        }
        try {
            createVideoDecoder();
        } catch (e) {
            switchToBroadway();
        }
    }
}

/**
 * Triggers an in-place reconnect of the control WebSocket without reloading the
 * page. Closing the socket fires its 'close' event — the single canonical entry
 * into socketClose(), de-duped by the isReconnecting guard.
 */
function forceReconnect() {
    if (isServerShuttingDown || forceReconnectPending || isReconnecting) {
        return;
    }
    forceReconnectPending = true;
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        console.log('Forcing in-place reconnect: closing socket');
        try { socket.close(); } catch (e) { /* ignore */ }
    } else {
        console.log('Forcing in-place reconnect: socket already closed');
        socketClose({reason: 'forced reconnect'});
    }
}

function startSocket() {
    // Committing to a new socket: allow this socket's own failure to schedule a
    // fresh reconnect. socketClose() re-asserts isReconnecting on failure; the
    // 'open' handler below clears it for good on success.
    isReconnecting = false;
    forceReconnectPending = false;

    socket = new WebSocket(`wss://taada.top:${port}`);
    socket.sendObject = (obj) => {
        try {
            socket.send(JSON.stringify(obj));
        }
        catch (e)
        {
            self.postMessage({error:e});
        }
    }

    socket.binaryType = "arraybuffer";

    // Watchdog: a socket stuck in CONNECTING never fires 'open'. Close it so the
    // 'close' event drives socketClose() into another backoff attempt instead of
    // wedging isReconnecting=true forever.
    if (connectTimeout) {
        clearTimeout(connectTimeout);
    }
    connectTimeout = setTimeout(() => {
        if (socket && socket.readyState === WebSocket.CONNECTING) {
            console.warn('WebSocket connect timed out, closing to retry');
            try { socket.close(); } catch (e) { /* ignore */ }
        }
    }, 10000);

    socket.addEventListener('open', () => {
        socket.binaryType = "arraybuffer";

        // 🎉 Connexion réussie! Réinitialiser les compteurs de reconnexion
        isReconnecting = false;
        reconnectionAttempt = 0;

        // Annuler tout timeout de reconnexion en attente
        if (reconnectionTimeout) {
            clearTimeout(reconnectionTimeout);
            reconnectionTimeout = null;
        }
        if (connectTimeout) {
            clearTimeout(connectTimeout);
            connectTimeout = null;
        }

        // Baseline for the heartbeat dead-channel check until the first real PONG.
        lastPongAt = Date.now();

        console.log('✅ WebSocket connected successfully');

        // Notify main thread: Socket connected
        self.postMessage({
            connectionProgress: {
                step: 2,
                message: '2/3 - Socket connected, waiting for stream...'
            }
        });

        socket.sendObject({action: "START"});
        socket.sendObject({action: "NIGHT", value: night});

        // Au lieu de demander un keyframe immédiatement, attendons un peu
        // pour voir si des données arrivent naturellement
        setTimeout(() => {
            // Ne demander un keyframe que si aucune frame n'a été reçue
            if (pendingFrames.length === 0 && underflow) {
                console.log("No frames received after socket open, requesting keyframe");
                socket.sendObject({action: "REQUEST_KEYFRAME"});
            }
        }, 1000);

        if (heart === 0) {
            heart = setInterval(heartbeat, 1000);
        }
        if (frameCounterTimer === 0) {
            frameCounterTimer = setInterval(updateFrameCounter, 1000);
        }
    });

    socket.addEventListener('close', event => socketClose(event));
    socket.addEventListener('error', event => socketClose(event));
    socket.addEventListener('message', event => handleMessage(event));
}

function socketClose(event) {
    console.log('Error: Socket Closed ', event);

    // 🚨 PROTECTION #1: Ne pas reconnecter si le serveur est en shutdown
    if (isServerShuttingDown) {
        console.log('Server is shutting down, not reconnecting');
        return;
    }

    // 🚨 PROTECTION #2: Ignorer un événement provenant d'un socket périmé
    // (un ancien socket pourrait émettre un 'close' tardif après reconnexion).
    if (event && event.target && event.target !== socket) {
        console.log('Ignoring close/error from a stale socket');
        return;
    }

    // 🚨 PROTECTION #3: Éviter les cycles de reconnexion concurrents — 'error' et
    // 'close' se déclenchent souvent ensemble; ce drapeau les dédoublonne.
    if (isReconnecting) {
        console.log('Reconnection already in progress, ignoring duplicate event');
        return;
    }

    // Marquer qu'une reconnexion est en cours
    isReconnecting = true;
    forceReconnectPending = false;
    reconnectionAttempt++;

    // Stopper les timers immédiatement: pendant le backoff, un tick de heartbeat
    // ou un pongtimer toucherait un socket mort (ou relancerait forceReconnect).
    if (heart !== 0) {
        clearInterval(heart);
        heart = 0;
    }
    if (pongtimer) {
        clearTimeout(pongtimer);
        pongtimer = null;
    }
    if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
    }

    // Backoff exponentiel plafonné à 30 s. La reconnexion n'abandonne JAMAIS: le
    // lien Wi-Fi phone↔voiture finit toujours par revenir, et recharger la page
    // hors-ligne la bloquerait. Au-delà du seuil, on ne change que le message.
    const exponentialDelay = Math.min(
        BASE_RECONNECTION_DELAY * Math.pow(2, reconnectionAttempt - 1),
        MAX_RECONNECTION_DELAY
    );

    console.log(`🔄 Connection lost. Reconnection attempt ${reconnectionAttempt} in ${exponentialDelay}ms`);

    // 🚨 NOUVEAU: Notifier le thread principal de la perte de connexion
    self.postMessage({
        connectionLost: true,
        reason: (event && event.reason) || "Connection closed",
        reconnectionAttempt: reconnectionAttempt,
        nextRetryIn: exponentialDelay
    });

    // Afficher un message informatif (le texte change après le seuil souple).
    self.postMessage({
        error: reconnectionAttempt >= SOFT_RECONNECTION_THRESHOLD
            ? `Still reconnecting to phone (attempt ${reconnectionAttempt})...`
            : `Lost connection to phone, trying to reconnect (attempt ${reconnectionAttempt})...`
    });

    // Attendre le backoff, re-découvrir le port, puis relancer le socket.
    reconnectionTimeout = setTimeout(async () => {
        console.log(`🚀 Attempting reconnection #${reconnectionAttempt}`);

        // Re-découvrir le port: le téléphone le re-randomise à chaque redémarrage
        // du service, donc le port capturé à l'INIT est périmé.
        port = await rediscoverPort();

        // Le shutdown a pu arriver pendant l'await.
        if (isServerShuttingDown) {
            isReconnecting = false;
            return;
        }

        // Repartir d'un état propre avant de rouvrir le socket.
        resetStreamStateForReconnect();

        try {
            startSocket();
        } catch (error) {
            console.error('❌ Failed to start socket during reconnection:', error);
            if (heart !== 0) {
                clearInterval(heart);
                heart = 0;
            }
            isReconnecting = false;
            socketClose({reason: 'reconnect setup failed'}); // Relancer le backoff
        }
    }, exponentialDelay);
}

async function isWebCodecsWorkingWithDecode() {
    try {
        const sample = new Uint8Array([
            0,0,0,1,103,66,0,42,218,1,224,8,159,150,106,2,2,2,15,20,42,160,0,0,0,1,104,206,13,136,0,0,0,1,101,184,79,255,254,30,66,128,0,128,95,147,21,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,21,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,146,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,185,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,46,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,75,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,192
        ]);
        return await new Promise((resolve) => {
            const decoder = new VideoDecoder({
                output: (frame) => {
                    frame.close();
                    resolve(true);
                },
                error: () => resolve(false)
            });
            decoder.configure({codec: 'avc1.42002a', codedHeight: 1080, codedWidth: 1920});
            const chunk = new EncodedVideoChunk({
                type: "key",
                timestamp: 0,
                data: sample
            });
            decoder.decode(chunk);
            // fallback in case output or error doesn't fire
            setTimeout(() => resolve(false), 1000);
        });
    } catch (e) {
        return false;
    }
}


let appVersion= 22;
let initted = false;
let postInitJobs = [];
function messageHandler(message) {
    if (message.data.action === 'NIGHT') {
        night = message.data.value;
    }

    if (socket.readyState === WebSocket.OPEN) {
        const action = message.data.action;

        // Encoder les événements MULTITOUCH en binaire
        if (action === 'MULTITOUCH_DOWN' || action === 'MULTITOUCH_MOVE' || action === 'MULTITOUCH_UP' || action === 'MULTITOUCH_CANCEL') {
            initBinaryTouchEncoder();

            // Extraire les touches et allTouches du message
            const touches = message.data.touches || [];
            const allTouches = message.data.allTouches || [];
            const timestamp = message.data.timestamp || performance.now();

            // Si aucune touche, ne rien envoyer
            if (touches.length === 0) {
                console.warn('[BinaryTouch] No touches to send for action:', action);
                return;
            }

            try {
                // Encoder en binaire avec TOUS les paramètres (touches, allTouches, timestamp)
                const binaryData = binaryTouchEncoder.encode(action, touches, allTouches, timestamp);

                // Vérifier que l'encodage a réussi
                if (!binaryData) {
                    console.error('[BinaryTouch] Encoding failed - falling back to JSON');
                    socket.sendObject(message.data);
                    return;
                }

                // Envoyer directement le buffer binaire
                socket.send(binaryData);

                // Log pour debug (contrôlé par BINARY_TOUCH_DEBUG)
                if (BINARY_TOUCH_DEBUG) {
                    const jsonSize = JSON.stringify(message.data).length;
                    console.log(`[BinaryTouch] Sent ${action}:`, {
                        touchCount: touches.length,
                        allTouchesCount: allTouches.length,
                        binarySize: binaryData.byteLength + ' bytes',
                        jsonSize: jsonSize + ' bytes',
                        compression: ((1 - binaryData.byteLength / jsonSize) * 100).toFixed(1) + '% saved'
                    });
                }
            } catch (error) {
                console.error('[BinaryTouch] Encoding error:', error);
                // Fallback to JSON si erreur
                socket.sendObject(message.data);
            }
        } else {
            // Autres messages: envoyer en JSON comme avant
            socket.sendObject(message.data);
        }
    }
}

self.addEventListener('message', async (message) => {
    if (message.data.action === 'INIT') {
        port = message.data.port;
        appVersion=parseInt(message.data.appVersion);


        let useBroadway = message.data.broadway;

        if(!useBroadway) {
            const codecWorking = await isWebCodecsWorkingWithDecode();
            if(codecWorking) {
                console.log("webcodec functional");
            } else {
                console.log("webcodec broken");
                useBroadway = true;
            }
        }

        initCanvas(message.data.canvas, useBroadway);
        initted = true;
        if(postInitJobs.length > 0){
            postInitJobs.forEach(msg => messageHandler(msg));
            postInitJobs = []
        }
    } else if (message.data.action === 'RESIZE') {
        // Gestion du changement de résolution
        console.log("Resizing decoder to " + message.data.width + "x" + message.data.height);
        width = message.data.width;
        height = message.data.height;
        
        // Mettre à jour la configuration du décodeur si nous utilisons WebCodec
        if(decoder !== null && decoder.state !== 'closed') {
            try {
                // Reconfigurer le décodeur avec les nouvelles dimensions
                let config = {
                    codec: "avc1.",
                    codedHeight: height,
                    codedWidth: width,
                };
                
                // Ajouter le codec spécifique si nous l'avons déjà
                if (sps && sps.length > 7) {
                    for (let i = 5; i < 8; ++i) {
                        var h = sps[i].toString(16);
                        if (h.length < 2) {
                            h = '0' + h;
                        }
                        config.codec += h;
                    }
                } else {
                    // Codec par défaut si on n'a pas encore reçu de SPS
                    config.codec += "42002a";
                }
                
                console.log("Reconfiguring decoder with:", config);
                decoder.configure(config);
                
                self.postMessage({warning: "Résolution adaptée, en attente d'une nouvelle image clé..."});
            } catch (e) {
                console.error("Error reconfiguring decoder:", e);
                self.postMessage({error: "Erreur lors du changement de résolution: " + e.message});
                // En cas d'erreur, essayer de basculer vers Broadway
                switchToBroadway();
            }
        } else if (broadwayDecoder !== null) {
            // Pour Broadway, nous n'avons pas besoin de reconfiguration explicite
            // Le décodeur s'ajustera automatiquement à la nouvelle résolution
            console.log("Broadway decoder will automatically adjust to new resolution on next keyframe");
            self.postMessage({warning: "En attente d'une nouvelle image clé..."});
        }
        
        // Ajuster le viewport WebGL
        if (gl) {
            gl.viewport(0, 0, width, height);
        }
    } else if (message.data.action === 'CANVAS_RESIZE') {
        // Gestion du redimensionnement du canvas (offscreen)
        console.log("Resizing canvas to " + message.data.width + "x" + message.data.height);
        
        // Accéder au canvas et le redimensionner
        const canvas = gl.canvas;
        canvas.width = message.data.width;
        canvas.height = message.data.height;
        
        // Ajuster le viewport WebGL pour correspondre aux nouvelles dimensions
        gl.viewport(0, 0, message.data.width, message.data.height);
        
        // Mettre à jour les variables globales
        width = message.data.width;
        height = message.data.height;
        
        self.postMessage({info: "Canvas resized to " + width + "x" + height});
    } else if (message.data.action === 'CLEAR_BUFFERS') {
        // Vider les tampons de frames en attente
        console.log("Clearing pending frames buffer, had " + pendingFrames.length + " frames");
        
        // Nettoyer en conservant éventuellement la dernière frame pour éviter l'écran noir
        if (pendingFrames.length > 0) {
            const lastFrame = pendingFrames[pendingFrames.length - 1];
            pendingFrames = [];
            if (lastFrame) {
                pendingFrames.push(lastFrame);
            }
        } else {
            pendingFrames = [];
        }
        
        // Réinitialiser l'état du décodeur si nécessaire
        underflow = pendingFrames.length === 0;
        
        // Demander une nouvelle frame-clé
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.sendObject({action: "REQUEST_KEYFRAME"});
        }
    } else if (message.data.action === 'RESET_AA_PROFILE') {
        if (socket && socket.readyState === WebSocket.OPEN) {
            console.log("Sending RESET_AA_PROFILE to Android");
            socket.sendObject({action: "RESET_AA_PROFILE"});
        }
    } else if(!initted) {
        postInitJobs.push(message);
    } else {
        messageHandler(message)
    }
});