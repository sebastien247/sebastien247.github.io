// Cache-busting : recupere le "?v=N" transmis via l'URL de ce worker (depuis
// main.js) et le propage aux dependances chargees ici, pour qu'un bump de
// version dans index.html invalide aussi Decoder.js / binary_touch_protocol.js.
var ASSET_VERSION = (function () {
    try {
        var v = new URLSearchParams(self.location.search).get('v');
        return v ? ('?v=' + v) : '';
    } catch (e) {
        return '';
    }
})();
importScripts("Decoder.js" + ASSET_VERSION);
importScripts("binary_touch_protocol.js" + ASSET_VERSION);

// ========== Constants and Variable Declarations ==========

const MAX_TEXTURE_POOL_SIZE = 5;
let pendingFrames = [],
    underflow = true,
    night = false,
    frameTimes = [],
    runtime = 0,
    frameCounter = 0,
    sps, decoder = null, socket, height, width, port, gl, heart = 0,
    // B1 control channel: when the phone advertises controlChannelPort (build 66+),
    // a SECOND WebSocket carries PING/PONG + binary touch so they don't queue behind
    // bulk H.264 video. Both stay falsy/null on older phones ⇒ single-socket legacy path.
    controlChannelPort = null, controlSocket = null,
    frameCounterTimer = 0,
    broadwayDecoder = null,
    lastheart = 0, pongtimer, frameRate,
    lastPongAt = 0, // Timestamp of the last server PONG sentinel (unittype 31)
    lastFrameAt = 0, // Timestamp of the last decoded video frame (unittype 1/5)
    lastHeartbeatAt = 0, // Wall-clock of the last heartbeat() tick — detects Worker suspension (WebView backgrounded during a call)
    pageHidden = false, // Mirror of document.visibilityState, relayed by main.js (action VISIBILITY)
    lastVisibilityHiddenAt = 0, // Wall-clock of the last hidden transition — corroborates a suspension
    resumeStrikes = 0, // Consecutive resumeAfterSuspend re-primes that produced NO fresh PONG
    lastResumeAt = 0, // Wall-clock of the last resumeAfterSuspend re-prime
    connectTimeout = null, // Watchdog handle for a WebSocket stuck in CONNECTING
    isServerShuttingDown = false, // 🚨 Flag pour indiquer que le serveur s'arrête
    firstVideoFrameReceived = false; // Flag to track first video frame

const texturePool = [];

// ── Pipeline metrics (1 Hz sampler, relayed to main.js → ?debug panel) ──────
// Answers WHERE display latency accumulates, stage by stage:
//   rxFrames/rxBytes   arrival rate into the worker (counted at message entry)
//   decOut             frames the decoder actually output
//   rendered           frames drawn to the canvas
//   dq / pf gauges     decoder internal queue / pendingFrames render queue
//   tickDriftMax       worker event-loop health (heartbeat lateness beyond 1 s)
//   pingsSent-pongsRx  PONG deficit. PINGs go uplink (uncongested), the phone
//                      replies immediately, and PONGs are FIFO with video on the
//                      downlink — so at 1 ping/s the deficit ≈ SECONDS of backlog
//                      sitting upstream of the worker (phone outQueue + TCP
//                      buffers + worker inbox). The single number that separates
//                      "lag lives upstream" from "lag lives in decode/render".
const m = {
    rxFrames: 0, rxBytes: 0, decOut: 0, rendered: 0,
    totalRxFrames: 0, totalRendered: 0,
    pingsSent: 0, pongsRx: 0,
    tickDriftMax: 0,
    // Stage discriminators (upstream stall vs browser decode bottleneck):
    //   gapMax   longest silence between two arriving frames in the window. Big
    //            gap = the SOURCE stalled (phone throttled / TCP), then bursts.
    //   decMs    synchronous ms the worker spent inside decode() this window.
    //            ~0 on WebCodecs (async submit), real on Broadway (software,
    //            on-thread) → a big decMs with a big drift = browser-bound.
    //   so a burst with gapMax≈0 + decMs high = browser can't keep up; a burst
    //            with gapMax in the seconds = frames batched upstream.
    gapMax: 0, decMs: 0, lastArrivalAt: 0,
};

/**
 * Relays one connection-lifecycle log line to the main thread. A Worker has no
 * localStorage, so the main thread persists these and renders the ?debug panel.
 * Only INFREQUENT connection events go through here (open / close / reconnect /
 * shutdown / first-frame / decoder fallback) — never per-frame or per-ping — so
 * the saved history stays a few KB and never floods.
 */
function debugLog(msg) {
    try {
        self.postMessage({ debugLog: { ts: Date.now(), msg: String(msg) } });
    } catch (e) { /* logging must never break the stream */ }
}

// ========== WebSocket Reconnection Management ==========
let isReconnecting = false; // Flag pour éviter les tentatives de reconnexion multiples
let reconnectionAttempt = 0; // Compteur de tentatives de reconnexion
let reconnectionTimeout = null; // Référence au timeout de reconnexion
let forceReconnectPending = false; // True between forceReconnect() and socketClose()
const SOFT_RECONNECTION_THRESHOLD = 5; // Attempts after which only the UI message changes — reconnection never stops
const BASE_RECONNECTION_DELAY = 2000; // Délai de base en ms (2 secondes)
const MAX_RECONNECTION_DELAY = 30000; // Délai maximum en ms (30 secondes)
// Liveness watchdog budgets. Tuned for a MOVING car: the phone↔car Wi-Fi
// micro-stalls for a few seconds on handovers / interference, and that is NOT a
// real disconnect — force-closing the socket on a 3 s blip produced a
// reconnect loop in the field. We now ride out short stalls and only declare
// the channel dead after a mobile-appropriate delay. Trade-off: a genuine drop
// takes this long to be noticed, but the in-place reconnect is fast once fired.
const NO_DATA_TIMEOUT = 3000; //8000; // No binary data at all (video OR PONG) for this long ⇒ reconnect (was 3000)
const PONG_TIMEOUT = 6000; //12000;   // No PONG sentinel for this long ⇒ dead control channel (was 6000)
// Suspension detection (WebView backgrounded during a phone call: timers freeze,
// the PONG/data gap is sleep time, so we re-prime instead of reconnecting).
// Two tiers, because heartbeat-tick drift alone CANNOT distinguish a frozen
// Worker from a CPU-starved-but-alive one — and a starved loop under heavy
// decode routinely shows 2-4 s of drift. Treating that as "suspended" suppressed
// every liveness watchdog while latency piled up (the 2.6.0 field regression):
// - drift > SUSPEND_THRESHOLD_HIDDEN AND main.js reported the page hidden
//   during the gap ⇒ trust it, it is a real backgrounding.
// - no visibility signal ⇒ only a drift > SUSPEND_THRESHOLD is credible
//   (a real freeze lasts the duration of the call, far beyond any decode stall).
const SUSPEND_THRESHOLD_HIDDEN = 2000;
const SUSPEND_THRESHOLD = 8000;
// A re-prime is only believable if the previous one actually revived the channel
// (a fresh PONG arrived since). After this many consecutive re-primes without
// one, stop assuming "suspension" and force the in-place reconnect — that drop
// is also what discards the stale video queued in the TCP buffers, resetting
// any accumulated display latency.
const SUSPEND_RESUME_MAX_STRIKES = 2;

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

    // 1 Hz pipeline sample for the ?debug panel. Cheap: a handful of integers.
    const nowMs = Date.now();
    try {
        self.postMessage({ metrics: {
            ts: nowMs,
            rxFps: m.rxFrames,
            decFps: m.decOut,
            renFps: m.rendered,
            rxKBps: Math.round(m.rxBytes / 1024),
            dq: decoder !== null ? decoder.decodeQueueSize : -1,
            pf: pendingFrames.length,
            backlog: m.totalRxFrames - m.totalRendered,
            pongDef: m.pingsSent - m.pongsRx,
            pongAge: lastPongAt ? (nowMs - lastPongAt) : -1,
            frameAge: lastFrameAt ? (nowMs - lastFrameAt) : -1,
            drift: m.tickDriftMax,
            path: decoder !== null ? 'wc' : (broadwayDecoder !== null ? 'bw' : '-'),
            gapMax: m.gapMax,
            decMs: m.decMs,
            bwSwitches: m.bwSwitches || 0,
            bwReason: m.bwReason || '',
        }});
    } catch (e) { /* metrics must never break the stream */ }
    m.rxFrames = 0; m.rxBytes = 0; m.decOut = 0; m.rendered = 0;
    m.tickDriftMax = 0; m.gapMax = 0; m.decMs = 0;
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

// reason: WHICH of the WebCodecs->Broadway demotion gates fired. Logged + kept
// so the field tells us why a capable browser dropped to software decode (the
// fallback is one-way and sticky until reload — see #latency-regression-260).
function switchToBroadway(reason) {
    const why = reason || 'unspecified';
    console.log("Switching to broadway decoder: " + why);
    debugLog('decoder fallback → Broadway: ' + why);
    m.bwReason = why;
    m.bwSwitches = (m.bwSwitches || 0) + 1;
    decoder = null;

    broadwayDecoder = new Decoder({rgb: true});
    broadwayDecoder.onPictureDecoded = function (buffer){
        m.decOut++;
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
            m.decOut++;
            pendingFrames.push(frame);
            if (underflow) {
                renderFrame();
            }
        },
        error: (e) => {
            switchToBroadway('error-cb: ' + (e && e.message ? e.message : e))
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
            switchToBroadway('init-ctor-threw: ' + (e && e.message ? e.message : e));
        }
    } else {
        console.log("Forcing to broadway decoder")
        // forceBroadway=true means INIT chose Broadway: either ?broadway=1 (MCU1)
        // or the isWebCodecsWorkingWithDecode() probe failed/ timed out at startup.
        switchToBroadway('init-forced (probe-fail or ?broadway=1)');
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
    m.rendered++;
    m.totalRendered++;

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
    // Arrival metric counted HERE, not in handleVideoMessage: messages whose
    // first NAL is SPS/PPS/filler reach the decodable AU through headerMagic →
    // videoMagic, and a first-NAL sniff at message level undercounts them
    // (observed rx=0 while dec=30 in the bench repro).
    if (unittype === 1 || unittype === 5) {
        const _now = Date.now();
        if (m.lastArrivalAt !== 0) {
            const gap = _now - m.lastArrivalAt;
            if (gap > m.gapMax) { m.gapMax = gap; }
        }
        m.lastArrivalAt = _now;
        m.rxFrames++;
        m.totalRxFrames++;
    }
    const _dt0 = Date.now();
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
                    switchToBroadway('decode-threw-P: ' + (e && e.message ? e.message : e));
                }
            } else {
                switchToBroadway('decoder-closed-P');
            }
        }

        if(broadwayDecoder !== null) {
            broadwayDecoder.decode(dat)
        }
        m.decMs += Date.now() - _dt0;
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
                    switchToBroadway('decode-threw-IDR: ' + (e && e.message ? e.message : e));
                }
            } else {
                switchToBroadway('decoder-closed-IDR');
            }
        }

        if(broadwayDecoder !== null) {
            broadwayDecoder.decode(data)
        }
        m.decMs += Date.now() - _dt0;
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
                switchToBroadway('configure-threw: ' + (exc && exc.message ? exc.message : exc));
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

/**
 * True when this Worker was suspended/throttled — the heartbeat interval stopped
 * ticking for longer than normal jitter. Happens when the Tesla backgrounds the
 * WebView during a phone call: timers freeze, so the PONG/data gap that piles up
 * is sleep time, not a dead channel. The socket is usually still OPEN on resume.
 */
function workerWasSuspended() {
    if (lastHeartbeatAt === 0) {
        return false;
    }
    const drift = Date.now() - lastHeartbeatAt;
    if (drift <= SUSPEND_THRESHOLD_HIDDEN) {
        return false;
    }
    // Corroborated: main.js saw the page go hidden during this gap (phone call
    // backgrounded the WebView). The small threshold applies.
    if (pageHidden || lastVisibilityHiddenAt >= lastHeartbeatAt) {
        return true;
    }
    // Uncorroborated: a CPU-starved-but-alive loop shows 2-4 s drift under heavy
    // decode; only a much larger gap is a credible freeze.
    return drift > SUSPEND_THRESHOLD;
}

/**
 * Recover from a Worker suspension WITHOUT the false reconnect. If the socket is
 * still OPEN, re-baseline the watchdogs and re-prime the stream (the phone's
 * dead-man timer turned video off while we slept) so video resumes on the SAME
 * socket. Only if the socket actually died do we fall back to a real reconnect.
 */
function resumeAfterSuspend(source) {
    const now = Date.now();
    const drift = now - lastHeartbeatAt;
    lastHeartbeatAt = now;
    if (socket && socket.readyState === WebSocket.OPEN) {
        // Strike gate: if the PREVIOUS re-prime produced no fresh PONG, this
        // "suspension" is really a dead/jammed channel. After
        // SUSPEND_RESUME_MAX_STRIKES stale re-primes, reconnect in place — the
        // socket drop also flushes the stale video sitting in the TCP buffers,
        // so the accumulated display latency resets without a page reload.
        if (lastResumeAt !== 0 && lastPongAt <= lastResumeAt) {
            resumeStrikes++;
        } else {
            resumeStrikes = 0;
        }
        if (resumeStrikes >= SUSPEND_RESUME_MAX_STRIKES) {
            debugLog('resume strikes exhausted (' + resumeStrikes + ' re-primes, no fresh PONG) — reconnecting');
            resumeStrikes = 0;
            lastResumeAt = 0;
            forceReconnect('suspendStrikes drift=' + drift + 'ms');
            return;
        }
        lastResumeAt = now;
        debugLog('resumed after ' + drift + 'ms (' + source + ', backgrounded during a call?) — socket OPEN, re-prime not reconnect');
        // Fresh baselines so the dead-channel checks don't fire on the sleep gap.
        lastPongAt = now;
        lastheart = now;
        if (pongtimer) { clearTimeout(pongtimer); }
        pongtimer = setTimeout(noPong, NO_DATA_TIMEOUT);
        try {
            // The phone's 3s video-off dead-man timer fired while we slept; START
            // re-enables video, REQUEST_KEYFRAME pulls a fresh IDR fast.
            socket.sendObject({action: "START"});
            // PING on the control socket (when present) for a fast PONG that re-
            // baselines the watchdog; falls back to the video socket otherwise.
            m.pingsSent++;
            controlSendObject({action: "PING"});
            socket.sendObject({action: "REQUEST_KEYFRAME"});
        } catch (e) { /* next heartbeat tick retries */ }
    } else {
        debugLog('resumed after ' + drift + 'ms (' + source + ') — socket rs=' + (socket ? socket.readyState : -1) + ', reconnecting');
        forceReconnect('resumeAfterSuspend drift=' + drift + 'ms rs=' + (socket ? socket.readyState : -1));
    }
}

function noPong() {
    // 🚨 NOUVEAU: Ne pas envoyer d'erreur si le serveur est en shutdown
    if (isServerShuttingDown) {
        console.log('Server is shutting down, ignoring no pong');
        return;
    }
    // The data gap may just be a suspended Worker (call in the foreground), not a
    // dead channel — re-prime the live socket instead of reconnecting.
    if (workerWasSuspended()) {
        resumeAfterSuspend('noPong');
        return;
    }
    // Transient drop: reconnect the WebSocket in place. Never reload the page —
    // it is hosted remotely and a reload hangs in a no-coverage zone.
    const sinceLastPong = lastPongAt ? (Date.now() - lastPongAt) : -1;
    console.warn('No data from phone (pong watchdog) — forcing in-place reconnect');
    forceReconnect('noData(' + NO_DATA_TIMEOUT + 'ms) sinceLastPong=' + sinceLastPong + 'ms rs=' + (socket ? socket.readyState : -1));
}

function heartbeat() {
    // 🚨 NOUVEAU: Ne pas envoyer de ping si le serveur est en shutdown
    if (isServerShuttingDown) {
        return;
    }

    // Worker-suspension guard: if this tick fires long after the previous one, the
    // Worker was frozen (WebView backgrounded during a phone call). The PONG gap
    // below would be sleep time, not a dead channel — re-prime the live socket
    // instead of force-reconnecting it. This is the #1 field cause of the loop.
    if (workerWasSuspended()) {
        resumeAfterSuspend('heartbeat');
        return;
    }
    // Event-loop health: how late is this 1 s tick beyond its schedule.
    if (lastHeartbeatAt !== 0) {
        const tickDrift = (Date.now() - lastHeartbeatAt) - 1000;
        if (tickDrift > m.tickDriftMax) {
            m.tickDriftMax = tickDrift;
        }
    }
    lastHeartbeatAt = Date.now();

    // Dead control channel: the phone replies to every PING with a PONG sentinel
    // (unittype 31). lastPongAt is updated only by that sentinel, never by video
    // frames, so a half-open channel masked by trickling buffered video is still
    // caught here — independently of video flow.
    if (lastPongAt !== 0 && (Date.now() - lastPongAt) > PONG_TIMEOUT) {
        const gap = Date.now() - lastPongAt;
        console.warn('No PONG from phone for ' + gap + 'ms — forcing in-place reconnect');
        forceReconnect('pongTimeout gap=' + gap + 'ms rs=' + (socket ? socket.readyState : -1));
        return;
    }

    if (lastheart !== 0) {
        if ((Date.now() - lastheart) > 3000) {
            if (socket.readyState === WebSocket.OPEN) {
                try {
                    socket.sendObject({action: "START"});
                } catch (e) {
                    self.postMessage({error: e});
                    forceReconnect('startSendError ' + (e && e.message ? e.message : e));
                }
            }
        }
    }

    lastheart = Date.now();
    let pingPayload = {action: "PING"};
    if (typeof frameRate !== 'undefined') {
        pingPayload.fps = frameRate;
    }
    m.pingsSent++;
    // B1: PING rides the control socket when present so the PONG can come back
    // without queueing behind video. Falls back to the video socket otherwise.
    controlSendObject(pingPayload);
}



function handleMessage(event) {
    // 🚨 NOUVEAU: Vérifier si c'est un message texte (JSON) ou binaire
    if (typeof event.data === 'string') {
        try {
            const message = JSON.parse(event.data);

            // Détecter le shutdown du serveur
            if (message.type === 'server_shutdown') {
                console.warn('Server is shutting down:', message.reason);
                debugLog('server shutdown: ' + message.reason);

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

                // B1: tear down the control socket too (no-op on legacy path).
                closeControlSocket();

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
    pongtimer = setTimeout(noPong, NO_DATA_TIMEOUT);

    m.rxBytes += dat.length;

    let unittype = (dat[4] & 0x1f);
    if (unittype === 31)
    {
        // Server PONG sentinel — proof the control channel is alive. Tracked
        // separately from video so heartbeat() can detect a half-open channel.
        m.pongsRx++;
        lastPongAt = Date.now();
        return;
    }
    if (unittype === 1 || unittype === 5) {
        lastFrameAt = Date.now();
        videoMagic(dat);

        // Dismiss the waiting overlay only on a real IDR keyframe (unittype 5),
        // never on a P-frame: a P-frame with no preceding keyframe decodes to a
        // green/corrupt image that must not be shown to the user as "ready".
        if (unittype === 5 && !firstVideoFrameReceived) {
            firstVideoFrameReceived = true;
            console.log("First IDR keyframe decoded, notifying main thread");
            debugLog('stream live — first IDR keyframe decoded');

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
 * Re-queries the phone's local HTTP discovery endpoint after a drop. The phone
 * re-randomises the WebSocket port on every service start, and a settings
 * change can alter the resolution while the page stays open, so both the port
 * and the dimensions captured at INIT go stale. Uses reconnect=true so the
 * query stays side-effect-free on the phone (no UpdateUiConfigRequest pushed to
 * Android Auto). Returns the parsed discovery JSON, or null when every probe
 * fails — the caller then keeps the last known port and dimensions.
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
                return json;
            }
        } catch (e) {
            console.log(`Discovery port ${discoveryPort} failed: ${e.message}`);
        }
    }
    console.warn('Port rediscovery failed on all ports, keeping last known port ' + port);
    return null;
}

/**
 * Applies the geometry learned from a reconnect-time discovery probe. The phone
 * can change resolution while the page stays connected — a settings change
 * restarts its service, which is exactly what triggers the reconnect — so the
 * width/height/margins captured at INIT go stale. Re-deriving them here keeps
 * the WebGL texture, the offscreen canvas and the decoder in sync with the
 * phone; a stale width/height shears every decoded frame. The main thread is
 * notified so it can re-apply the CSS letterbox sizing and touch-coordinate
 * mapping it owns.
 */
function applyRediscoveredConfig(json) {
    if (!json) {
        return;
    }

    // Mirror main.js postWorkerMessages(): the resolution index maps to fixed
    // decoder dimensions. Keep the two in lockstep.
    let newWidth, newHeight;
    if (json.resolution === 2) {
        newWidth = 1920;
        newHeight = 1080;
    } else if (json.resolution === 1) {
        newWidth = 1280;
        newHeight = 720;
    } else {
        newWidth = 800;
        newHeight = 480;
    }

    const dimensionsChanged = newWidth !== width || newHeight !== height;
    width = newWidth;
    height = newHeight;

    if (dimensionsChanged && gl) {
        // Only the worker can resize the canvas after transferControlToOffscreen.
        // Assigning width/height reallocates (and clears) the drawing buffer, so
        // do it only on a real change to avoid a black flash on a plain reconnect.
        gl.canvas.width = width;
        gl.canvas.height = height;
        gl.viewport(0, 0, width, height);
        console.log(`Reconnect: resized decoder/canvas to ${width}x${height}`);
    }

    // The main thread owns the CSS letterbox sizing and touch-coordinate
    // mapping; hand it the fresh geometry so both survive the reconnect.
    self.postMessage({
        resolutionUpdate: {
            width: width,
            height: height,
            widthMargin: json.widthMargin || 0,
            heightMargin: json.heightMargin || 0
        }
    });
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
    resumeStrikes = 0;
    lastResumeAt = 0;

    // Re-baseline the pipeline metrics: the reconnect just discarded everything
    // in flight (TCP buffers, decoder queue, pendingFrames), so carrying the old
    // backlog / PONG deficit across would misread as leftover lag.
    m.totalRendered = m.totalRxFrames;
    m.pingsSent = 0;
    m.pongsRx = 0;
    m.lastArrivalAt = 0;   // don't count the reconnect gap as a source stall

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
            switchToBroadway('reconnect-ctor-threw: ' + (e && e.message ? e.message : e));
        }
    }
}

/**
 * Triggers an in-place reconnect of the control WebSocket without reloading the
 * page. Closing the socket fires its 'close' event — the single canonical entry
 * into socketClose(), de-duped by the isReconnecting guard.
 */
function forceReconnect(reason) {
    if (isServerShuttingDown || forceReconnectPending || isReconnecting) {
        return;
    }
    forceReconnectPending = true;
    // Propagate the trigger reason into the WebSocket close frame so it reaches
    // the phone's RETRIEVABLE log (ControlSocketServer.onClose logs reason +
    // closedBy=REMOTE_PEER). The Tesla browser console is not collectable in the
    // field, so this close-frame relay is how we learn WHY the client bailed.
    // App-specific close code 4001 = "client liveness watchdog".
    const closeReason = String(reason || 'forced reconnect').slice(0, 120);
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        console.log('Forcing in-place reconnect: closing socket (' + closeReason + ')');
        try { socket.close(4001, closeReason); } catch (e) { try { socket.close(); } catch (e2) { /* ignore */ } }
    } else {
        console.log('Forcing in-place reconnect: socket already closed (' + closeReason + ')');
        socketClose({reason: closeReason});
    }
}

// ========== B1 Control Channel (separate WebSocket for PING/PONG + touch) ======
// When the phone advertises controlChannelPort, low-latency control traffic moves
// off the video socket so it can never be stuck behind a queued H.264 frame
// (head-of-line blocking). EVERYTHING here is a no-op when controlChannelPort is
// falsy: no second socket is opened and every send falls back to the video socket,
// preserving the legacy single-socket behaviour byte-for-byte.

/** True only when the dedicated control socket exists AND is OPEN. */
function controlChannelOpen() {
    return controlSocket !== null && controlSocket.readyState === WebSocket.OPEN;
}

/**
 * Routes a control message: onto the control socket when it is open, otherwise
 * onto the video socket exactly as before. Used for the PING heartbeat and the
 * binary touch path. Old phone (no controlChannelPort) ⇒ controlChannelOpen() is
 * always false ⇒ identical to calling socket.* directly.
 */
function controlSendObject(obj) {
    if (controlChannelOpen()) {
        try {
            controlSocket.send(JSON.stringify(obj));
        } catch (e) {
            // Control socket hiccupped — fall back to the video socket so the PING
            // still goes out; the control socket's own 'close' will reopen it.
            try { socket.sendObject(obj); } catch (e2) { self.postMessage({error: e2}); }
        }
    } else {
        socket.sendObject(obj);
    }
}

/** Sends raw binary (touch) on the control socket if open, else the video socket. */
function controlSendBinary(binaryData) {
    if (controlChannelOpen()) {
        controlSocket.send(binaryData);
    } else {
        socket.send(binaryData);
    }
}

/**
 * Handles a message arriving on the CONTROL socket. The only payload the phone
 * sends here is the PONG sentinel (unittype 31). It (1) updates lastPongAt (the
 * PONG_TIMEOUT input the heartbeat reads) AND (2) re-arms the NO_DATA watchdog
 * (pongtimer). NO_DATA means "no binary AT ALL, video OR PONG" (see NO_DATA_TIMEOUT),
 * and the PONG is data-from-phone proof the link is alive — so it must re-arm the
 * watchdog exactly as a video frame does in handleVideoMessage. This mirrors the
 * ORIGINAL single-socket behaviour (where the PONG arrived on the same socket as
 * video and re-armed pongtimer) and the validated lab model. It is precisely what
 * lets B1 RIDE OUT a video head-of-line stall: while video is queued, the PONG keeps
 * arriving here, re-arms NO_DATA, and we do NOT reconnect. A truly dead link stops
 * the PONG too, so NO_DATA still fires then — no regression.
 */
function handleControlMessage(event) {
    if (typeof event.data === 'string') {
        // The control channel only carries the PONG sentinel today; ignore any
        // unexpected text frame without disturbing stream state.
        return;
    }
    const dat = new Uint8Array(event.data);
    if ((dat[4] & 0x1f) === 31) {
        lastPongAt = Date.now();
        // Re-arm NO_DATA: the PONG is proof-of-liveness, just like a video frame.
        // Without this a video-only stall fires noPong() and reconnects even though
        // the link is alive on the control channel — which would defeat B1.
        if (pongtimer !== null) clearTimeout(pongtimer);
        pongtimer = setTimeout(noPong, NO_DATA_TIMEOUT);
    }
}

/**
 * Opens (or reopens) the dedicated control socket on controlChannelPort, using the
 * same wss scheme/host as the video socket. No-op when controlChannelPort is falsy
 * (old phone). The video socket's reconnect/backoff logic is the source of truth;
 * this socket only mirrors PING/PONG + touch and reopens itself if it drops alone.
 */
function startControlSocket() {
    if (!controlChannelPort) {
        return; // Legacy single-socket path: nothing to do.
    }
    // Tear down any previous control socket before opening a fresh one (called on
    // every (re)connect with a possibly-changed port).
    closeControlSocket();

    controlSocket = new WebSocket(`wss://taada.top:${controlChannelPort}`);
    controlSocket.binaryType = "arraybuffer";

    controlSocket.addEventListener('open', () => {
        controlSocket.binaryType = "arraybuffer";
        debugLog('control WS open (port ' + controlChannelPort + ')');
    });

    controlSocket.addEventListener('message', event => handleControlMessage(event));

    // If the control socket dies on its own (without the video socket dropping),
    // reopen it after a short delay. Until it is back, controlSendObject/Binary
    // transparently fall back to the video socket, so PING/touch keep flowing and
    // the video-socket watchdog/reconnect is never affected.
    const reopenIfStale = (ev) => {
        if (ev && ev.target !== controlSocket) {
            return; // stale socket event after we already replaced it
        }
        if (isServerShuttingDown || isReconnecting || !controlChannelPort) {
            return; // a full reconnect (or shutdown) will rebuild it via startSocket()
        }
        debugLog('control WS closed (port ' + controlChannelPort + ') — reopening');
        setTimeout(() => {
            // Only reopen if a full reconnect hasn't taken over in the meantime.
            if (!isServerShuttingDown && !isReconnecting && controlChannelPort) {
                startControlSocket();
            }
        }, BASE_RECONNECTION_DELAY);
    };
    controlSocket.addEventListener('close', reopenIfStale);
    controlSocket.addEventListener('error', reopenIfStale);
}

/** Closes and clears the control socket (silent — no reconnect side effects). */
function closeControlSocket() {
    if (controlSocket) {
        const old = controlSocket;
        controlSocket = null; // null FIRST so reopenIfStale's stale-target guard fires
        try { old.close(); } catch (e) { /* ignore */ }
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
            try { socket.close(4002, 'connectTimeout10s'); } catch (e) { try { socket.close(); } catch (e2) { /* ignore */ } }
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

        // Baseline the watchdogs until the first real PONG / heartbeat tick, so a
        // slow (backoff) reconnect is not mistaken for a Worker suspension.
        lastPongAt = Date.now();
        lastHeartbeatAt = Date.now();

        console.log('✅ WebSocket connected successfully');
        debugLog('WS open (port ' + port + ')');

        // B1: bring up the dedicated control socket alongside the video socket on
        // (re)connect. No-op when controlChannelPort is falsy (legacy single-socket).
        startControlSocket();

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
    const closeCode = (event && typeof event.code !== 'undefined') ? event.code : 'n/a';
    const closeReason = (event && event.reason) ? event.reason : '';
    const wasClean = (event && typeof event.wasClean !== 'undefined') ? event.wasClean : 'n/a';
    console.log('Socket closed — code=' + closeCode + ', reason="' + closeReason + '", wasClean=' + wasClean);

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
    // B1: drop the control socket too; the video socket's reconnect drives the
    // rebuild. With isReconnecting now true, its reopen handler stays suppressed —
    // startControlSocket() in the next video 'open' reopens it on the fresh port.
    // No-op (controlSocket === null) on the legacy single-socket path.
    closeControlSocket();

    // Backoff exponentiel plafonné à 30 s. La reconnexion n'abandonne JAMAIS: le
    // lien Wi-Fi phone↔voiture finit toujours par revenir, et recharger la page
    // hors-ligne la bloquerait. Au-delà du seuil, on ne change que le message.
    const exponentialDelay = Math.min(
        BASE_RECONNECTION_DELAY * Math.pow(2, reconnectionAttempt - 1),
        MAX_RECONNECTION_DELAY
    );

    console.log(`🔄 Connection lost. Reconnection attempt ${reconnectionAttempt} in ${exponentialDelay}ms`);

    // Persisted diagnostic (survives refresh, shown in the ?debug panel): WHY the
    // live socket closed plus what the client last received. A large sinceLastPong
    // with a much smaller sinceLastFrame (or vice-versa) tells us which half of the
    // stream starved; code/reason carries the watchdog tag set in forceReconnect().
    debugLog('disconnect #' + reconnectionAttempt
        + ' code=' + closeCode + ' reason="' + closeReason + '"'
        + ' sinceLastPong=' + (lastPongAt ? (Date.now() - lastPongAt) + 'ms' : 'n/a')
        + ' sinceLastFrame=' + (lastFrameAt ? (Date.now() - lastFrameAt) + 'ms' : 'n/a')
        + ' backlog=' + (m.totalRxFrames - m.totalRendered)
        + ' pongDef=' + (m.pingsSent - m.pongsRx)
        + ' dq=' + (decoder !== null ? decoder.decodeQueueSize : -1)
        + ' pf=' + pendingFrames.length
        + ' retryIn=' + exponentialDelay + 'ms');

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

        // Re-découvrir le téléphone: il re-randomise le port à chaque
        // redémarrage du service, et un changement de résolution (qui redémarre
        // justement le service) périme les dimensions capturées à l'INIT.
        const discovery = await rediscoverPort();

        // Le shutdown a pu arriver pendant l'await.
        if (isServerShuttingDown) {
            isReconnecting = false;
            return;
        }

        // Adopter le port et la géométrie fraîchement découverts. Si toutes les
        // sondes ont échoué (discovery === null), on conserve les dernières
        // valeurs connues et on retente quand même la connexion.
        if (discovery) {
            const portChanged = discovery.port !== port;
            port = discovery.port;
            // B1: the phone re-randomises ALL its ports on a service restart, so the
            // control port can change too. Adopt the fresh one (still null on an old
            // phone). startControlSocket() in the video 'open' handler picks it up.
            controlChannelPort = discovery.controlChannelPort || null;
            applyRediscoveredConfig(discovery);
            debugLog('reconnect #' + reconnectionAttempt + ' → discovered port ' + discovery.port
                + (portChanged ? ' (CHANGED — phone service restarted)' : ' (same — in-place reconnect)'));
        } else {
            debugLog('reconnect #' + reconnectionAttempt + ' → port rediscovery FAILED, retrying on last port ' + port);
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
                error: (e) => { debugLog('webcodecs probe error: ' + (e && e.message ? e.message : e)); resolve(false); }
            });
            decoder.configure({codec: 'avc1.42002a', codedHeight: 1080, codedWidth: 1920});
            const chunk = new EncodedVideoChunk({
                type: "key",
                timestamp: 0,
                data: sample
            });
            decoder.decode(chunk);
            // fallback in case output or error doesn't fire. A capable browser
            // can still miss this 1 s window on a cold GPU decode service, which
            // wrongly condemns the whole session to Broadway — logged so the field
            // shows when the INITIAL choice was a probe timeout, not a real failure.
            setTimeout(() => { debugLog('webcodecs probe timeout (1s) → Broadway'); resolve(false); }, 1000);
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
                    // B1: route on the control socket when present, else video socket.
                    controlSendObject(message.data);
                    return;
                }

                // Envoyer directement le buffer binaire
                // B1: touch rides the control socket when present so it isn't stuck
                // behind queued video; falls back to the video socket otherwise.
                controlSendBinary(binaryData);

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
                // Fallback to JSON si erreur — B1: control socket when present.
                controlSendObject(message.data);
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
        controlChannelPort = message.data.controlChannelPort || null;
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
                switchToBroadway('resize-reconfigure-threw: ' + (e && e.message ? e.message : e));
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
    } else if (message.data.action === 'VISIBILITY') {
        // Relayed by main.js from document.visibilitychange. A worker cannot see
        // page visibility itself; this is what lets workerWasSuspended() tell a
        // REAL backgrounding (phone call) from a CPU-starved event loop.
        pageHidden = message.data.hidden === true;
        if (pageHidden) {
            lastVisibilityHiddenAt = Date.now();
        }
        debugLog('page visibility: ' + (pageHidden ? 'hidden' : 'visible'));
    } else if(!initted) {
        postInitJobs.push(message);
    } else {
        messageHandler(message)
    }
});