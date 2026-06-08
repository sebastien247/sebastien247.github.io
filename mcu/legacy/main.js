function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _readOnlyError(r) { throw new TypeError('"' + r + '" is read-only'); }
var demuxDecodeWorker = new Worker("./async_decoder.js?v=" + (window._mcu1BundleVersion || '0')),
  latestVersion = 2,
  logElement = document.getElementById('log'),
  warningElement = document.getElementById('warning'),
  canvasElement = document.querySelector('canvas'),
  bodyElement = document.querySelector('body'),
  waitingMessageElement = document.getElementById('waiting-message'),
  errorOverlay = document.getElementById('error-overlay'),
  errorMessage = document.getElementById('error-message'),
  supportedWebCodec = true,
  //ToDo consider if older browser should be supported or not, ones without WebCodec, since Tesla does support this might not be needed.
  DEFAULT_HTTPS_PORT = 8081,
  MAX_PORT_RETRIES = 5;
var zoom = Math.max(1, window.innerHeight / 1080),
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
  drageventCounter = 0,
  videoFrameReceived = false,
  timeoutId,
  isServerShuttingDown = false,
  // 🚨 Flag pour éviter les actions en double lors du shutdown
  step2TimeoutId = null,
  isWaitingForReload = false; // 🚨 Flag pour indiquer qu'on attend la connexion pour recharger

// Software-render mode (MCU1/QtCarBrowser): main.js keeps the canvas and paints
// RGBA frames from the worker with a 2D context instead of transferring it.
var softwareCtx = null,
  swImageData = null;
// MJPEG mode (MCU1): the worker forwards pre-decoded JPEG frames; main.js paints
// them with a native Image() via JpegRenderer instead of Broadway RGBA.
var mjpegEnabled = false,
  jpegRenderer = null;
// MCU1 mjpeg/css-bg renders only on the software branch — a browser WITH
// OffscreenCanvas takes the WebCodec path and ignores JPEG. Ask the phone for
// codec=mjpeg only when we will actually take that branch; otherwise a modern
// browser flips the phone to JPEG, then ignores it, and stalls at step 2.
// ?mjpeg=1 forces the whole path (discovery + software branch + css-bg) so the
// Phase-2 Android side can be tested on a modern phone without a real MCU1.
var mjpegForced = findGetParameter("mjpeg") === "1",
  canDriveOffscreen = typeof canvasElement.transferControlToOffscreen === 'function' && typeof OffscreenCanvas !== 'undefined',
  requestMjpeg = mjpegForced || !canDriveOffscreen;
// Expose the negotiation decision for the on-device diagnostic panel (photo-friendly).
window._mcu1Mjpeg = { forced: mjpegForced, request: requestMjpeg, canOffscreen: canDriveOffscreen };

// Dynamic fit: on a window resize (mjpeg path only), tell the phone the new window
// size with a LIGHT discovery fetch so it recomputes the Android Auto insets + JPEG
// crop for the new ratio. This does NOT reconnect the video socket (calling
// checkPhone() would, and stalls on "waiting for stream"); the already-running
// transcoder just adopts the new content rect and the css-bg renderer auto-refits
// the new JPEG. Debounced. MCU1 has a fixed screen, so this fires mainly on desktop.
if (requestMjpeg) {
  var _mcu1FitTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(_mcu1FitTimer);
    _mcu1FitTimer = setTimeout(function () {
      try {
        fetch("https://taada.top:" + DEFAULT_HTTPS_PORT + "/getsocketport?w=" +
              window.innerWidth + "&h=" + window.innerHeight + "&webcodec=true&codec=mjpeg")
          .then(function (r) { return r.text(); })
          .then(function (txt) {
            try {
              var j = JSON.parse(txt);
              if (j.hasOwnProperty("widthMargin")) widthMargin = j.widthMargin;
              if (j.hasOwnProperty("heightMargin")) heightMargin = j.heightMargin;
              if (typeof updateCanvasSize === "function") updateCanvasSize();
            } catch (e) {}
          })
          .catch(function () {});
      } catch (e) {}
    }, 400);
  });
}
canvasElement.style.display = "none";

// Brief reconnects must NOT black the screen: the last JPEG persists as #videobg's
// CSS background, so a quick reconnect is far better shown as a ~1-2s frozen frame
// than a black flash. Only show the dark "Reconnecting" overlay if the outage
// outlasts OVERLAY_DELAY (a real, sustained drop). videoFrameReceived cancels it.
var _overlayTimer = null;
var OVERLAY_DELAY = 5000;

/**
 * 🚨 NOUVEAU: Affiche un message d'erreur dans l'overlay permanent
 * @param {string} message - Le message à afficher
 */
function showErrorOverlay(message) {
  if (errorOverlay && errorMessage) {
    errorMessage.textContent = message;
    errorOverlay.style.display = "flex";
    // The error overlay is opaque and covers #videobg — this IS the black flash the
    // tester sees on each reconnect (the last JPEG persists UNDER it as the CSS
    // background). Trace it so a reconnect->black is unambiguous in the log.
    if (window._mcu1Trace) window._mcu1Trace('OVERLAY shown (black covers video): ' + message);
  } else {
    console.error('Error overlay elements not found');
  }
}

/**
 * 🚨 NOUVEAU: Cache l'overlay d'erreur
 */
function hideErrorOverlay() {
  if (errorOverlay) {
    errorOverlay.style.display = "none";
    if (window._mcu1Trace) window._mcu1Trace('OVERLAY hidden (video visible again)');
  }
}

/**
 * Vérifie si le serveur est accessible
 * @returns {Promise<boolean>} True si le serveur est accessible
 */
function checkServerReachability() {
  return _checkServerReachability.apply(this, arguments);
}
/**
 * Attend que la connexion internet revienne
 * @returns {Promise<void>} Se résout quand la connexion est rétablie
 */
function _checkServerReachability() {
  _checkServerReachability = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var _controller, _timeoutId, response, _t;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.p = _context2.n) {
        case 0:
          _context2.p = 0;
          _controller = new AbortController();
          _timeoutId = setTimeout(function () {
            return _controller.abort();
          }, 3000); // Essayer de ping le serveur principal
          _context2.n = 1;
          return fetch("https://app.taada.top", {
            method: 'HEAD',
            signal: _controller.signal
          });
        case 1:
          response = _context2.v;
          clearTimeout(_timeoutId);
          return _context2.a(2, response.ok);
        case 2:
          _context2.p = 2;
          _t = _context2.v;
          console.log('Server not reachable:', _t.message);
          return _context2.a(2, false);
      }
    }, _callee2, null, [[0, 2]]);
  }));
  return _checkServerReachability.apply(this, arguments);
}
function waitForConnection() {
  return new Promise(function (resolve) {
    console.log('Waiting for internet connection...');
    showErrorOverlay("No internet connection. Waiting to reconnect...");
    var checkInterval;
    var isChecking = false;

    // Fonction pour vérifier la connexion
    var _checkConnection = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var isReachable;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              if (!isChecking) {
                _context.n = 1;
                break;
              }
              return _context.a(2);
            case 1:
              isChecking = true;
              console.log('Checking connection... navigator.onLine =', navigator.onLine);
              if (!navigator.onLine) {
                _context.n = 3;
                break;
              }
              _context.n = 2;
              return checkServerReachability();
            case 2:
              isReachable = _context.v;
              console.log('Server reachable:', isReachable);
              if (isReachable) {
                // Connexion rétablie !
                if (checkInterval) {
                  clearInterval(checkInterval);
                }
                window.removeEventListener('online', _checkConnection);
                showErrorOverlay("Connection restored. Reloading...");
                resolve();
              }
            case 3:
              isChecking = false;
            case 4:
              return _context.a(2);
          }
        }, _callee);
      }));
      return function checkConnection() {
        return _ref.apply(this, arguments);
      };
    }();

    // Vérifier périodiquement toutes les 2 secondes
    checkInterval = setInterval(_checkConnection, 2000);

    // Écouter aussi l'événement 'online' du navigateur pour réagir rapidement
    window.addEventListener('online', _checkConnection);

    // Faire une première vérification immédiate
    _checkConnection();
  });
}

/**
 * Recharge la page seulement quand internet est disponible
 * Attend si nécessaire que la connexion revienne
 * @param {string} reason - Raison du rechargement (pour les logs)
 */
function reloadWhenOnline() {
  return _reloadWhenOnline.apply(this, arguments);
}
/**
 * Updates the connection progress indicator with step-by-step status
 * @param {number} step - Current step (1, 2, or 3)
 * @param {string} message - Status message to display
 */
function _reloadWhenOnline() {
  _reloadWhenOnline = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    var reason,
      isReachable,
      _args3 = arguments;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          reason = _args3.length > 0 && _args3[0] !== undefined ? _args3[0] : 'Unknown';
          console.log("Reload requested: ".concat(reason));

          // 🚨 Marquer qu'on est en attente de reload
          isWaitingForReload = true;

          // Vérifier d'abord si nous sommes en ligne
          if (!navigator.onLine) {
            _context3.n = 2;
            break;
          }
          _context3.n = 1;
          return checkServerReachability();
        case 1:
          isReachable = _context3.v;
          if (!isReachable) {
            _context3.n = 2;
            break;
          }
          console.log('Internet available, reloading page');
          location.reload();
          return _context3.a(2);
        case 2:
          // Pas de connexion ou serveur injoignable, attendre
          console.log('No connection or server unreachable, waiting...');
          _context3.n = 3;
          return waitForConnection();
        case 3:
          // Une fois la connexion rétablie, attendre 1 seconde puis recharger
          setTimeout(function () {
            console.log('Connection restored, reloading page');
            location.reload();
          }, 1000);
        case 4:
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _reloadWhenOnline.apply(this, arguments);
}
function updateConnectionProgress(step, message) {
  var statusText = document.getElementById('connection-status-text');
  var stepElements = {
    1: document.getElementById('step-1'),
    2: document.getElementById('step-2'),
    3: document.getElementById('step-3')
  };
  if (statusText) {
    statusText.textContent = message;
  }

  // Update step indicators
  for (var i = 1; i <= 3; i++) {
    var stepElement = stepElements[i];
    if (!stepElement) continue;
    if (i < step) {
      // Previous steps are completed
      stepElement.classList.remove('active');
      stepElement.classList.add('completed');
    } else if (i === step) {
      // Current step is active
      stepElement.classList.remove('completed');
      stepElement.classList.add('active');
    } else {
      // Future steps are inactive
      stepElement.classList.remove('active', 'completed');
    }
  }

  // Troubleshoot message logic for step 2
  var troubleshootEl = document.getElementById('troubleshoot-message');
  if (troubleshootEl) {
    if (step === 2) {
      if (step2TimeoutId) clearTimeout(step2TimeoutId);
      troubleshootEl.style.display = 'none';
      step2TimeoutId = setTimeout(function () {
        troubleshootEl.style.display = 'block';
      }, 20000);
    } else {
      if (step2TimeoutId) {
        clearTimeout(step2TimeoutId);
        step2TimeoutId = null;
      }
      troubleshootEl.style.display = 'none';
    }
  }
}

/**
 * Converts screen coordinates to canvas coordinates, accounting for canvas position, scaling,
 * and image margins within the canvas
 * @param {number} screenX - The X coordinate on the screen
 * @param {number} screenY - The Y coordinate on the screen
 * @returns {{x: number, y: number}} The converted coordinates relative to the canvas
 */
function convertToCanvasCoordinates(screenX, screenY) {
  // MJPEG/css-bg path: the visible element is #videobg, NOT the canvas (which is
  // display:none here, so canvasElement.getBoundingClientRect() is all-zero — that
  // made the letterbox term below negative and offset every tap by half the image,
  // so a top-left tap landed in the centre / bottom-right). The emitted JPEG is
  // already cropped to the content rect (width-widthMargin x height-heightMargin)
  // and the content sits at the AA frame's TOP-LEFT (insets are right/bottom), so
  // map the tap straight into the content, accounting for any contain-letterbox.
  if (mjpegEnabled) {
    var vb = document.getElementById('videobg');
    var r = vb ? vb.getBoundingClientRect() : null;
    var cw = width - (widthMargin || 0);
    var ch = height - (heightMargin || 0);
    if (r && r.width > 0 && r.height > 0 && cw > 0 && ch > 0) {
      var contentRatio = cw / ch;
      var elRatio = r.width / r.height;
      var dispW, dispH, offX, offY;
      if (elRatio > contentRatio) {
        dispH = r.height; dispW = dispH * contentRatio; offX = (r.width - dispW) / 2; offY = 0;
      } else {
        dispW = r.width; dispH = dispW / contentRatio; offX = 0; offY = (r.height - dispH) / 2;
      }
      var mpx = Math.max(0, Math.min(1, (screenX - r.left - offX) / dispW));
      var mpy = Math.max(0, Math.min(1, (screenY - r.top - offY) / dispH));
      return { x: Math.floor(mpx * cw), y: Math.floor(mpy * ch) };
    }
  }

  // Get the canvas's bounding rectangle, which includes any CSS transformations
  var canvasRect = canvasElement.getBoundingClientRect();

  // Calculate the position relative to the canvas's top-left corner
  var canvasRelativeX = screenX - canvasRect.left;
  var canvasRelativeY = screenY - canvasRect.top;

  // Taille réelle de l'image (sans les marges internes du canvas)
  var imageWidth = width - (widthMargin || 0);
  var imageHeight = height - (heightMargin || 0);

  // Calculer les facteurs de zoom appliqués (même logique que updateCanvasSize)
  var zoomFactorWidth = window.innerWidth / imageWidth;
  var zoomFactorHeight = window.innerHeight / imageHeight;
  var actualZoomFactor = Math.min(zoomFactorWidth, zoomFactorHeight);

  // Taille réelle de l'image affichée après zoom
  var displayedImageWidth = imageWidth * actualZoomFactor;
  var displayedImageHeight = imageHeight * actualZoomFactor;

  // Calculer les marges d'affichage (bandes noires) autour de l'image
  var displayMarginX = (canvasRect.width - displayedImageWidth) / 2;
  var displayMarginY = (canvasRect.height - displayedImageHeight) / 2;

  // Position relative à l'image affichée (en excluant les marges d'affichage)
  var imageRelativeX = canvasRelativeX - displayMarginX;
  var imageRelativeY = canvasRelativeY - displayMarginY;

  // Calculer les pourcentages par rapport à la taille de l'image affichée
  var percentX = imageRelativeX / displayedImageWidth;
  var percentY = imageRelativeY / displayedImageHeight;

  // Appliquer les pourcentages aux dimensions réelles du canvas et ajouter l'offset des marges internes
  // La marge interne est divisée par 2 car elle est répartie des deux côtés
  var x = Math.floor((widthMargin || 0) / 2 + percentX * imageWidth);
  var y = Math.floor((heightMargin || 0) / 2 + percentY * imageHeight);
  return {
    x: x,
    y: y
  };
}
function handlepossition(possition) {
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
function tryPort(_x, _x2) {
  return _tryPort.apply(this, arguments);
}
/**
 * Teste plusieurs ports successivement jusqu'à trouver un serveur
 */
function _tryPort() {
  _tryPort = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(port, controller) {
    var urlToFetch;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          // MCU1: force resolution 0 (800x480) — viewport-sized frames overflow Tesla's per-tab memory budget and trigger the resource watchdog ("Navigateur fermé pour préserver les ressources").
          // codec=mjpeg asks the phone to send pre-decoded JPEG frames instead of H.264; an older build ignores it and we fall back to Broadway.
          // Only request it when we'll take the software/css-bg branch (no OffscreenCanvas) or when ?mjpeg=1 forces it — a modern browser that requests mjpeg but runs the WebCodec path stalls at step 2 (phone sends JPEG, bundle expects H.264).
          // MJPEG: send the real window size as w/h. The phone uses it ONLY to inset
          // Android Auto to the window ratio (letterbox margins) — the encoded frame
          // stays the codec size (800x480, echoed back in the response), so Tesla's
          // per-tab memory budget / resource watchdog is NOT hit. Non-mjpeg keeps the
          // MCU1-safe 800x480.
          var fitW = requestMjpeg ? window.innerWidth : 800;
          var fitH = requestMjpeg ? window.innerHeight : 480;
          urlToFetch = "https://taada.top:".concat(port, "/getsocketport?w=").concat(fitW, "&h=").concat(fitH, "&webcodec=").concat(supportedWebCodec) + (requestMjpeg ? "&codec=mjpeg" : "");
          console.log("Trying port ".concat(port, "..."));
          return _context4.a(2, new Promise(function (resolve, reject) {
            var timeout = setTimeout(function () {
              reject(new Error("Timeout on port ".concat(port)));
            }, 3000); // Timeout plus court par port

            fetch(urlToFetch, {
              method: 'get',
              signal: controller.signal
            }).then(function (response) {
              clearTimeout(timeout);
              if (!response.ok) {
                throw new Error("HTTP ".concat(response.status, " on port ").concat(port));
              }
              return response.text();
            }).then(function (data) {
              if (isJson(data)) {
                console.log("Successfully connected to port ".concat(port));
                resolve({
                  data: data,
                  port: port
                });
              } else {
                reject(new Error("Invalid response from port ".concat(port)));
              }
            }).catch(function (error) {
              clearTimeout(timeout);
              reject(error);
            });
          }));
      }
    }, _callee4);
  }));
  return _tryPort.apply(this, arguments);
}
function checkPhone() {
  return _checkPhone.apply(this, arguments);
}
function _checkPhone() {
  _checkPhone = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
    var i, _port, result, json, _t2, _t3;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.p = _context5.n) {
        case 0:
          console.log('Starting server discovery...');
          if (window._mcu1Trace) window._mcu1Trace('2. Discovery starting');

          // Step 1/3: Server Discovery
          updateConnectionProgress(1, '1/3 - Discovering server...');
          controller = new AbortController();
          _context5.p = 1;
          i = 0;
        case 2:
          if (!(i < MAX_PORT_RETRIES)) {
            _context5.n = 8;
            break;
          }
          _port = DEFAULT_HTTPS_PORT + i;
          _context5.p = 3;
          _context5.n = 4;
          return tryPort(_port, controller);
        case 4:
          result = _context5.v;
          if (!document.hidden) {
            _context5.n = 5;
            break;
          }
          setTimeout(function () {
            checkPhone();
          }, 2000);
          return _context5.a(2);
        case 5:
          // Serveur trouvé, traiter la réponse
          json = JSON.parse(result.data); // Ajouter le port utilisé aux logs pour information
          console.log("Server found on port ".concat(result.port, ", processing response..."));

          // Update progress: Server found, moving to next step
          updateConnectionProgress(1, '1/3 - Server found!');
          postWorkerMessages(json);
          return _context5.a(2);
        case 6:
          _context5.p = 6;
          _t2 = _context5.v;
          console.log("Port ".concat(_port, " failed: ").concat(_t2.message));

          // Continuer avec le port suivant
          if (!(i === MAX_PORT_RETRIES - 1)) {
            _context5.n = 7;
            break;
          }
          throw new Error("No server found after testing ports ".concat(DEFAULT_HTTPS_PORT, " to ").concat(DEFAULT_HTTPS_PORT + MAX_PORT_RETRIES - 1));
        case 7:
          i++;
          _context5.n = 2;
          break;
        case 8:
          _context5.n = 10;
          break;
        case 9:
          _context5.p = 9;
          _t3 = _context5.v;
          console.error('Server discovery failed:', _t3);

          // Afficher un message d'erreur à l'utilisateur
          /*if (warningElement) {
              warningElement.style.display = "block";
              logElement.style.display = "none";
              warningElement.innerText = "Unable to connect to server. Please check that TaaDa is running.";
          }*/

          // Réessayer après un délai
          setTimeout(function () {
            /*if (warningElement) {
                warningElement.style.display = "none";
                logElement.style.display = "block";
            }*/
            checkPhone();
          }, 5000);
        case 10:
          return _context5.a(2);
      }
    }, _callee5, null, [[3, 6], [1, 9]]);
  }));
  return _checkPhone.apply(this, arguments);
}
function findGetParameter(parameterName) {
  var result = null,
    tmp = [];
  location.search.substring(1).split("&").forEach(function (item) {
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
  var imageWidth = width - (widthMargin || 0);
  var imageHeight = height - (heightMargin || 0);

  // Calculer les facteurs de zoom nécessaires pour chaque dimension
  var zoomFactorWidth = window.innerWidth / imageWidth;
  var zoomFactorHeight = window.innerHeight / imageHeight;

  // Choisir le facteur de zoom le plus petit pour que l'image soit entièrement visible
  // (comportement "contain" - l'image remplit au maximum une dimension sans déborder)
  if (zoomFactorWidth <= zoomFactorHeight) {
    // On zoom en largeur : l'image remplira horizontalement, des bandes noires possibles verticalement
    canvasElement.style.width = "".concat(width * zoomFactorWidth, "px");
    canvasElement.style.height = '';
  } else {
    // On zoom en hauteur : l'image remplira verticalement, des bandes noires possibles horizontalement
    canvasElement.style.height = "".concat(height * zoomFactorHeight, "px");
    canvasElement.style.width = '';
  }
}
function postWorkerMessages(json) {
  if (window._mcu1Trace) window._mcu1Trace('3. Phone responded port=' + json.port + ' res=' + json.resolution + ' build=' + json.buildversion);
  // Make the phone's reported build + resolution accessible to the periodic
  // ~5s status trace in index.html, so a photo of any portion of log.html
  // shows them without needing the trace 3 line to be on screen.
  window._mcu1Build = json.buildversion;
  window._mcu1Res = json.resolution;
  mjpegEnabled = (json.codec === 'mjpeg');
  if (window._mcu1Trace) window._mcu1Trace('3b. codec=' + (json.codec || 'h264') + ' -> mjpeg=' + mjpegEnabled);
  if (json.hasOwnProperty("resolutionChanged")) {
    console.log("Resolution adjusted dynamically to " + json.width + "x" + json.height);

    // Ajuster le canvas sans recharger la page
    width = json.width;
    height = json.height;
    widthMargin = json.widthMargin;
    heightMargin = json.heightMargin;

    // Software-render mode: main.js owns the canvas backing store, so resize
    // it here (only the worker can resize a transferred OffscreenCanvas).
    if (softwareCtx) {
      canvasElement.width = width;
      canvasElement.height = height;
    }

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
    setTimeout(function () {
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
  // B1 control-channel discovery: a build-66+ phone advertises a SECOND WebSocket
  // port for PING/PONG + touch so they don't queue behind bulk H.264 video.
  // Null on older phones => the worker stays single-socket (legacy path).
  var controlChannelPort = json.controlChannelPort || null;
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
        alert("There is a new version in playstore, please update your app.");
        localStorage.setItem("showupdate", latestVersion);
      }
    }
  }

  // Build 65+ re-sends the H.264 codec config on reconnect; older APKs leave the decoder black after a Wi-Fi drop.
  if (appVersion < 65) {
    alert("You need to run TaaDa build 65 or newer to use this page. Your current build is " + appVersion + ", please update.\n\nIf the problem persists, contact me at seb.duboc.dev @ gmail.com");
    //return;
  }
  if (window._mcu1Trace) window._mcu1Trace('4. Build check done (build ' + appVersion + '), reading params');
  var forceBroadway = findGetParameter("broadway") === "1";
  // ?software=1 forces the MCU1 software-render path on any browser (testing).
  var forceSoftware = findGetParameter("software") === "1";
  if (window._mcu1Trace) window._mcu1Trace('5. Sizing canvas to ' + width + 'x' + height + ', canSwOffscreen=' + (typeof canvasElement.transferControlToOffscreen === 'function' && typeof OffscreenCanvas !== 'undefined'));
  canvasElement.width = width;
  canvasElement.height = height;

  // Appliquer la transformation d'échelle au conteneur
  //canvasElement.style.transform = "scale(" + zoom + ")";

  // OffscreenCanvas + transferControlToOffscreen drive the modern WebGL path.
  // MCU1/QtCarBrowser has neither — fall back to software render: main.js keeps
  // the canvas and paints RGBA frames the worker decodes with Broadway.
  var canSoftwareOffscreen = typeof canvasElement.transferControlToOffscreen === 'function' && typeof OffscreenCanvas !== 'undefined';
  // ?mjpeg=1 forces the software branch too, so codec=mjpeg + css-bg can be
  // exercised on a modern browser (which would otherwise take the WebCodec path).
  if (canSoftwareOffscreen && !forceSoftware && !mjpegForced) {
    // Modern path — unchanged: transfer the canvas to the worker.
    offscreen = canvasElement.transferControlToOffscreen();
    demuxDecodeWorker.postMessage({
      canvas: offscreen,
      port: port,
      controlChannelPort: controlChannelPort,
      action: 'INIT',
      appVersion: appVersion,
      broadway: forceBroadway,
      width: width,
      height: height
    }, [offscreen]);
  } else {
    // Software-render path (MCU1): no canvas transfer — main.js keeps the
    // canvas and a 2D context, and paints frames the worker ships back.
    if (window._mcu1Trace) window._mcu1Trace('6a. Software branch: calling getContext(2d)');
    softwareCtx = canvasElement.getContext('2d');
    if (window._mcu1Trace) window._mcu1Trace('6b. 2D context ' + (softwareCtx ? 'OK' : 'NULL') + ', posting INIT');
    demuxDecodeWorker.postMessage({
      port: port,
      controlChannelPort: controlChannelPort,
      action: 'INIT',
      appVersion: appVersion,
      broadway: true,
      softwareRender: true,
      mjpeg: mjpegEnabled,
      width: width,
      height: height
    });
    if (window._mcu1Trace) window._mcu1Trace('7. INIT postMessage returned');
  }
  if (!usebt)
    //If useBT is disabled start 2 websockets for PCM audio and create audio context
    {
      usebt = json.usebt;
      //document.getElementById("muteicon").style.display="block";
    }

  // Show the waiting message after socket port is retrieved
  canvasElement.style.display = "block";
  document.getElementById("info").style.display = "none";

  // Vérifier que waitingMessageElement existe
  if (waitingMessageElement) {
    console.log("Showing waiting message");
    waitingMessageElement.style.display = "flex";
    // Step 2/3: Socket connection will be handled by worker
    updateConnectionProgress(2, '2/3 - Connecting to stream...');
  } else {
    console.error("waitingMessageElement is null, trying to get it again");
    document.getElementById('waiting-message'), _readOnlyError("waitingMessageElement");
    if (waitingMessageElement) {
      console.log("Got waitingMessageElement, showing it");
      waitingMessageElement.style.display = "flex";
      updateConnectionProgress(2, '2/3 - Connecting to stream...');
    } else {
      console.error("waitingMessageElement still not found");
    }
  }
  demuxDecodeWorker.addEventListener("message", function (e) {
    // Live worker counters → the separate status store (overwritten, NOT appended to
    // the event trace), surfaced only in log.html's pinned STATUS header.
    if (e.data && e.data.hasOwnProperty('status')) {
      if (window._mcu1Status) window._mcu1Status('worker', e.data.status);
      return;
    }
    // Diagnostic trace from the worker.
    if (e.data && e.data.hasOwnProperty('trace')) {
      if (window._mcu1Trace) window._mcu1Trace('[worker] ' + e.data.trace);
      return;
    }
    // 🚨 NOUVEAU: Gérer le shutdown du serveur EN PREMIER (priorité maximale)
    if (e.data.hasOwnProperty('serverShutdown')) {
      console.warn('Server shutdown detected:', e.data.reason);

      // Marquer le flag pour éviter les actions en double
      isServerShuttingDown = true;

      // Cacher le message waiting
      if (waitingMessageElement) {
        waitingMessageElement.style.display = "none";
      }

      // 🚨 Afficher l'overlay d'erreur permanent
      showErrorOverlay("Server disconnected. Checking connection...");
      setTimeout(function () {
        reloadWhenOnline('Server shutdown');
      }, 3000);
      return;
    }

    // 🚨 NOUVEAU: Ignorer tous les autres messages si le serveur est en shutdown
    if (isServerShuttingDown) {
      console.log('Server is shutting down, ignoring message:', e.data);
      return;
    }

    // MJPEG mode: the worker shipped a ready JPEG data URI. Paint it as the
    // background-image of the #videobg div — ~24 fps on MCU1 vs ~6 for canvas.
    if (e.data.hasOwnProperty('jpegDataUrl')) {
      if (!jpegRenderer) {
        var videobg = document.getElementById('videobg');
        if (videobg) {
          videobg.style.display = 'block';
          canvasElement.style.display = 'none';
          jpegRenderer = new JpegRenderer(videobg, function (pw, ph, loadMs) {
            // v5 css-bg preload: onPaint fires once per frame ACTUALLY shown (post-decode,
            // in the preload Image's onload). So paints ~= visible fps, swapMax = longest a
            // single frame stayed up, and decMax/decSlow = the REAL decode latency of the
            // displayed frames (loadMs). The preload sets the css background-image only once
            // the frame is decoded, so #000 is never composited between frames (no flash).
            window._mcu1PaintCount = (window._mcu1PaintCount || 0) + 1;
            if (pw) window._mcu1PaintW = pw;
            if (ph) window._mcu1PaintH = ph;
            if (loadMs != null) {
              if (loadMs > (window._mcu1DecMax || 0)) window._mcu1DecMax = loadMs;
              if (loadMs > 33) window._mcu1DecSlow = (window._mcu1DecSlow || 0) + 1;
            }
            var _n = Date.now();
            if (window._mcu1LastSwapAt) {
              var _g = _n - window._mcu1LastSwapAt;
              if (_g > (window._mcu1SwapMax || 0)) window._mcu1SwapMax = _g;
            }
            window._mcu1LastSwapAt = _n;
            if (!window._mcu1FirstPaintTraced) {
              window._mcu1FirstPaintTraced = true;
              if (window._mcu1Trace) window._mcu1Trace('18. First JPEG frame painted (css-bg preload)');
            }
          });
        }
      }
      if (jpegRenderer) jpegRenderer.paint(e.data.jpegDataUrl);
      // (v4: decode latency is now measured directly by the double-buffer renderer's
      // <img> onload — see decMax/decSlow in the onPaint callback above — so the old
      // separate sampled Image() probe is gone.)
      return;
    }

    // Software-render mode: the worker shipped a decoded RGBA frame. Size
    // the 2D canvas to the real frame and paint it with a cached ImageData
    // (rebuilt only when the resolution changes).
    if (e.data.hasOwnProperty('frameBuffer')) {
      if (softwareCtx) {
        var frameBytes = new Uint8Array(e.data.frameBuffer);
        var fw = e.data.width,
          fh = e.data.height;
        if (fw > 0 && fh > 0 && frameBytes.length >= fw * fh * 4) {
          if (!swImageData || canvasElement.width !== fw || canvasElement.height !== fh) {
            // main.js owns the canvas in software mode (it was never
            // transferred), so resize its backing store here.
            canvasElement.width = fw;
            canvasElement.height = fh;
            width = fw;
            height = fh;
            swImageData = softwareCtx.createImageData(fw, fh);
            updateCanvasSize();
            console.log('Software render: canvas sized to ' + fw + 'x' + fh);
          }
          swImageData.data.set(frameBytes.length === fw * fh * 4 ? frameBytes : frameBytes.subarray(0, fw * fh * 4));
          softwareCtx.putImageData(swImageData, 0, 0);
          window._mcu1PaintCount = (window._mcu1PaintCount || 0) + 1;
          window._mcu1PaintW = fw;
          window._mcu1PaintH = fh;
          if (!window._mcu1FirstPaintTraced) {
            window._mcu1FirstPaintTraced = true;
            if (window._mcu1Trace) window._mcu1Trace('18. First frame painted (' + fw + 'x' + fh + ')');
          }
        }
      }
      return;
    }
    if (e.data.hasOwnProperty('error')) {
      console.error('Socket error received:', e.data.error);
      forcedRefreshCounter++;

      // Transient connection errors recover via the worker's in-place
      // WebSocket reconnect — never reload the page. The page is hosted
      // remotely (app.taada.top), so a reload hangs in a no-coverage zone.
      // serverShutdown stays the only legitimate reload path.
      warningElement.style.display = "block";
      logElement.style.display = "none";
      warningElement.innerText = "Error detected: " + e.data.error;
      setTimeout(function () {
        warningElement.style.display = "none";
        logElement.style.display = "block";
      }, 5000);
      return;
    }

    // 🚨 NOUVEAU: Gérer la perte de connexion
    if (e.data.hasOwnProperty('connectionLost')) {
      console.error('Connection lost to server:', e.data.reason);

      // Cacher le message waiting
      if (waitingMessageElement) {
        waitingMessageElement.style.display = "none";
      }

      // 🚨 Ne pas afficher l'overlay si on est déjà en attente de reload
      // (notre fonction reloadWhenOnline gère déjà l'affichage)
      if (!isWaitingForReload) {
        // Don't black the screen on a BRIEF reconnect (the common case while driving):
        // the last JPEG persists under the overlay, so defer it — only show the dark
        // overlay if still down after OVERLAY_DELAY. videoFrameReceived cancels it the
        // instant the stream is back, so a quick reconnect never flashes black.
        if (!_overlayTimer) {
          var _lostReason = e.data.reason;
          _overlayTimer = setTimeout(function () {
            _overlayTimer = null;
            showErrorOverlay("Connection lost: " + _lostReason + ". Reconnecting...");
          }, OVERLAY_DELAY);
        }
      }
      return;
    }

    // 🚨 Reconnexion: le worker a re-découvert la résolution du téléphone
    // après une coupure et a pu redimensionner le décodeur et le canvas.
    // Ré-appliquer la géométrie gérée par le thread principal — le
    // dimensionnement CSS (letterbox) et la conversion des coordonnées
    // tactiles — pour qu'un changement de résolution survive à la coupure.
    if (e.data.hasOwnProperty('resolutionUpdate')) {
      var update = e.data.resolutionUpdate;
      console.log("Reconnect resolution update: ".concat(update.width, "x").concat(update.height, ", margins ").concat(update.widthMargin, "x").concat(update.heightMargin));
      width = update.width;
      height = update.height;
      widthMargin = update.widthMargin;
      heightMargin = update.heightMargin;
      // Software-render mode: main.js owns the canvas, so resize its
      // backing store here (the worker can't — it was never transferred).
      if (softwareCtx) {
        canvasElement.width = width;
        canvasElement.height = height;
      }
      updateCanvasSize();
      return;
    }
    if (e.data.hasOwnProperty('warning')) {
      warningElement.style.display = "block";
      logElement.style.display = "none";
      warningElement.innerText = e.data.warning;
      setTimeout(function () {
        warningElement.style.display = "none";
        logElement.style.display = "block";
      }, 2000);
    }

    // Handle AA status updates from worker
    // Handle connection progress updates from worker
    if (e.data.hasOwnProperty('connectionProgress')) {
      var progress = e.data.connectionProgress;
      updateConnectionProgress(progress.step, progress.message);
    }

    // Hide the waiting message when first video frame is received
    if (e.data.hasOwnProperty('videoFrameReceived')) {
      console.log("Video frame received message received!", e.data);
      videoFrameReceived = true;

      // Stream is live again — cancel any pending overlay AND clear a shown one, so a
      // quick reconnect never blacks the screen.
      if (_overlayTimer) { clearTimeout(_overlayTimer); _overlayTimer = null; }
      hideErrorOverlay();

      // Update to step 3/3 - Stream ready
      updateConnectionProgress(3, '3/3 - Stream ready!');

      // Hide the waiting message after a short delay to show completion
      setTimeout(function () {
        if (waitingMessageElement) {
          waitingMessageElement.style.display = "none";
          console.log("Hiding waiting message");
        } else {
          console.error("waitingMessageElement not found");
        }
      }, 1000);
    }
    if (debug) {
      logElement.innerText = "".concat(height, "p - FPS ").concat(e.data.fps, ", decoder que: ").concat(e.data.decodeQueueSize, ", pendingFrame: ").concat(e.data.pendingFrames, ", forced refresh counter: ").concat(forcedRefreshCounter);
    }
  });

  // Resolve the dark-mode query once. MediaQueryList.addEventListener did not
  // exist before Safari 14 (MCU1/QtCarBrowser is WebKit 601/534) — calling it
  // unguarded there throws and aborts startup, so feature-detect it.
  var darkModeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  demuxDecodeWorker.postMessage({
    action: "NIGHT",
    value: !!(darkModeQuery && darkModeQuery.matches)
  });
  if (darkModeQuery && darkModeQuery.addEventListener) {
    darkModeQuery.addEventListener('change', function (event) {
      demuxDecodeWorker.postMessage({
        action: "NIGHT",
        value: event.matches
      });
    });
  }

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
  item = typeof item !== "string" ? JSON.stringify(item) : item;
  try {
    item = JSON.parse(item);
  } catch (e) {
    return false;
  }
  return _typeof(item) === "object" && item !== null;
}

// Ajout de variables pour la gestion optimisée des événements tactiles multitouch
var activeTouches = new Map(); // Suivi des touches actives avec leurs IDs
var touchMovePending = false;
var latestTouchData = null; // Stocke les données converties, pas l'événement
// 4ms (250Hz) → plus fluide mais plus gourmand en ressources
// 8ms (120Hz) → bon équilibre entre fluidité et performance
// 16ms (60Hz) → économie supplémentaire de ressources mais un peu moins fluide

/**
 * Convertit une TouchList en tableau de coordonnées avec leurs IDs
 * @param {TouchList} touchList - Liste des touches
 * @returns {Array} Tableau d'objets {id, x, y}
 */
function convertTouchListToCoords(touchList) {
  var coords = [];
  for (var i = 0; i < touchList.length; i++) {
    var touch = touchList[i];
    var canvasCoords = convertToCanvasCoordinates(touch.clientX, touch.clientY);
    coords.push({
      id: touch.identifier,
      x: canvasCoords.x,
      y: canvasCoords.y
    });
  }
  return coords;
}

/**
 * Initialise l'audio au premier contact tactile si nécessaire
 */
function initializeAudioOnFirstTouch() {
  // TEMPORAIREMENT DESACTIVE : Empêche l'avertissement "Vidéo bridée" sur le navigateur Tesla (2026.2.6.1) dû à la détection de l'AudioContext
  return;
  if (!audiostart && !usebt) {
    mediaPCM = new PCMPlayer({
      encoding: '16bitInt',
      channels: 2,
      sampleRate: 48000
    });
    ttsPCM = new PCMPlayer({
      encoding: '16bitInt',
      channels: 1,
      sampleRate: 16000
    });
    var muteIcon = document.getElementById("muteicon");
    if (muteIcon) {
      muteIcon.remove();
    }
    startAudio();
    audiostart = true;
  }
}

/**
 * Gère l'événement touchstart
 * @param {TouchEvent} event - L'événement tactile
 */
function handleTouchStart(event) {
  event.preventDefault();
  initializeAudioOnFirstTouch();
  var newTouches = convertTouchListToCoords(event.changedTouches);
  newTouches.forEach(function (touch) {
    return activeTouches.set(touch.id, touch);
  });
  var allTouches = convertTouchListToCoords(event.touches);
  // MCU1 diagnostic: prove the browser captured the touch + show the
  // canvas-relative coordinate (a tap on the log overlay would still fire
  // but might land off-canvas — visible here).
  window._mcu1TouchCount = (window._mcu1TouchCount || 0) + 1;
  if (window._mcu1Trace && !window._mcu1FirstTouchTraced) {
    window._mcu1FirstTouchTraced = true;
    var _t0 = newTouches[0] || { x: -1, y: -1 };
    window._mcu1Trace('first touch captured (kind=DOWN x=' + _t0.x + ' y=' + _t0.y + ' n=' + newTouches.length + ')');
  }

  // DEBUG: Logs détaillés pour comprendre le problème
  //console.log('[MULTITOUCH_DOWN] event.changedTouches.length:', event.changedTouches.length);
  //console.log('[MULTITOUCH_DOWN] event.touches.length:', event.touches.length);
  //console.log('[MULTITOUCH_DOWN] newTouches:', JSON.stringify(newTouches));
  //console.log('[MULTITOUCH_DOWN] allTouches:', JSON.stringify(allTouches));
  //console.log('[MULTITOUCH_DOWN] activeTouches.size:', activeTouches.size);

  // Envoyer l'événement multitouch principal
  demuxDecodeWorker.postMessage({
    action: "MULTITOUCH_DOWN",
    touches: newTouches,
    allTouches: allTouches,
    timestamp: performance.now()
  });

  // Note: Les événements legacy (DOWN) ont été supprimés car MULTITOUCH_DOWN
  // gère maintenant à la fois le single touch et le multitouch
}
bodyElement.addEventListener('touchstart', handleTouchStart, {
  passive: false
});

/**
 * Gère les événements touchend et touchcancel
 * @param {TouchEvent} event - L'événement tactile
 */
function handleTouchEnd(event) {
  event.preventDefault();
  window._mcu1TouchCount = (window._mcu1TouchCount || 0) + 1;

  // CRITIQUE: Annuler tout MULTITOUCH_MOVE en attente pour éviter le bug "sticky touch"
  // Si un touchmove a programmé un requestAnimationFrame qui n'a pas encore été exécuté,
  // on doit l'empêcher de traiter les anciennes données de touch
  latestTouchData = null;
  var endedTouches = convertTouchListToCoords(event.changedTouches);
  endedTouches.forEach(function (touch) {
    return activeTouches.delete(touch.id);
  });
  var allTouches = convertTouchListToCoords(event.touches);
  var action = event.type === 'touchend' ? 'MULTITOUCH_UP' : 'MULTITOUCH_CANCEL';

  // DEBUG: Logs pour MULTITOUCH_UP/CANCEL
  //console.log('[' + action + '] event.changedTouches.length:', event.changedTouches.length);
  //console.log('[' + action + '] event.touches.length:', event.touches.length);
  //console.log('[' + action + '] endedTouches:', JSON.stringify(endedTouches));
  //console.log('[' + action + '] allTouches:', JSON.stringify(allTouches));
  //console.log('[' + action + '] activeTouches.size:', activeTouches.size);

  // Envoyer l'événement multitouch principal
  demuxDecodeWorker.postMessage({
    action: action,
    touches: endedTouches,
    allTouches: allTouches,
    timestamp: performance.now()
  });

  // Note: Les événements legacy (UP) ont été supprimés car MULTITOUCH_UP
  // gère maintenant à la fois le single touch et le multitouch
}
bodyElement.addEventListener('touchend', handleTouchEnd, {
  passive: false
});
bodyElement.addEventListener('touchcancel', handleTouchEnd, {
  passive: false
});

/**
 * Boucle de mise à jour optimisée avec requestAnimationFrame
 * N'envoie que le dernier événement tactile avant le prochain rendu du navigateur
 */
function processTouchMove() {
  if (!latestTouchData) {
    touchMovePending = false;
    return;
  }
  var movingTouches = latestTouchData.touches;
  var timestamp = latestTouchData.timestamp;

  // Mettre à jour le suivi des touches actives
  movingTouches.forEach(function (touch) {
    activeTouches.set(touch.id, touch);
  });

  // DEBUG: Logs pour MULTITOUCH_MOVE
  //console.log('[MULTITOUCH_MOVE] movingTouches.length:', movingTouches.length);
  //console.log('[MULTITOUCH_MOVE] movingTouches:', JSON.stringify(movingTouches));
  //console.log('[MULTITOUCH_MOVE] activeTouches.size:', activeTouches.size);

  // Envoyer l'événement multitouch optimisé
  demuxDecodeWorker.postMessage({
    action: "MULTITOUCH_MOVE",
    touches: movingTouches,
    allTouches: movingTouches,
    // CRUCIAL pour le multitouch en binaire !
    timestamp: timestamp
  });

  // Note: Les événements legacy (DRAG) ont été supprimés car MULTITOUCH_MOVE
  // gère maintenant à la fois le single touch et le multitouch

  latestTouchData = null;
  touchMovePending = false;
}
bodyElement.addEventListener('touchmove', function (event) {
  // Convertir les données tactiles IMMÉDIATEMENT pour éviter la mutation de l'événement
  // (le navigateur peut réutiliser l'objet TouchEvent pour des raisons de performance)
  latestTouchData = {
    touches: convertTouchListToCoords(event.touches),
    timestamp: performance.now()
  };
  window._mcu1TouchCount = (window._mcu1TouchCount || 0) + 1;
  if (window._mcu1Trace && !window._mcu1FirstMoveTraced) {
    window._mcu1FirstMoveTraced = true;
    var _tm0 = latestTouchData.touches[0] || { x: -1, y: -1 };
    window._mcu1Trace('first touchmove captured (x=' + _tm0.x + ' y=' + _tm0.y + ' n=' + latestTouchData.touches.length + ')');
  }

  // Si une mise à jour n'est pas déjà en attente, en programmer une
  if (!touchMovePending) {
    touchMovePending = true;
    requestAnimationFrame(processTouchMove);
  }
});

// Ajouter un écouteur d'événement pour le redimensionnement de la fenêtre
window.addEventListener('resize', function () {
  if (width && height) {
    updateCanvasSize();
  }
});

/**
 * Fonction de test pour simuler des événements multitouch
 * Utilisable depuis la console du navigateur
 */
window.simulateMultitouch = function () {
  var testType = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'basic';
  console.log("\uD83D\uDFE2 Simulating multitouch event: ".concat(testType));
  if (testType === 'basic') {
    // Test basique avec 2 touches
    var touches = [{
      id: 0,
      x: 100,
      y: 100
    }, {
      id: 1,
      x: 200,
      y: 200
    }];
    console.log('📝 Sending MULTITOUCH_DOWN with 2 touches');
    demuxDecodeWorker.postMessage({
      action: "MULTITOUCH_DOWN",
      touches: touches,
      allTouches: touches,
      timestamp: performance.now()
    });

    // Simuler un mouvement après 500ms
    setTimeout(function () {
      var movedTouches = [{
        id: 0,
        x: 150,
        y: 150
      }, {
        id: 1,
        x: 250,
        y: 250
      }];
      console.log('📝 Sending MULTITOUCH_MOVE');
      demuxDecodeWorker.postMessage({
        action: "MULTITOUCH_MOVE",
        touches: movedTouches,
        allTouches: movedTouches,
        timestamp: performance.now()
      });
    }, 500);

    // Simuler la fin après 1000ms
    setTimeout(function () {
      console.log('📝 Sending MULTITOUCH_UP');
      demuxDecodeWorker.postMessage({
        action: "MULTITOUCH_UP",
        touches: touches,
        allTouches: [],
        timestamp: performance.now()
      });
    }, 1000);
  } else if (testType === 'pinch') {
    // Test de pincement (zoom)
    console.log('📝 Simulating pinch gesture');
    var startTouches = [{
      id: 0,
      x: 200,
      y: 200
    }, {
      id: 1,
      x: 300,
      y: 300
    }];
    demuxDecodeWorker.postMessage({
      action: "MULTITOUCH_DOWN",
      touches: startTouches,
      allTouches: startTouches,
      timestamp: performance.now()
    });

    // Simuler le rapprochement des doigts
    var step = 0;
    var pinchInterval = setInterval(function () {
      step++;
      var distance = 100 + (50 - step * 5); // Réduire la distance
      var centerX = 250;
      var centerY = 250;
      var pinchTouches = [{
        id: 0,
        x: centerX - distance / 2,
        y: centerY - distance / 2
      }, {
        id: 1,
        x: centerX + distance / 2,
        y: centerY + distance / 2
      }];
      console.log("\uD83D\uDCDD Pinch step ".concat(step, ", distance: ").concat(distance));
      demuxDecodeWorker.postMessage({
        action: "MULTITOUCH_MOVE",
        touches: pinchTouches,
        allTouches: pinchTouches,
        timestamp: performance.now()
      });
      if (step >= 10) {
        clearInterval(pinchInterval);
        demuxDecodeWorker.postMessage({
          action: "MULTITOUCH_UP",
          touches: pinchTouches,
          allTouches: [],
          timestamp: performance.now()
        });
        console.log('📝 Pinch gesture completed');
      }
    }, 100);
  }
  return true;
};

// Function to display email address only on user click to prevent bot detection
function setupContactLink() {
  var link = document.getElementById('contact-link');
  if (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var email = 'seb.duboc.dev' + '@' + 'gmail.com';
      this.href = 'mailto:' + email;
      this.textContent = email;
      this.style.textDecoration = 'underline'; // Add underline to the email
      // Remove the click listener to allow normal link behavior
      this.removeEventListener('click', arguments.callee);
    });
  }
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', setupContactLink);

// Wire up the Reset AA Profile button in the troubleshoot message
document.addEventListener('DOMContentLoaded', function () {
  var btnResetAA = document.getElementById('btn-reset-aa-profile');
  var confirmEl = document.getElementById('reset-aa-confirm');
  if (btnResetAA) {
    btnResetAA.addEventListener('click', function () {
      btnResetAA.disabled = true;
      if (confirmEl) confirmEl.style.display = 'block';
      demuxDecodeWorker.postMessage({
        action: 'RESET_AA_PROFILE'
      });
    });
  }
});
checkPhone();
var audiostart = false;
var mediaPCM;
var ttsPCM;
var mediaPCMSocket;
var ttsPCMSocket;
function startAudio() {
  // Note: port est maintenant le port HTTPS découvert dynamiquement
  // Les ports audio restent relatifs à ce port de base
  mediaPCMSocket = new WebSocket("wss://taada.top:".concat(port + 1));
  mediaPCMSocket.binaryType = "arraybuffer";
  mediaPCMSocket.addEventListener('open', function () {
    mediaPCMSocket.binaryType = "arraybuffer";
    console.log("Media audio connected to port ".concat(port + 1));
  });
  mediaPCMSocket.addEventListener('message', function (event) {
    var data = new Uint8Array(event.data);
    mediaPCM.feed(data);
  });
  ttsPCMSocket = new WebSocket("wss://taada.top:".concat(port + 2));
  ttsPCMSocket.binaryType = "arraybuffer";
  ttsPCMSocket.addEventListener('open', function () {
    ttsPCMSocket.binaryType = "arraybuffer";
    console.log("TTS audio connected to port ".concat(port + 2));
  });
  ttsPCMSocket.addEventListener('message', function (event) {
    var data = new Uint8Array(event.data);
    ttsPCMSocket.send(JSON.stringify({
      action: "ACK"
    }));
    ttsPCM.feed(data);
  });
}