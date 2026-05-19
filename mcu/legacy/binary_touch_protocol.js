function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * BINARY TOUCH EVENT PROTOCOL
 *
 * Compression des événements tactiles pour réduire la bande passante
 * Format: ~12-30 bytes vs ~120 bytes en JSON (réduction de 90%)
 *
 * Structure binaire:
 * [1 byte: action code]
 * [1 byte: touches count]
 * [6 bytes par touch dans "touches"]
 * [1 byte: allTouches count]
 * [6 bytes par touch dans "allTouches"]
 * [4 bytes: timestamp delta]
 *
 * Chaque touch: [2 bytes: id] [2 bytes: x] [2 bytes: y]
 *
 * Avantages:
 * - Réduction de ~90% de la bande passante
 * - Latence réduite sur gestures rapides multitouch
 * - Support complet du multitouch (allTouches inclus)
 */
var BinaryTouchEncoder = /*#__PURE__*/function () {
  "use strict";

  function BinaryTouchEncoder() {
    _classCallCheck(this, BinaryTouchEncoder);
    // Action codes (doivent correspondre au Java BinaryTouchDecoder)
    this.ACTION_CODES = {
      'MULTITOUCH_DOWN': 0,
      'MULTITOUCH_MOVE': 1,
      'MULTITOUCH_UP': 2,
      'MULTITOUCH_CANCEL': 2,
      // Traiter CANCEL comme UP
      'TOUCH': 3 // Legacy single touch
    };

    // Timestamp de référence pour compression delta
    this.lastTimestamp = performance.now();
  }

  /**
   * Encode un événement tactile en format binaire
   * @param {string} action - Type d'action (MULTITOUCH_DOWN, MULTITOUCH_MOVE, MULTITOUCH_UP)
   * @param {Array} touches - Touches qui ont changé (nouveaux, bougés, terminés)
   * @param {Array} allTouches - TOUTES les touches actuellement actives (crucial pour multitouch!)
   * @param {number} timestamp - Timestamp de l'événement (performance.now())
   * @returns {ArrayBuffer} - Buffer binaire prêt à envoyer via WebSocket
   */
  return _createClass(BinaryTouchEncoder, [{
    key: "encode",
    value: function encode(action, touches, allTouches, timestamp) {
      // Convertir action string en code
      var actionCode = this.ACTION_CODES[action];
      if (actionCode === undefined) {
        console.error('[BinaryTouch] Unknown action:', action, '- Valid actions:', Object.keys(this.ACTION_CODES));
        return null;
      }

      // Calculer delta timestamp (en millisecondes)
      var timestampDelta = Math.floor(timestamp - this.lastTimestamp);
      this.lastTimestamp = timestamp;

      // Calculer taille du buffer
      var touchesCount = touches.length;
      var allTouchesCount = allTouches ? allTouches.length : 0;
      var bufferSize = 1 + 1 + touchesCount * 6 + 1 + allTouchesCount * 6 + 4;

      // Créer buffer et vue DataView
      var buffer = new ArrayBuffer(bufferSize);
      var view = new DataView(buffer);
      var offset = 0;

      // Byte 0: Action code
      view.setUint8(offset++, actionCode);

      // Byte 1: Nombre de touches dans "touches"
      view.setUint8(offset++, touchesCount);

      // Encoder chaque touch dans "touches"
      for (var i = 0; i < touchesCount; i++) {
        var touch = touches[i];
        view.setUint16(offset, touch.id & 0xFFFF, false); // Big-endian
        offset += 2;
        view.setUint16(offset, Math.floor(touch.x) & 0xFFFF, false);
        offset += 2;
        view.setUint16(offset, Math.floor(touch.y) & 0xFFFF, false);
        offset += 2;
      }

      // Byte N: Nombre de touches dans "allTouches"
      view.setUint8(offset++, allTouchesCount);

      // Encoder chaque touch dans "allTouches"
      if (allTouches) {
        for (var _i = 0; _i < allTouchesCount; _i++) {
          var _touch = allTouches[_i];
          view.setUint16(offset, _touch.id & 0xFFFF, false); // Big-endian
          offset += 2;
          view.setUint16(offset, Math.floor(_touch.x) & 0xFFFF, false);
          offset += 2;
          view.setUint16(offset, Math.floor(_touch.y) & 0xFFFF, false);
          offset += 2;
        }
      }

      // 4 bytes finaux: Timestamp delta (millisecondes depuis dernier événement)
      view.setUint32(offset, Math.max(0, timestampDelta) & 0xFFFFFFFF, false);
      return buffer;
    }

    /**
     * Réinitialiser le timestamp de référence (utile après reconnexion)
     */
  }, {
    key: "reset",
    value: function reset() {
      this.lastTimestamp = performance.now();
    }

    /**
     * Obtenir la taille estimée d'un événement encodé
     * @param {number} touchesCount - Nombre de touches qui ont changé
     * @param {number} allTouchesCount - Nombre total de touches actives
     * @returns {number} - Taille en bytes
     */
  }], [{
    key: "getEncodedSize",
    value: function getEncodedSize(touchesCount) {
      var allTouchesCount = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      // 1 action + 1 touchesCount + (6*touches) + 1 allTouchesCount + (6*allTouches) + 4 timestamp
      return 1 + 1 + touchesCount * 6 + 1 + allTouchesCount * 6 + 4;
    }

    /**
     * Comparer avec la taille JSON pour debug
     * @param {string} action
     * @param {Array} touches
     * @param {Array} allTouches
     * @returns {Object} - {binary: X, json: Y, saved: 'Z%'}
     */
  }, {
    key: "compareSize",
    value: function compareSize(action, touches) {
      var allTouches = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
      var binarySize = BinaryTouchEncoder.getEncodedSize(touches.length, allTouches.length);
      var jsonSize = JSON.stringify({
        action: action,
        touches: touches,
        allTouches: allTouches,
        timestamp: performance.now()
      }).length;
      return {
        binary: binarySize,
        json: jsonSize,
        saved: ((1 - binarySize / jsonSize) * 100).toFixed(1) + '%'
      };
    }
  }]);
}(); // Export pour utilisation dans Web Workers
if (typeof self !== 'undefined' && typeof module === 'undefined') {
  // Context Web Worker
  self.BinaryTouchEncoder = BinaryTouchEncoder;
}

// Export pour Node.js (tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BinaryTouchEncoder;
}