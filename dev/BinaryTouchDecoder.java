package fr.sd.taada.protocol;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.List;

/**
 * BINARY TOUCH EVENT DECODER (JAVA/ANDROID)
 *
 * Décode les événements tactiles envoyés depuis le navigateur Tesla
 * au format binaire compact.
 *
 * Correspond au fichier binary_touch_protocol.js côté client
 *
 * Format:
 * [1 byte: action] [1 byte: count] [6 bytes par touch] [4 bytes: timestamp delta]
 */
public class BinaryTouchDecoder {

    // Codes d'action (doivent correspondre au JS)
    public static final int ACTION_MULTITOUCH_DOWN = 0;
    public static final int ACTION_MULTITOUCH_MOVE = 1;
    public static final int ACTION_MULTITOUCH_UP = 2;
    public static final int ACTION_TOUCH = 3;

    // Timestamp de référence
    private long lastTimestamp = System.currentTimeMillis();

    /**
     * Classe représentant un point de toucher
     */
    public static class TouchPoint {
        public final int id;
        public final int x;
        public final int y;

        public TouchPoint(int id, int x, int y) {
            this.id = id;
            this.x = x;
            this.y = y;
        }

        @Override
        public String toString() {
            return String.format("Touch[id=%d, x=%d, y=%d]", id, x, y);
        }
    }

    /**
     * Classe représentant un événement tactile décodé
     */
    public static class TouchEvent {
        public final int action;
        public final List<TouchPoint> touches;
        public final long timestamp;

        public TouchEvent(int action, List<TouchPoint> touches, long timestamp) {
            this.action = action;
            this.touches = touches;
            this.timestamp = timestamp;
        }

        public String getActionName() {
            switch (action) {
                case ACTION_MULTITOUCH_DOWN: return "MULTITOUCH_DOWN";
                case ACTION_MULTITOUCH_MOVE: return "MULTITOUCH_MOVE";
                case ACTION_MULTITOUCH_UP: return "MULTITOUCH_UP";
                case ACTION_TOUCH: return "TOUCH";
                default: return "UNKNOWN";
            }
        }

        @Override
        public String toString() {
            return String.format("TouchEvent[action=%s, touches=%d, timestamp=%d]",
                    getActionName(), touches.size(), timestamp);
        }
    }

    /**
     * Décode un buffer binaire en événement tactile
     *
     * @param data - Tableau de bytes reçu via WebSocket
     * @return TouchEvent décodé
     * @throws IllegalArgumentException si le format est invalide
     */
    public TouchEvent decode(byte[] data) throws IllegalArgumentException {
        if (data == null || data.length < 6) {
            throw new IllegalArgumentException("Invalid touch data: too short (min 6 bytes)");
        }

        // Utiliser ByteBuffer pour lecture en big-endian (réseau)
        ByteBuffer buffer = ByteBuffer.wrap(data);
        buffer.order(ByteOrder.BIG_ENDIAN);

        // Byte 0: Action code
        int action = buffer.get() & 0xFF;

        // Byte 1: Nombre de touches
        int touchCount = buffer.get() & 0xFF;

        // Vérifier la taille minimale attendue
        int expectedSize = 2 + (touchCount * 6) + 4;
        if (data.length < expectedSize) {
            throw new IllegalArgumentException(
                String.format("Invalid touch data: expected %d bytes, got %d", expectedSize, data.length)
            );
        }

        // Décoder chaque touche
        List<TouchPoint> touches = new ArrayList<>(touchCount);
        for (int i = 0; i < touchCount; i++) {
            int id = buffer.getShort() & 0xFFFF;  // 2 bytes unsigned
            int x = buffer.getShort() & 0xFFFF;   // 2 bytes unsigned
            int y = buffer.getShort() & 0xFFFF;   // 2 bytes unsigned

            touches.add(new TouchPoint(id, x, y));
        }

        // 4 bytes finaux: Timestamp delta
        long timestampDelta = buffer.getInt() & 0xFFFFFFFFL;  // unsigned int

        // Calculer le timestamp absolu
        long timestamp = lastTimestamp + timestampDelta;
        lastTimestamp = timestamp;

        return new TouchEvent(action, touches, timestamp);
    }

    /**
     * Réinitialiser le timestamp de référence (utile après reconnexion)
     */
    public void reset() {
        this.lastTimestamp = System.currentTimeMillis();
    }

    /**
     * Vérifier si un buffer est au format binaire (vs JSON)
     *
     * @param data - Buffer à vérifier
     * @return true si binaire, false si probablement JSON
     */
    public static boolean isBinaryFormat(byte[] data) {
        if (data == null || data.length < 2) {
            return false;
        }

        // Vérifier que le premier byte est un code d'action valide (0-3)
        int firstByte = data[0] & 0xFF;
        if (firstByte > 3) {
            return false;
        }

        // Vérifier que le deuxième byte (count) est raisonnable (0-10 touches)
        int count = data[1] & 0xFF;
        if (count > 10) {
            return false;
        }

        // Vérifier la taille cohérente
        int expectedSize = 2 + (count * 6) + 4;
        return data.length >= expectedSize && data.length <= expectedSize + 10; // marge
    }

    /**
     * Exemple d'utilisation dans un WebSocket handler
     */
    public static void main(String[] args) {
        // Simuler un buffer binaire reçu
        byte[] testData = new byte[] {
            0x01,  // ACTION_MULTITOUCH_MOVE
            0x01,  // 1 touch
            0x00, 0x00,  // id = 0
            0x02, 0x00,  // x = 512
            0x01, (byte)0x80,  // y = 384
            0x00, 0x00, 0x00, 0x10  // timestamp delta = 16ms
        };

        BinaryTouchDecoder decoder = new BinaryTouchDecoder();

        try {
            TouchEvent event = decoder.decode(testData);
            System.out.println("Decoded: " + event);
            System.out.println("First touch: " + event.touches.get(0));
        } catch (IllegalArgumentException e) {
            System.err.println("Decode error: " + e.getMessage());
        }
    }
}
