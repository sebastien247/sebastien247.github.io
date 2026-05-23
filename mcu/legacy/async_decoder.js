importScripts("polyfills.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorValues(e) { if (null != e) { var t = e["function" == typeof Symbol && Symbol.iterator || "@@iterator"], r = 0; if (t) return t.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) return { next: function next() { return e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e }; } }; } throw new TypeError(_typeof(e) + " is not iterable"); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
importScripts("Decoder.js");
importScripts("binary_touch_protocol.js");

// ========== Constants and Variable Declarations ==========

var MAX_TEXTURE_POOL_SIZE = 5;
var pendingFrames = [],
  underflow = true,
  night = false,
  frameTimes = [],
  runtime = 0,
  frameCounter = 0,
  sps,
  decoder = null,
  socket,
  height,
  width,
  port,
  gl,
  heart = 0,
  frameCounterTimer = 0,
  broadwayDecoder = null,
  lastheart = 0,
  pongtimer,
  frameRate,
  lastPongAt = 0,
  // Timestamp of the last server PONG sentinel (unittype 31)
  connectTimeout = null,
  // Watchdog handle for a WebSocket stuck in CONNECTING
  isServerShuttingDown = false,
  // 🚨 Flag pour indiquer que le serveur s'arrête
  firstVideoFrameReceived = false,
  // Flag to track first video frame
  firstFrameDecoded = false; // Flag to fire trace 17 once per session (reset in resetStreamStateForReconnect)

var texturePool = [];

// WebGL handles populated by initCanvas — declared explicitly so the
// assignments are never implicit globals (safe under strict-mode transpilation).
var positionLocation, texcoordLocation, positionBuffer, texcoordBuffer;

// Software-render mode (MCU1/QtCarBrowser): no OffscreenCanvas or WebGL2, so
// Broadway decodes here and RGBA frames are postMessage'd to the main thread.
var softwareRender = false;

// True decoded dimensions of the latest Broadway frame, reported by
// onPictureDecoded. Software-render mode ships these (not the width/height
// globals, which can lag a resolution change) so the 2D canvas is sized right.
var broadwayWidth = 0,
  broadwayHeight = 0;

// ========== WebSocket Reconnection Management ==========
var isReconnecting = false; // Flag pour éviter les tentatives de reconnexion multiples
var reconnectionAttempt = 0; // Compteur de tentatives de reconnexion
var reconnectionTimeout = null; // Référence au timeout de reconnexion
var forceReconnectPending = false; // True between forceReconnect() and socketClose()
var SOFT_RECONNECTION_THRESHOLD = 5; // Attempts after which only the UI message changes — reconnection never stops
var BASE_RECONNECTION_DELAY = 2000; // Délai de base en ms (2 secondes)
var MAX_RECONNECTION_DELAY = 30000; // Délai maximum en ms (30 secondes)
var PONG_TIMEOUT = 6000; // No server PONG for this long ⇒ dead control channel

// The phone re-randomises the WebSocket port on every service start; the stable
// HTTP discovery endpoint is served on this fixed port range.
var DISCOVERY_PORT_BASE = 8081;
var DISCOVERY_PORT_COUNT = 5;

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

var BINARY_TOUCH_DEBUG = false; // Mettre à true pour voir les statistiques de compression

// Instance de l'encodeur binaire pour les touch events
var binaryTouchEncoder = null;

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
  return (value & value - 1) == 0;
}
function appendByteArray(buffer1, buffer2) {
  var tmp = new Uint8Array((buffer1.byteLength | 0) + (buffer2.byteLength | 0));
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
  if (softwareRender) {
    // Broadway (built with {rgb:true}) hands back a fresh per-frame RGBA
    // Uint8Array, so transferring its buffer is safe and zero-copy. Ship the
    // real decoded dimensions — not the width/height globals, which can be a
    // stale resolution — so the main thread sizes its 2D canvas correctly.
    self.postMessage({
      frameBuffer: image.buffer,
      width: broadwayWidth || width,
      height: broadwayHeight || height
    }, [image.buffer]);
    return;
  }
  var texture = getTexture(gl);
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
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}
function switchToBroadway() {
  console.log("Switching to broadway decoder");
  try { self.postMessage({ trace: '10. switchToBroadway: calling new Decoder({rgb:true})' }); } catch (_te) {}
  decoder = null;
  broadwayDecoder = new Decoder({
    rgb: true
  });
  try { self.postMessage({ trace: '11. switchToBroadway: Decoder constructor returned' }); } catch (_te) {}
  broadwayDecoder.onPictureDecoded = function (buffer, decodedWidth, decodedHeight) {
    if (!firstFrameDecoded) {
      firstFrameDecoded = true;
      try { self.postMessage({ trace: '17. First frame decoded (w=' + decodedWidth + ' h=' + decodedHeight + ')' }); } catch (_te) {}
    }
    // Broadway reports the true decoded frame size here — the only reliable
    // source. The width/height globals can lag behind a resolution change.
    if (decodedWidth) {
      broadwayWidth = decodedWidth;
    }
    if (decodedHeight) {
      broadwayHeight = decodedHeight;
    }
    pendingFrames.push(buffer);
    if (underflow) {
      renderFrame();
    }
  };
}

/**
 * Creates a fresh WebCodecs VideoDecoder. Extracted so the decoder can be
 * recreated on reconnect — a decoder wedged on a partial GOP from before the
 * drop would otherwise stay wedged after it.
 */
function createVideoDecoder() {
  // MCU1/QtCarBrowser has no WebCodecs — never let a bare VideoDecoder
  // reference throw; the caller falls back to the Broadway decoder.
  if (typeof VideoDecoder === 'undefined') {
    return;
  }
  decoder = new VideoDecoder({
    output: function output(frame) {
      pendingFrames.push(frame);
      if (underflow) {
        renderFrame();
      }
    },
    error: function error(e) {
      switchToBroadway();
    }
  });
}
function initCanvas(canvas, forceBroadway) {
  // Software-render mode: no OffscreenCanvas was transferred and there is no
  // WebGL context to build. width/height came from the INIT message.
  if (softwareRender) {
    try { self.postMessage({ trace: '9. initCanvas: software branch, calling switchToBroadway' }); } catch (_te) {}
    switchToBroadway();
    try { self.postMessage({ trace: '12. switchToBroadway returned, calling startSocket' }); } catch (_te) {}
    startSocket();
    return;
  }
  height = canvas.height;
  width = canvas.width;
  gl = canvas.getContext('webgl2');
  var vertexSource = "\n        attribute vec2 a_position;\n        attribute vec2 a_texCoord;\n        varying vec2 v_texCoord;\n        void main() {\n            gl_Position = vec4(a_position, 0, 1);\n            v_texCoord = a_texCoord;\n        }\n    ";
  var fragmentSource = "\n        precision mediump float;\n        uniform sampler2D u_image;\n        varying vec2 v_texCoord;\n        void main() {\n            gl_FragColor = texture2D(u_image, v_texCoord);\n        }\n    ";
  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  var program = gl.createProgram();
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
  if (!forceBroadway) {
    try {
      createVideoDecoder();
    } catch (e) {
      switchToBroadway();
    }
  } else {
    console.log("Forcing to broadway decoder");
    switchToBroadway();
  }
  startSocket();
}

// ========== Rendering and Decoder Functions ==========
function renderFrame() {
  return _renderFrame.apply(this, arguments);
}
function _renderFrame() {
  _renderFrame = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    var frame;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          underflow = pendingFrames.length === 0;
          if (!underflow) {
            _context3.n = 1;
            break;
          }
          return _context3.a(2);
        case 1:
          frame = pendingFrames.shift();
          drawImageToCanvas(frame);
          if (pendingFrames.length < 5) {
            socket.sendObject({
              action: "ACK"
            });
          }
          try {
            self.postMessage({
              fps: getFrameStats(),
              decodeQueueSize: decoder !== null ? decoder.decodeQueueSize : 0,
              pendingFrames: pendingFrames.length
            });
          } catch (e) {
            self.postMessage({
              error: e
            });
          }
          renderFrame();
        case 2:
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _renderFrame.apply(this, arguments);
}
function separateNalUnits(event) {
  var i = -1;
  return event.reduce(function (output, value, index, self) {
    if (value === 0 && self[index + 1] === 0 && self[index + 2] === 0 && self[index + 3] === 1) {
      i++;
    }
    if (!output[i]) {
      output[i] = [];
    }
    output[i].push(value);
    return output;
  }, []).map(function (dat) {
    return Uint8Array.from(dat);
  });
}
function videoMagic(dat) {
  var unittype = dat[4] & 0x1f;
  if (unittype === 1) {
    if (decoder !== null) {
      var chunk = new EncodedVideoChunk({
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
    if (broadwayDecoder !== null) {
      broadwayDecoder.decode(dat);
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
    var data = appendByteArray(sps, dat);
    if (decoder !== null) {
      var _chunk = new EncodedVideoChunk({
        type: 'key',
        timestamp: 0,
        duration: 0,
        data: data
      });
      if (decoder.state !== 'closed') {
        try {
          decoder.decode(_chunk);
        } catch (e) {
          console.error("Video decoder error", e);
          switchToBroadway();
        }
      } else {
        switchToBroadway();
      }
    }
    if (broadwayDecoder !== null) {
      broadwayDecoder.decode(data);
    }
  }
}
function headerMagic(dat) {
  var unittype = dat[4] & 0x1f;
  if (unittype === 7) {
    var config = {
      codec: "avc1.",
      codedHeight: height,
      codedWidth: width
    };
    for (var i = 5; i < 8; ++i) {
      var h = dat[i].toString(16);
      if (h.length < 2) {
        h = '0' + h;
      }
      config.codec += h;
    }
    sps = dat;
    if (decoder !== null) {
      try {
        decoder.configure(config);
      } catch (exc) {
        switchToBroadway();
      }
    }
    return;
  } else if (unittype === 8) sps = appendByteArray(sps, dat);else videoMagic(dat);
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
  if (lastPongAt !== 0 && Date.now() - lastPongAt > PONG_TIMEOUT) {
    console.warn('No PONG from phone for ' + (Date.now() - lastPongAt) + 'ms — forcing in-place reconnect');
    forceReconnect();
    return;
  }
  if (lastheart !== 0) {
    if (Date.now() - lastheart > 3000) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.sendObject({
            action: "START"
          });
        } catch (e) {
          self.postMessage({
            error: e
          });
          forceReconnect();
        }
      }
    }
  }
  lastheart = Date.now();
  var pingPayload = {
    action: "PING"
  };
  if (typeof frameRate !== 'undefined') {
    pingPayload.fps = frameRate;
  }
  socket.sendObject(pingPayload);
}
function handleMessage(event) {
  // 🚨 NOUVEAU: Vérifier si c'est un message texte (JSON) ou binaire
  if (typeof event.data === 'string') {
    try {
      var message = JSON.parse(event.data);

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
    var dat = new Uint8Array(event.data);
    handleVideoMessage(dat);
  }
}
function handleVideoMessage(dat) {
  // 🚨 AMÉLIORATION: Réinitialiser le watchdog sur TOUT paquet vidéo reçu
  // Cela prouve que la connexion est active même si le PING/PONG spécifique saute
  if (pongtimer !== null) clearTimeout(pongtimer);
  pongtimer = setTimeout(noPong, 3000);
  var unittype = dat[4] & 0x1f;
  if (unittype === 31) {
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
      try { self.postMessage({ trace: '16. First IDR received (len=' + dat.length + ')' }); } catch (_te) {}
      console.log("First IDR keyframe decoded, notifying main thread");

      // Send progress update and videoFrameReceived notification
      self.postMessage({
        connectionProgress: {
          step: 3,
          message: '3/3 - First frame received!'
        }
      });
      self.postMessage({
        videoFrameReceived: true
      });
    }
  } else separateNalUnits(dat).forEach(headerMagic);
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
function rediscoverPort() {
  return _rediscoverPort.apply(this, arguments);
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
function _rediscoverPort() {
  _rediscoverPort = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
    var _loop, _ret, i;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          _loop = /*#__PURE__*/_regenerator().m(function _loop() {
            var discoveryPort, controller, timeout, url, response, json, _t, _t2;
            return _regenerator().w(function (_context4) {
              while (1) switch (_context4.p = _context4.n) {
                case 0:
                  discoveryPort = DISCOVERY_PORT_BASE + i;
                  _context4.p = 1;
                  controller = new AbortController();
                  timeout = setTimeout(function () {
                    return controller.abort();
                  }, 3000);
                  url = "https://taada.top:".concat(discoveryPort, "/getsocketport?w=").concat(width, "&h=").concat(height, "&webcodec=true&reconnect=true");
                  _context4.n = 2;
                  return fetch(url, {
                    method: 'get',
                    signal: controller.signal
                  });
                case 2:
                  response = _context4.v;
                  clearTimeout(timeout);
                  if (response.ok) {
                    _context4.n = 3;
                    break;
                  }
                  return _context4.a(2, 0);
                case 3:
                  _t = JSON;
                  _context4.n = 4;
                  return response.text();
                case 4:
                  json = _t.parse.call(_t, _context4.v);
                  if (!(json && json.port)) {
                    _context4.n = 5;
                    break;
                  }
                  console.log("Rediscovered WebSocket port ".concat(json.port, " via discovery port ").concat(discoveryPort));
                  return _context4.a(2, {
                    v: json
                  });
                case 5:
                  _context4.n = 7;
                  break;
                case 6:
                  _context4.p = 6;
                  _t2 = _context4.v;
                  console.log("Discovery port ".concat(discoveryPort, " failed: ").concat(_t2.message));
                case 7:
                  return _context4.a(2);
              }
            }, _loop, null, [[1, 6]]);
          });
          i = 0;
        case 1:
          if (!(i < DISCOVERY_PORT_COUNT)) {
            _context5.n = 5;
            break;
          }
          return _context5.d(_regeneratorValues(_loop()), 2);
        case 2:
          _ret = _context5.v;
          if (!(_ret === 0)) {
            _context5.n = 3;
            break;
          }
          return _context5.a(3, 4);
        case 3:
          if (!_ret) {
            _context5.n = 4;
            break;
          }
          return _context5.a(2, _ret.v);
        case 4:
          i++;
          _context5.n = 1;
          break;
        case 5:
          console.warn('Port rediscovery failed on all ports, keeping last known port ' + port);
          return _context5.a(2, null);
      }
    }, _callee4);
  }));
  return _rediscoverPort.apply(this, arguments);
}
function applyRediscoveredConfig(json) {
  if (!json) {
    return;
  }

  // Mirror main.js postWorkerMessages(): the resolution index maps to fixed
  // decoder dimensions. Keep the two in lockstep.
  var newWidth, newHeight;
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
  var dimensionsChanged = newWidth !== width || newHeight !== height;
  width = newWidth;
  height = newHeight;
  if (dimensionsChanged && gl) {
    // Only the worker can resize the canvas after transferControlToOffscreen.
    // Assigning width/height reallocates (and clears) the drawing buffer, so
    // do it only on a real change to avoid a black flash on a plain reconnect.
    gl.canvas.width = width;
    gl.canvas.height = height;
    gl.viewport(0, 0, width, height);
    console.log("Reconnect: resized decoder/canvas to ".concat(width, "x").concat(height));
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
  firstFrameDecoded = false;
  lastheart = 0;
  lastPongAt = 0;
  if (pongtimer) {
    clearTimeout(pongtimer);
    pongtimer = null;
  }
  var _iterator = _createForOfIteratorHelper(pendingFrames),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var frame = _step.value;
      if (frame && frame.close) {
        try {
          frame.close();
        } catch (e) {/* frame already closed */}
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
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
      try {
        decoder.close();
      } catch (e) {/* already closed */}
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
    try {
      socket.close();
    } catch (e) {/* ignore */}
  } else {
    console.log('Forcing in-place reconnect: socket already closed');
    socketClose({
      reason: 'forced reconnect'
    });
  }
}
function startSocket() {
  // Committing to a new socket: allow this socket's own failure to schedule a
  // fresh reconnect. socketClose() re-asserts isReconnecting on failure; the
  // 'open' handler below clears it for good on success.
  isReconnecting = false;
  forceReconnectPending = false;
  try { self.postMessage({ trace: '13. startSocket: new WebSocket(wss://taada.top:' + port + ')' }); } catch (_te) {}
  socket = new WebSocket("wss://taada.top:".concat(port));
  try { self.postMessage({ trace: '14. WebSocket constructor returned' }); } catch (_te) {}
  socket.sendObject = function (obj) {
    try {
      socket.send(JSON.stringify(obj));
    } catch (e) {
      self.postMessage({
        error: e
      });
    }
  };
  socket.binaryType = "arraybuffer";

  // Watchdog: a socket stuck in CONNECTING never fires 'open'. Close it so the
  // 'close' event drives socketClose() into another backoff attempt instead of
  // wedging isReconnecting=true forever.
  if (connectTimeout) {
    clearTimeout(connectTimeout);
  }
  connectTimeout = setTimeout(function () {
    if (socket && socket.readyState === WebSocket.CONNECTING) {
      console.warn('WebSocket connect timed out, closing to retry');
      try {
        socket.close();
      } catch (e) {/* ignore */}
    }
  }, 10000);
  socket.addEventListener('open', function () {
    try { self.postMessage({ trace: '15. WebSocket OPEN' }); } catch (_te) {}
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
    socket.sendObject({
      action: "START"
    });
    socket.sendObject({
      action: "NIGHT",
      value: night
    });

    // Au lieu de demander un keyframe immédiatement, attendons un peu
    // pour voir si des données arrivent naturellement
    setTimeout(function () {
      // Ne demander un keyframe que si aucune frame n'a été reçue
      if (pendingFrames.length === 0 && underflow) {
        console.log("No frames received after socket open, requesting keyframe");
        socket.sendObject({
          action: "REQUEST_KEYFRAME"
        });
      }
    }, 1000);
    if (heart === 0) {
      heart = setInterval(heartbeat, 1000);
    }
    if (frameCounterTimer === 0) {
      frameCounterTimer = setInterval(updateFrameCounter, 1000);
    }
  });
  socket.addEventListener('close', function (event) {
    return socketClose(event);
  });
  socket.addEventListener('error', function (event) {
    return socketClose(event);
  });
  socket.addEventListener('message', function (event) {
    return handleMessage(event);
  });
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
  var exponentialDelay = Math.min(BASE_RECONNECTION_DELAY * Math.pow(2, reconnectionAttempt - 1), MAX_RECONNECTION_DELAY);
  console.log("\uD83D\uDD04 Connection lost. Reconnection attempt ".concat(reconnectionAttempt, " in ").concat(exponentialDelay, "ms"));

  // 🚨 NOUVEAU: Notifier le thread principal de la perte de connexion
  self.postMessage({
    connectionLost: true,
    reason: event && event.reason || "Connection closed",
    reconnectionAttempt: reconnectionAttempt,
    nextRetryIn: exponentialDelay
  });

  // Afficher un message informatif (le texte change après le seuil souple).
  self.postMessage({
    error: reconnectionAttempt >= SOFT_RECONNECTION_THRESHOLD ? "Still reconnecting to phone (attempt ".concat(reconnectionAttempt, ")...") : "Lost connection to phone, trying to reconnect (attempt ".concat(reconnectionAttempt, ")...")
  });

  // Attendre le backoff, re-découvrir le port, puis relancer le socket.
  reconnectionTimeout = setTimeout(/*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var discovery;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          console.log("\uD83D\uDE80 Attempting reconnection #".concat(reconnectionAttempt));

          // Re-découvrir le téléphone: il re-randomise le port à chaque
          // redémarrage du service, et un changement de résolution (qui redémarre
          // justement le service) périme les dimensions capturées à l'INIT.
          _context.n = 1;
          return rediscoverPort();
        case 1:
          discovery = _context.v;
          if (!isServerShuttingDown) {
            _context.n = 2;
            break;
          }
          isReconnecting = false;
          return _context.a(2);
        case 2:
          // Adopter le port et la géométrie fraîchement découverts. Si toutes les
          // sondes ont échoué (discovery === null), on conserve les dernières
          // valeurs connues et on retente quand même la connexion.
          if (discovery) {
            port = discovery.port;
            applyRediscoveredConfig(discovery);
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
            socketClose({
              reason: 'reconnect setup failed'
            }); // Relancer le backoff
          }
        case 3:
          return _context.a(2);
      }
    }, _callee);
  })), exponentialDelay);
}
function isWebCodecsWorkingWithDecode() {
  return _isWebCodecsWorkingWithDecode.apply(this, arguments);
}
function _isWebCodecsWorkingWithDecode() {
  _isWebCodecsWorkingWithDecode = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
    var sample, _t3;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.p = _context6.n) {
        case 0:
          if (!(typeof VideoDecoder === 'undefined')) {
            _context6.n = 1;
            break;
          }
          return _context6.a(2, false);
        case 1:
          _context6.p = 1;
          sample = new Uint8Array([0, 0, 0, 1, 103, 66, 0, 42, 218, 1, 224, 8, 159, 150, 106, 2, 2, 2, 15, 20, 42, 160, 0, 0, 0, 1, 104, 206, 13, 136, 0, 0, 0, 1, 101, 184, 79, 255, 254, 30, 66, 128, 0, 128, 95, 147, 21, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 21, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 146, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 185, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 57, 46, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 75, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 192]);
          _context6.n = 2;
          return new Promise(function (resolve) {
            var decoder = new VideoDecoder({
              output: function output(frame) {
                frame.close();
                resolve(true);
              },
              error: function error() {
                return resolve(false);
              }
            });
            decoder.configure({
              codec: 'avc1.42002a',
              codedHeight: 1080,
              codedWidth: 1920
            });
            var chunk = new EncodedVideoChunk({
              type: "key",
              timestamp: 0,
              data: sample
            });
            decoder.decode(chunk);
            // fallback in case output or error doesn't fire
            setTimeout(function () {
              return resolve(false);
            }, 1000);
          });
        case 2:
          return _context6.a(2, _context6.v);
        case 3:
          _context6.p = 3;
          _t3 = _context6.v;
          return _context6.a(2, false);
      }
    }, _callee5, null, [[1, 3]]);
  }));
  return _isWebCodecsWorkingWithDecode.apply(this, arguments);
}
var appVersion = 22;
var initted = false;
var postInitJobs = [];
function messageHandler(message) {
  if (message.data.action === 'NIGHT') {
    night = message.data.value;
  }
  if (socket.readyState === WebSocket.OPEN) {
    var action = message.data.action;

    // Encoder les événements MULTITOUCH en binaire
    if (action === 'MULTITOUCH_DOWN' || action === 'MULTITOUCH_MOVE' || action === 'MULTITOUCH_UP' || action === 'MULTITOUCH_CANCEL') {
      initBinaryTouchEncoder();

      // Extraire les touches et allTouches du message
      var touches = message.data.touches || [];
      var allTouches = message.data.allTouches || [];
      var timestamp = message.data.timestamp || performance.now();

      // Si aucune touche, ne rien envoyer
      if (touches.length === 0) {
        console.warn('[BinaryTouch] No touches to send for action:', action);
        return;
      }
      try {
        // Encoder en binaire avec TOUS les paramètres (touches, allTouches, timestamp)
        var binaryData = binaryTouchEncoder.encode(action, touches, allTouches, timestamp);

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
          var jsonSize = JSON.stringify(message.data).length;
          console.log("[BinaryTouch] Sent ".concat(action, ":"), {
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
self.addEventListener('message', /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(message) {
    var useBroadway, codecWorking, config, i, h, canvas, lastFrame;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          if (!(message.data.action === 'INIT')) {
            _context2.n = 3;
            break;
          }
          try { self.postMessage({ trace: '8. Worker INIT received' }); } catch (_te) {}
          port = message.data.port;
          appVersion = parseInt(message.data.appVersion);
          useBroadway = message.data.broadway; // Software-render mode (MCU1): no canvas is transferred, so capture the
          // decoder geometry from the INIT message and skip the WebCodecs probe.
          softwareRender = !!message.data.softwareRender;
          if (softwareRender) {
            width = message.data.width;
            height = message.data.height;
            useBroadway = true;
          }
          if (useBroadway) {
            _context2.n = 2;
            break;
          }
          _context2.n = 1;
          return isWebCodecsWorkingWithDecode();
        case 1:
          codecWorking = _context2.v;
          if (codecWorking) {
            console.log("webcodec functional");
          } else {
            console.log("webcodec broken");
            useBroadway = true;
          }
        case 2:
          initCanvas(message.data.canvas, useBroadway);
          initted = true;
          if (postInitJobs.length > 0) {
            postInitJobs.forEach(function (msg) {
              return messageHandler(msg);
            });
            postInitJobs = [];
          }
          _context2.n = 7;
          break;
        case 3:
          if (!(message.data.action === 'RESIZE')) {
            _context2.n = 4;
            break;
          }
          // Gestion du changement de résolution
          console.log("Resizing decoder to " + message.data.width + "x" + message.data.height);
          width = message.data.width;
          height = message.data.height;

          // Mettre à jour la configuration du décodeur si nous utilisons WebCodec
          if (decoder !== null && decoder.state !== 'closed') {
            try {
              // Reconfigurer le décodeur avec les nouvelles dimensions
              config = {
                codec: "avc1.",
                codedHeight: height,
                codedWidth: width
              }; // Ajouter le codec spécifique si nous l'avons déjà
              if (sps && sps.length > 7) {
                for (i = 5; i < 8; ++i) {
                  h = sps[i].toString(16);
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
              self.postMessage({
                warning: "Résolution adaptée, en attente d'une nouvelle image clé..."
              });
            } catch (e) {
              console.error("Error reconfiguring decoder:", e);
              self.postMessage({
                error: "Erreur lors du changement de résolution: " + e.message
              });
              // En cas d'erreur, essayer de basculer vers Broadway
              switchToBroadway();
            }
          } else if (broadwayDecoder !== null) {
            // Pour Broadway, nous n'avons pas besoin de reconfiguration explicite
            // Le décodeur s'ajustera automatiquement à la nouvelle résolution
            console.log("Broadway decoder will automatically adjust to new resolution on next keyframe");
            self.postMessage({
              warning: "En attente d'une nouvelle image clé..."
            });
          }

          // Ajuster le viewport WebGL
          if (gl) {
            gl.viewport(0, 0, width, height);
          }
          _context2.n = 7;
          break;
        case 4:
          if (!(message.data.action === 'CANVAS_RESIZE')) {
            _context2.n = 6;
            break;
          }
          // Gestion du redimensionnement du canvas (offscreen)
          console.log("Resizing canvas to " + message.data.width + "x" + message.data.height);

          // Software-render mode has no WebGL context or offscreen canvas; just
          // record the new geometry. (CANVAS_RESIZE is currently never posted.)
          if (gl) {
            _context2.n = 5;
            break;
          }
          width = message.data.width;
          height = message.data.height;
          return _context2.a(2);
        case 5:
          // Accéder au canvas et le redimensionner
          canvas = gl.canvas;
          canvas.width = message.data.width;
          canvas.height = message.data.height;

          // Ajuster le viewport WebGL pour correspondre aux nouvelles dimensions
          gl.viewport(0, 0, message.data.width, message.data.height);

          // Mettre à jour les variables globales
          width = message.data.width;
          height = message.data.height;
          self.postMessage({
            info: "Canvas resized to " + width + "x" + height
          });
          _context2.n = 7;
          break;
        case 6:
          if (message.data.action === 'CLEAR_BUFFERS') {
            // Vider les tampons de frames en attente
            console.log("Clearing pending frames buffer, had " + pendingFrames.length + " frames");

            // Nettoyer en conservant éventuellement la dernière frame pour éviter l'écran noir
            if (pendingFrames.length > 0) {
              lastFrame = pendingFrames[pendingFrames.length - 1];
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
              socket.sendObject({
                action: "REQUEST_KEYFRAME"
              });
            }
          } else if (message.data.action === 'RESET_AA_PROFILE') {
            if (socket && socket.readyState === WebSocket.OPEN) {
              console.log("Sending RESET_AA_PROFILE to Android");
              socket.sendObject({
                action: "RESET_AA_PROFILE"
              });
            }
          } else if (!initted) {
            postInitJobs.push(message);
          } else {
            messageHandler(message);
          }
        case 7:
          return _context2.a(2);
      }
    }, _callee2);
  }));
  return function (_x) {
    return _ref2.apply(this, arguments);
  };
}());