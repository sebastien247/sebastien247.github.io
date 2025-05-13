importScripts("Decoder.js");
importScripts("direct_stream_decoder.js");

// ========== Constants and Variable Declarations ==========

const MAX_TEXTURE_POOL_SIZE = 5;
let pendingFrames = [],
    underflow = true,
    night = false,
    frameTimes = [],
    runtime = 0,
    frameCounter = 0,
    sps, decoder = null, socket, height, width, port, gl, heart = 0,
    broadwayDecoder = null,
    lastheart = 0, pongtimer, frameRate;

// Nouveau: Gestion du flux direct
let directDecoder = null;
let isDirectMode = false;
let directModeDetected = false;

const texturePool = [];

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

// ========== Direct Stream Support ==========

/**
 * Initialise le décodeur de flux direct
 */
function initDirectDecoder() {
    if (directDecoder) {
        return; // Déjà initialisé
    }
    
    console.log("Initializing direct stream decoder");
    
    directDecoder = DirectStreamDecoder.init(
        // Callback pour les frames décodées
        (frame) => {
            pendingFrames.push(frame);
            if (underflow) {
                renderFrame();
            }
        },
        // Callback pour les statuts/statistiques
        (status) => {
            if (status.error) {
                console.error("Direct decoder error:", status.error);
                // Désactiver le mode direct en cas d'erreur critique
                if (status.error.includes("No video decoder available")) {
                    isDirectMode = false;
                    directModeDetected = false;
                    postMessage({warning: "Direct stream mode disabled: " + status.error});
                }
            }
            
            // Envoyer les statistiques à la page principale
            postMessage({
                fps: status.fps || getFrameStats(),
                decodeQueueSize: pendingFrames.length,
                pendingFrames: status.pendingFrames || 0,
                codecType: status.codecType || "unknown"
            });
        },
        // Force le décodeur logiciel si nécessaire
        false // Laisser le décodeur décider
    );
}

/**
 * Détecte si un message est au format flux direct
 * 
 * @param {ArrayBuffer} data Les données binaires reçues
 * @returns {boolean} True si le message semble être au format flux direct
 */
function isDirectStreamMessage(data) {
    // Si le mode direct a déjà été détecté, continuer à l'utiliser
    if (directModeDetected) {
        return true;
    }
    
    if (!data || data.byteLength < 8) {
        return false;
    }
    
    try {
        const view = new DataView(data);
        // Tenter de lire la taille des métadonnées (4 premiers octets)
        const metadataSize = view.getUint32(0);
        
        // Vérifier si la taille annoncée est cohérente avec la taille totale
        if (metadataSize > 0 && metadataSize < 1000 && data.byteLength >= 4 + metadataSize) {
            // Extraire les métadonnées et vérifier si c'est du JSON
            const metadataBytes = new Uint8Array(data, 4, metadataSize);
            const metadataStr = new TextDecoder().decode(metadataBytes);
            const metadata = JSON.parse(metadataStr);
            
            // Vérifier si les métadonnées contiennent les champs attendus
            if (metadata.hasOwnProperty('rawFormat') && 
                metadata.hasOwnProperty('mediaMessageId')) {
                
                console.log("Direct stream mode detected!", metadata);
                directModeDetected = true;
                return true;
            }
        }
    } catch (e) {
        // Si l'analyse échoue, ce n'est probablement pas un message direct
        return false;
    }
    
    return false;
}

/**
 * Traite un message au format direct stream
 * 
 * @param {ArrayBuffer} data Les données binaires reçues
 * @returns {boolean} True si les données ont été traitées avec succès
 */
function handleDirectStreamMessage(data) {
    if (!directDecoder) {
        initDirectDecoder();
    }
    
    // Traiter le message et retourner true si un ACK doit être envoyé
    return directDecoder.processMessage(data);
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
    
    // Supporter les formats directs (VideoFrame) et anciens (Uint8Array)
    if (image instanceof VideoFrame) {
        // Direct mode via WebCodecs
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    } else if (image.data && image.width && image.height) {
        // Mode Broadway ou Direct Software
        const w = image.width;
        const h = image.height;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.data);
    } else {
        // Ancien mode
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }

    if (isPowerOf2(width) && isPowerOf2(height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindTexture(gl.TEXTURE_2D, null);
    releaseTexture(gl, texture);

    // Supprimer proprement les objets VideoFrame
    if (image instanceof VideoFrame || (image.close && typeof image.close === 'function')) {
        try {
            image.close();
        } catch (e) {
            // Ignorer les erreurs de fermeture
        }
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
    broadwayDecoder.onPictureDecoded = function (buffer, width, height){
        pendingFrames.push({
            data: buffer,
            width: width,
            height: height
        });
        if(underflow) {
            renderFrame();
        }
    }
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
            decoder = new VideoDecoder({
                output: (frame) => {
                    pendingFrames.push(frame);
                    if (underflow) {
                        renderFrame();
                    }
                },
                error: (e) => {
                    switchToBroadway();
                },
            });
        } catch(e) {
            switchToBroadway();
        }
    } else {
        console.log("Forcing to broadway decoder");
        switchToBroadway();
    }

    // Initialiser également le décodeur direct pour être prêt
    try {
        initDirectDecoder();
    } catch (e) {
        console.error("Failed to initialize direct decoder:", e);
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
    
    // Envoyer les statistiques à la page principale
    try {
        self.postMessage({
            fps: getFrameStats(),
            decodeQueueSize: decoder !== null ? decoder.decodeQueueSize : 0,
            pendingFrames: pendingFrames.length
        });
    } catch (e) {
        self.postMessage({error: e.toString()});
    }
    
    // Si d'autres frames sont disponibles, continuer le rendu
    if (pendingFrames.length > 0) {
        setTimeout(renderFrame, 0);
    }
}

function separateNalUnits(event){
    const dat = new Uint8Array(event.data);
    videoMagic(dat);
}

function videoMagic(dat) {
    // Essayer d'abord avec le décodage direct si semble être le bon format
    if (isDirectStreamMessage(dat.buffer || dat)) {
        if (!isDirectMode) {
            isDirectMode = true;
            console.log("Switching to direct stream mode");
            postMessage({warning: "Switching to direct stream mode"});
        }
        
        const shouldAck = handleDirectStreamMessage(dat.buffer || dat);
        if (shouldAck) {
            socket.sendObject({action: "ACK"});
        }
        return;
    } else if (isDirectMode) {
        // Si nous étions en mode direct mais ce message ne l'est pas,
        // revenir au mode normal
        isDirectMode = false;
        console.log("Switching back to normal mode from direct mode");
    }
    
    // Mode legacy - traitement normal des frames
    let unittype = (dat[4] & 0x1f);
    if (unittype === 1) {
        headerMagic(dat);
    } else if (unittype === 5) {
        console.log("IDR FRAME");
        headerMagic(dat);
    } else if (unittype === 7) {
        sps = dat;
    } else if (unittype === 8 && sps) {
        if(decoder) {
            try {
                console.log("DECODER CONFIGURE");
                const config = {
                    codec: "avc1.640028",
                    codedWidth: width,
                    codedHeight: height
                };
                const desc = appendByteArray(sps, dat);
                const avcc = [0, 0, 0, 1];
                if (desc[0] !== 0) config.description = Uint8Array.from(appendByteArray(avcc, appendByteArray(sps, appendByteArray(avcc, dat))));
                else config.description = Uint8Array.from(appendByteArray(sps, dat));

                decoder.configure(config);
                decoder.decode(new EncodedVideoChunk({type: "key", timestamp: 0, data: config.description}));
            } catch (e) {
                switchToBroadway();
                if(broadwayDecoder) {
                    broadwayDecoder.decode(sps);
                    broadwayDecoder.decode(dat);
                }
            }
        } else if(broadwayDecoder) {
            broadwayDecoder.decode(sps);
            broadwayDecoder.decode(dat);
        }
    } else {
        console.log("Unknown NAL UNIT " + unittype);
    }
}

function headerMagic(dat) {
    if(decoder && decoder.state === "configured") {
        try {
            decoder.decode(new EncodedVideoChunk({type: "key", timestamp: 0, data: dat}));
        } catch (e) {
            switchToBroadway();
            if(broadwayDecoder) broadwayDecoder.decode(dat);
        }
    } else if(broadwayDecoder) {
        broadwayDecoder.decode(dat);
    }
}

function noPong() {
    postMessage({error: "no pong received in 10s"});
}

function heartbeat() {
    heart++;
    clearTimeout(pongtimer);
    pongtimer = setTimeout(noPong, 10000);
    socket.sendObject(
        {action: "PING", heart: heart, pendingFrames: pendingFrames.length}
    );
}

function handleMessage(event) {
    const data = event.data;
    
    // Détecter si c'est un buffer binaire ou un objet JSON
    if (data instanceof ArrayBuffer) {
        // Données binaires - vidéo
        videoMagic(new Uint8Array(data));
    } else if (data instanceof Uint8Array) {
        // Compatibilité avec l'ancien format
        videoMagic(data);
    } else {
        // Objet JSON - messages de contrôle
        handleControlMessage(data);
    }
}

function handleControlMessage(data) {
    if (data.heart) {
        lastheart = data.heart;
    }
    
    if (data.action === "PONG") {
        clearTimeout(pongtimer);
    } else if (data.action === "NIGHT") {
        night = data.night === 1;
    }
}

function startSocket() {
    class WebSocketClient {
        constructor(host, protocol) {
            this.host = host;
            this.protocol = protocol;
            this.reconnectTimeoutId = null;
            this.socket = null;
            this.reconnectInterval = 1000;
        }

        connect() {
            try {
                this.socket = new WebSocket(this.host, this.protocol);
                this.socket.binaryType = "arraybuffer";

                this.socket.addEventListener("open", () => {
                    console.log("WebSocket connection established");
                    setInterval(heartbeat, 1000);
                    this.reconnectInterval = 1000;
                });

                this.socket.addEventListener("message", handleMessage);

                this.socket.addEventListener("close", socketClose);

                this.socket.addEventListener("error", (error) => {
                    console.error("WebSocket error:", error);
                });
            } catch (e) {
                console.error("Error creating WebSocket:", e);
                this.scheduleReconnect();
            }
        }

        sendObject(obj) {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(obj));
            }
        }

        scheduleReconnect() {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = setTimeout(() => {
                postMessage({error: "Reconnecting..."});
                this.connect();
                this.reconnectInterval = Math.min(this.reconnectInterval * 1.5, 30000);
            }, this.reconnectInterval);
        }
    }

    socket = new WebSocketClient(`wss://taada.top:${port}`, "binary");
    socket.connect();
}

function socketClose(event) {
    postMessage({error: `WebSocket connection closed: ${event.reason || "No reason provided"}`});
    socket.scheduleReconnect();
}

async function isWebCodecsWorkingWithDecode() {
    try {
        if (typeof VideoDecoder === 'undefined') {
            return false;
        }

        // Try creating a VideoDecoder instance
        const decoder = new VideoDecoder({
            output: () => {},
            error: () => {}
        });

        // Clean up
        decoder.close();
        return true;
    } catch (e) {
        return false;
    }
}

function messageHandler(message) {
    const data = message.data;
    
    if (data.canvas) {
        let useBroadway = false;
        
        if (data.broadway) {
            useBroadway = true;
        }
        
        initCanvas(data.canvas, useBroadway);
        port = data.port;
    } else if (data.action === "GPS") {
        if (socket) {
            socket.sendObject({
                action: "GPS",
                accuracy: data.accuracy,
                latitude: data.latitude,
                longitude: data.longitude,
                altitude: data.altitude,
                heading: data.heading,
                speed: data.speed
            });
        }
    } else if (data.action === "KEY") {
        if (socket) {
            socket.sendObject({
                action: "KEY",
                key: data.key
            });
        }
    } else {
        console.error("Unknown message:", data);
    }
}

// Écouter les messages de la page principale
addEventListener("message", messageHandler);