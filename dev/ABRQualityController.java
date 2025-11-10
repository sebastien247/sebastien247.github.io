package fr.sd.taada.encoder;

import android.media.MediaCodec;
import android.media.MediaFormat;
import android.util.Log;
import org.json.JSONObject;

/**
 * ABR QUALITY CONTROLLER (ANDROID/JAVA)
 *
 * Gère les changements de qualité d'encodage en fonction des recommandations
 * du client JavaScript (abr_quality_manager.js)
 *
 * Ajuste dynamiquement:
 * - Résolution (720p/1080p)
 * - Bitrate (1.5-4 Mbps)
 * - Framerate (30/45/60 fps)
 */
public class ABRQualityController {

    private static final String TAG = "ABRQualityController";

    // Niveaux de qualité (doivent correspondre au JavaScript)
    public enum QualityLevel {
        LOW("low", 1280, 720, 1500000, 30),
        MEDIUM("medium", 1280, 720, 2500000, 45),
        HIGH("high", 1920, 1080, 4000000, 60);

        public final String id;
        public final int width;
        public final int height;
        public final int bitrate;
        public final int framerate;

        QualityLevel(String id, int width, int height, int bitrate, int framerate) {
            this.id = id;
            this.width = width;
            this.height = height;
            this.bitrate = bitrate;
            this.framerate = framerate;
        }

        public static QualityLevel fromId(String id) {
            for (QualityLevel level : values()) {
                if (level.id.equals(id)) {
                    return level;
                }
            }
            return HIGH; // default
        }
    }

    // État actuel
    private QualityLevel currentQuality = QualityLevel.HIGH;
    private MediaCodec encoder;
    private QualityChangeListener listener;

    // Statistiques
    private long lastQualityChange = System.currentTimeMillis();
    private int qualityChangeCount = 0;

    /**
     * Interface pour notifier les changements de qualité
     */
    public interface QualityChangeListener {
        /**
         * Appelé quand un changement de qualité est nécessaire
         * Doit recréer l'encodeur avec les nouveaux paramètres
         */
        void onQualityChangeRequired(QualityLevel newQuality);

        /**
         * Appelé pour confirmer au client que le changement est effectif
         */
        void sendQualityConfirmation(String quality);

        /**
         * Demander une keyframe immédiatement
         */
        void requestKeyframe();
    }

    public ABRQualityController(QualityChangeListener listener) {
        this.listener = listener;
    }

    /**
     * Traiter un message du client JavaScript
     *
     * @param jsonMessage - Message JSON reçu via WebSocket
     * @return true si le message a été traité
     */
    public boolean handleClientMessage(JSONObject jsonMessage) {
        try {
            String action = jsonMessage.getString("action");

            if ("CHANGE_QUALITY".equals(action)) {
                String qualityId = jsonMessage.getString("quality");
                handleQualityChangeRequest(qualityId);
                return true;
            } else if ("PERFORMANCE_REPORT".equals(action)) {
                handlePerformanceReport(jsonMessage);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error handling client message", e);
        }

        return false;
    }

    /**
     * Gérer une demande de changement de qualité
     */
    private void handleQualityChangeRequest(String qualityId) {
        QualityLevel newQuality = QualityLevel.fromId(qualityId);

        if (newQuality == currentQuality) {
            Log.d(TAG, "Quality already at " + qualityId + ", ignoring");
            return;
        }

        // Éviter les changements trop fréquents (min 10 secondes)
        long now = System.currentTimeMillis();
        if (now - lastQualityChange < 10000) {
            Log.w(TAG, "Quality change too soon, ignoring (last change " +
                    (now - lastQualityChange) + "ms ago)");
            return;
        }

        Log.i(TAG, String.format("Quality change: %s → %s (%dx%d @%dfps, %d bps)",
                currentQuality.id, newQuality.id,
                newQuality.width, newQuality.height,
                newQuality.framerate, newQuality.bitrate));

        // Notifier le listener pour recréer l'encodeur
        if (listener != null) {
            listener.onQualityChangeRequired(newQuality);
        }

        currentQuality = newQuality;
        lastQualityChange = now;
        qualityChangeCount++;

        // Confirmer au client
        if (listener != null) {
            listener.sendQualityConfirmation(newQuality.id);
        }
    }

    /**
     * Traiter un rapport de performance du client
     * (pour logging/analytics)
     */
    private void handlePerformanceReport(JSONObject report) {
        try {
            int fps = report.getInt("fps");
            int bufferSize = report.getInt("bufferSize");
            double droppedFrameRate = report.getDouble("droppedFrameRate");
            String quality = report.getString("quality");

            Log.d(TAG, String.format("Performance report: FPS=%d, Buffer=%d, Dropped=%.2f%%, Quality=%s",
                    fps, bufferSize, droppedFrameRate, quality));

            // TODO: Envoyer à Firebase Analytics ou autre service de monitoring

        } catch (Exception e) {
            Log.e(TAG, "Error parsing performance report", e);
        }
    }

    /**
     * Créer un MediaFormat avec les paramètres de qualité actuels
     *
     * @param mimeType - Type MIME (ex: MediaFormat.MIMETYPE_VIDEO_AVC)
     * @return MediaFormat configuré
     */
    public MediaFormat createMediaFormat(String mimeType) {
        return createMediaFormatForQuality(currentQuality, mimeType);
    }

    /**
     * Créer un MediaFormat pour un niveau de qualité spécifique
     */
    public static MediaFormat createMediaFormatForQuality(QualityLevel quality, String mimeType) {
        MediaFormat format = MediaFormat.createVideoFormat(mimeType, quality.width, quality.height);

        // Configuration du bitrate
        format.setInteger(MediaFormat.KEY_BIT_RATE, quality.bitrate);
        format.setInteger(MediaFormat.KEY_BITRATE_MODE, MediaFormat.BITRATE_MODE_VBR); // VBR pour meilleure qualité

        // Framerate
        format.setInteger(MediaFormat.KEY_FRAME_RATE, quality.framerate);

        // I-frame interval (keyframe toutes les 2 secondes)
        format.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 2);

        // Couleurs
        format.setInteger(MediaFormat.KEY_COLOR_FORMAT, android.media.MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface);

        // Profile H.264 (Baseline pour compatibilité maximale)
        format.setInteger(MediaFormat.KEY_PROFILE, android.media.MediaCodecInfo.CodecProfileLevel.AVCProfileBaseline);

        Log.i(TAG, "Created MediaFormat: " + quality.id +
                " (" + quality.width + "x" + quality.height +
                " @" + quality.framerate + "fps, " +
                (quality.bitrate / 1000000) + "Mbps)");

        return format;
    }

    /**
     * Ajuster le bitrate dynamiquement (sans recréer l'encodeur)
     * Disponible uniquement sur Android API 19+
     *
     * @param newBitrate - Nouveau bitrate en bits/sec
     */
    public void adjustBitrateRuntime(int newBitrate) {
        if (encoder == null) {
            Log.w(TAG, "Cannot adjust bitrate: encoder is null");
            return;
        }

        try {
            android.os.Bundle params = new android.os.Bundle();
            params.putInt(MediaCodec.PARAMETER_KEY_VIDEO_BITRATE, newBitrate);
            encoder.setParameters(params);

            Log.i(TAG, "Bitrate adjusted to " + (newBitrate / 1000000) + " Mbps");
        } catch (Exception e) {
            Log.e(TAG, "Failed to adjust bitrate", e);
        }
    }

    /**
     * Demander une keyframe immédiate (utile après changement de qualité)
     */
    public void requestKeyframeNow() {
        if (encoder == null) {
            Log.w(TAG, "Cannot request keyframe: encoder is null");
            return;
        }

        try {
            android.os.Bundle params = new android.os.Bundle();
            params.putInt(MediaCodec.PARAMETER_KEY_REQUEST_SYNC_FRAME, 0);
            encoder.setParameters(params);

            Log.d(TAG, "Keyframe requested");
        } catch (Exception e) {
            Log.e(TAG, "Failed to request keyframe", e);
        }
    }

    /**
     * Définir l'encodeur MediaCodec (pour ajustements runtime)
     */
    public void setEncoder(MediaCodec encoder) {
        this.encoder = encoder;
    }

    /**
     * Obtenir la qualité actuelle
     */
    public QualityLevel getCurrentQuality() {
        return currentQuality;
    }

    /**
     * Obtenir des statistiques
     */
    public String getStats() {
        return String.format("Quality changes: %d, Current: %s, Uptime: %d sec",
                qualityChangeCount,
                currentQuality.id,
                (System.currentTimeMillis() - lastQualityChange) / 1000);
    }

    /**
     * Forcer un niveau de qualité spécifique (pour tests)
     */
    public void forceQuality(QualityLevel quality) {
        Log.i(TAG, "Forcing quality to " + quality.id);
        handleQualityChangeRequest(quality.id);
    }
}
