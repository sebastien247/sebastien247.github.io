/**
 * ADAPTIVE BITRATE (ABR) QUALITY MANAGER
 *
 * Gestion de la qualité adaptative côté JavaScript
 * Monitore les performances et envoie des recommandations au serveur Java
 *
 * Le serveur Java doit implémenter les ajustements d'encodage:
 * - Changer la résolution (720p/1080p)
 * - Ajuster le bitrate (1-5 Mbps)
 * - Modifier le framerate (30/45/60 fps)
 */

class ABRQualityManager {
    constructor(socket) {
        this.socket = socket;

        // Niveaux de qualité disponibles
        this.qualityLevels = {
            'low': {
                name: 'Économique',
                resolution: { width: 1280, height: 720 },
                bitrate: 1500000,  // 1.5 Mbps
                framerate: 30,
                priority: 0
            },
            'medium': {
                name: 'Équilibrée',
                resolution: { width: 1280, height: 720 },
                bitrate: 2500000,  // 2.5 Mbps
                framerate: 45,
                priority: 1
            },
            'high': {
                name: 'Haute Qualité',
                resolution: { width: 1920, height: 1080 },
                bitrate: 4000000,  // 4 Mbps
                framerate: 60,
                priority: 2
            }
        };

        this.currentQuality = 'high';
        this.targetQuality = 'high';

        // Métriques de performance
        this.metrics = {
            fps: [],
            decodeTime: [],
            bufferSize: [],
            droppedFrames: 0,
            totalFrames: 0
        };

        // Configuration des seuils de décision
        this.thresholds = {
            fpsLow: 50,          // Downgrade si FPS < 50
            fpsHigh: 58,         // Upgrade si FPS > 58
            bufferLow: 2,        // Downgrade si buffer < 2 frames
            bufferHigh: 8,       // Upgrade si buffer > 8 frames
            stableTime: 10000,   // Attendre 10s avant upgrade
            reactTime: 3000      // Réagir après 3s de dégradation
        };

        // Timers
        this.lastQualityChange = Date.now();
        this.lastDegradation = null;
        this.stableStartTime = null;

        // Statistiques d'analyse
        this.analysisInterval = null;
        this.reportInterval = null;
    }

    /**
     * Démarrer le monitoring automatique
     */
    start() {
        console.log('[ABR] Starting adaptive quality management');

        // Analyser toutes les secondes
        this.analysisInterval = setInterval(() => {
            this.analyze();
        }, 1000);

        // Envoyer un rapport toutes les 5 secondes
        this.reportInterval = setInterval(() => {
            this.sendReport();
        }, 5000);
    }

    /**
     * Arrêter le monitoring
     */
    stop() {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
        }
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
        }
        console.log('[ABR] Stopped adaptive quality management');
    }

    /**
     * Enregistrer des métriques de performance
     */
    recordMetrics(fps, decodeTime, bufferSize) {
        this.metrics.fps.push(fps);
        this.metrics.decodeTime.push(decodeTime);
        this.metrics.bufferSize.push(bufferSize);

        // Garder seulement les 30 dernières secondes
        const maxSamples = 30;
        if (this.metrics.fps.length > maxSamples) {
            this.metrics.fps.shift();
            this.metrics.decodeTime.shift();
            this.metrics.bufferSize.shift();
        }

        this.metrics.totalFrames++;
    }

    /**
     * Calculer la moyenne d'un tableau
     */
    average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * Calculer les statistiques actuelles
     */
    getStats() {
        return {
            avgFps: this.average(this.metrics.fps),
            avgDecodeTime: this.average(this.metrics.decodeTime),
            avgBufferSize: this.average(this.metrics.bufferSize),
            droppedFrameRate: (this.metrics.droppedFrames / this.metrics.totalFrames * 100).toFixed(2),
            currentQuality: this.currentQuality,
            targetQuality: this.targetQuality
        };
    }

    /**
     * Analyser les métriques et décider d'un changement de qualité
     */
    analyze() {
        const stats = this.getStats();

        // Pas assez de données
        if (this.metrics.fps.length < 3) {
            return;
        }

        const now = Date.now();
        const timeSinceLastChange = now - this.lastQualityChange;

        // Détecter une dégradation de performance
        const isPerformancePoor =
            stats.avgFps < this.thresholds.fpsLow ||
            stats.avgBufferSize < this.thresholds.bufferLow;

        if (isPerformancePoor) {
            if (!this.lastDegradation) {
                this.lastDegradation = now;
            }

            // Si dégradation persiste pendant reactTime, downgrade
            if ((now - this.lastDegradation) > this.thresholds.reactTime) {
                this.downgradeQuality();
                this.lastDegradation = null;
                this.stableStartTime = null;
            }
            return;
        }

        // Reset dégradation si performance OK
        this.lastDegradation = null;

        // Détecter une performance stable et excellente
        const isPerformanceExcellent =
            stats.avgFps > this.thresholds.fpsHigh &&
            stats.avgBufferSize > this.thresholds.bufferHigh;

        if (isPerformanceExcellent) {
            if (!this.stableStartTime) {
                this.stableStartTime = now;
            }

            // Si performance excellente stable pendant stableTime, upgrade
            if ((now - this.stableStartTime) > this.thresholds.stableTime) {
                // Attendre au moins 30s depuis dernier changement
                if (timeSinceLastChange > 30000) {
                    this.upgradeQuality();
                    this.stableStartTime = null;
                }
            }
        } else {
            this.stableStartTime = null;
        }
    }

    /**
     * Downgrade vers une qualité inférieure
     */
    downgradeQuality() {
        const levels = ['high', 'medium', 'low'];
        const currentIndex = levels.indexOf(this.currentQuality);

        if (currentIndex < levels.length - 1) {
            const newQuality = levels[currentIndex + 1];
            this.requestQualityChange(newQuality);
            console.log(`[ABR] Downgrading quality: ${this.currentQuality} → ${newQuality}`);
        }
    }

    /**
     * Upgrade vers une qualité supérieure
     */
    upgradeQuality() {
        const levels = ['low', 'medium', 'high'];
        const currentIndex = levels.indexOf(this.currentQuality);

        if (currentIndex < levels.length - 1) {
            const newQuality = levels[currentIndex + 1];
            this.requestQualityChange(newQuality);
            console.log(`[ABR] Upgrading quality: ${this.currentQuality} → ${newQuality}`);
        }
    }

    /**
     * Demander un changement de qualité au serveur Java
     */
    requestQualityChange(newQuality) {
        if (!this.qualityLevels[newQuality]) {
            console.error(`[ABR] Invalid quality level: ${newQuality}`);
            return;
        }

        const level = this.qualityLevels[newQuality];

        // Envoyer la demande au serveur
        if (this.socket && this.socket.sendObject) {
            this.socket.sendObject({
                action: 'CHANGE_QUALITY',
                quality: newQuality,
                resolution: level.resolution,
                bitrate: level.bitrate,
                framerate: level.framerate
            });

            this.targetQuality = newQuality;
            this.lastQualityChange = Date.now();

            console.log(`[ABR] Quality change requested:`, level);
        }
    }

    /**
     * Confirmer que le changement de qualité a été appliqué
     * (appelé depuis le message du serveur)
     */
    confirmQualityChange(quality) {
        this.currentQuality = quality;
        console.log(`[ABR] Quality change confirmed: ${quality}`);
    }

    /**
     * Envoyer un rapport de performance au serveur
     */
    sendReport() {
        const stats = this.getStats();

        if (this.socket && this.socket.sendObject) {
            this.socket.sendObject({
                action: 'PERFORMANCE_REPORT',
                fps: Math.round(stats.avgFps),
                bufferSize: Math.round(stats.avgBufferSize),
                droppedFrameRate: parseFloat(stats.droppedFrameRate),
                quality: this.currentQuality
            });
        }
    }

    /**
     * Forcer un changement de qualité manuel
     */
    setQuality(quality) {
        if (!this.qualityLevels[quality]) {
            console.error(`[ABR] Invalid quality level: ${quality}`);
            return;
        }

        console.log(`[ABR] Manual quality change: ${quality}`);
        this.requestQualityChange(quality);
    }

    /**
     * Obtenir les niveaux de qualité disponibles
     */
    getAvailableQualities() {
        return Object.keys(this.qualityLevels).map(key => ({
            id: key,
            ...this.qualityLevels[key]
        }));
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ABRQualityManager;
}
