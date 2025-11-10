/**
 * BINARY TOUCH EVENT PROTOCOL
 *
 * Compression des événements tactiles pour réduire la bande passante
 * Format: ~12 bytes vs ~120 bytes en JSON (réduction de 90%)
 *
 * Structure binaire:
 * [1 byte: action type] [1 byte: touch count]
 * Pour chaque touch: [2 bytes: id] [2 bytes: x] [2 bytes: y]
 * [4 bytes: timestamp delta en ms]
 */

class BinaryTouchEncoder {
    constructor() {
        this.ACTION_CODES = {
            'MULTITOUCH_DOWN': 0,
            'MULTITOUCH_MOVE': 1,
            'MULTITOUCH_UP': 2,
            'TOUCH': 3  // Legacy single touch
        };
        this.lastTimestamp = performance.now();
    }

    /**
     * Encode un événement tactile en format binaire
     * @param {string} action - Type d'action (MULTITOUCH_DOWN, MULTITOUCH_MOVE, MULTITOUCH_UP)
     * @param {Array} touches - Tableau de touches [{id, x, y}, ...]
     * @returns {ArrayBuffer} - Buffer binaire prêt à envoyer via WebSocket
     */
    encode(action, touches) {
        // Calculer la taille nécessaire
        // 1 byte (action) + 1 byte (count) + (6 bytes par touch) + 4 bytes (timestamp)
        const bufferSize = 2 + (touches.length * 6) + 4;
        const buffer = new ArrayBuffer(bufferSize);
        const view = new DataView(buffer);

        let offset = 0;

        // Byte 0: Action code
        view.setUint8(offset, this.ACTION_CODES[action] || 0);
        offset += 1;

        // Byte 1: Nombre de touches
        view.setUint8(offset, touches.length);
        offset += 1;

        // Bytes 2+: Données de chaque touche
        touches.forEach(touch => {
            // 2 bytes: touch ID (0-65535)
            view.setUint16(offset, touch.id & 0xFFFF, false); // big-endian
            offset += 2;

            // 2 bytes: X coordinate (0-65535)
            view.setUint16(offset, Math.floor(touch.x) & 0xFFFF, false);
            offset += 2;

            // 2 bytes: Y coordinate (0-65535)
            view.setUint16(offset, Math.floor(touch.y) & 0xFFFF, false);
            offset += 2;
        });

        // 4 bytes finaux: Timestamp delta (millisecondes depuis dernier événement)
        const now = performance.now();
        const delta = Math.floor(now - this.lastTimestamp);
        view.setUint32(offset, delta & 0xFFFFFFFF, false);
        this.lastTimestamp = now;

        return buffer;
    }

    /**
     * Réinitialiser le timestamp de référence (utile après reconnexion)
     */
    reset() {
        this.lastTimestamp = performance.now();
    }

    /**
     * Obtenir la taille estimée d'un événement encodé
     * @param {number} touchCount - Nombre de touches
     * @returns {number} - Taille en bytes
     */
    static getEncodedSize(touchCount) {
        return 2 + (touchCount * 6) + 4;
    }

    /**
     * Comparer avec la taille JSON pour debug
     * @param {string} action
     * @param {Array} touches
     * @returns {Object} - {binary: X, json: Y, ratio: Z}
     */
    static compareSize(action, touches) {
        const binarySize = BinaryTouchEncoder.getEncodedSize(touches.length);
        const jsonSize = JSON.stringify({
            action: action,
            touches: touches,
            timestamp: performance.now()
        }).length;

        return {
            binary: binarySize,
            json: jsonSize,
            ratio: ((1 - binarySize / jsonSize) * 100).toFixed(1) + '%'
        };
    }
}

// Export pour utilisation dans main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BinaryTouchEncoder;
}
