/**
 * PERFORMANCE MONITOR
 *
 * Système de monitoring complet des performances du streaming
 * 100% JavaScript, pas de modifications serveur nécessaires
 *
 * Métriques suivies:
 * - FPS (frames per second)
 * - Latence réseau
 * - Temps de décodage
 * - Santé du buffer
 * - Frames dropped
 * - Bandwidth estimé
 */

class PerformanceMonitor {
    constructor() {
        // Métriques en temps réel
        this.metrics = {
            frameDecodeTime: [],    // Temps de décodage par frame (ms)
            renderTime: [],         // Temps de rendu par frame (ms)
            networkLatency: [],     // Latence réseau (ms)
            bufferHealth: [],       // Taille du buffer de frames
            fps: [],                // FPS mesuré
            droppedFrames: 0,
            totalFrames: 0,
            bytesReceived: 0
        };

        // Timestamps
        this.startTime = performance.now();
        this.lastFrameTime = 0;
        this.lastNetworkTimestamp = 0;

        // Configuration
        this.maxHistorySize = 300; // 5 secondes à 60fps
        this.enabled = false;

        // UI overlay
        this.overlayElement = null;
        this.updateInterval = null;

        // Statistiques agrégées
        this.stats = {
            avgFps: 0,
            avgDecodeTime: 0,
            avgLatency: 0,
            avgBufferSize: 0,
            droppedFrameRate: 0,
            estimatedBandwidth: 0,
            uptime: 0
        };
    }

    /**
     * Enregistrer le début du décodage d'une frame
     */
    startFrameDecode() {
        this.frameDecodeStartTime = performance.now();
    }

    /**
     * Enregistrer la fin du décodage d'une frame
     */
    endFrameDecode() {
        if (this.frameDecodeStartTime) {
            const decodeTime = performance.now() - this.frameDecodeStartTime;
            this.metrics.frameDecodeTime.push(decodeTime);
            this.trimMetrics(this.metrics.frameDecodeTime);
        }
    }

    /**
     * Enregistrer le rendu d'une frame
     */
    recordFrameRender(bufferSize) {
        const now = performance.now();

        // Calculer FPS
        if (this.lastFrameTime > 0) {
            const frameDelta = now - this.lastFrameTime;
            const fps = 1000 / frameDelta;
            this.metrics.fps.push(fps);
            this.trimMetrics(this.metrics.fps);
        }
        this.lastFrameTime = now;

        // Enregistrer la santé du buffer
        this.metrics.bufferHealth.push(bufferSize);
        this.trimMetrics(this.metrics.bufferHealth);

        this.metrics.totalFrames++;
    }

    /**
     * Enregistrer la réception de données réseau
     */
    recordNetworkData(bytes, timestamp) {
        this.metrics.bytesReceived += bytes;

        // Calculer latence si timestamp fourni
        if (timestamp) {
            const latency = performance.now() - timestamp;
            this.metrics.networkLatency.push(latency);
            this.trimMetrics(this.metrics.networkLatency);
        }
    }

    /**
     * Enregistrer un frame dropped
     */
    recordDroppedFrame() {
        this.metrics.droppedFrames++;
    }

    /**
     * Limiter la taille des tableaux de métriques
     */
    trimMetrics(arr) {
        while (arr.length > this.maxHistorySize) {
            arr.shift();
        }
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
    calculateStats() {
        const uptime = (performance.now() - this.startTime) / 1000;

        this.stats = {
            avgFps: this.average(this.metrics.fps),
            avgDecodeTime: this.average(this.metrics.frameDecodeTime),
            avgLatency: this.average(this.metrics.networkLatency),
            avgBufferSize: this.average(this.metrics.bufferHealth),
            droppedFrameRate: (this.metrics.droppedFrames / this.metrics.totalFrames * 100),
            estimatedBandwidth: (this.metrics.bytesReceived * 8 / uptime / 1000000), // Mbps
            uptime: uptime
        };

        return this.stats;
    }

    /**
     * Obtenir le health score (0-100)
     */
    getHealthScore() {
        const stats = this.calculateStats();

        let score = 100;

        // Pénalité FPS
        if (stats.avgFps < 60) score -= (60 - stats.avgFps) * 2;
        if (stats.avgFps < 30) score -= 20;

        // Pénalité latence
        if (stats.avgLatency > 100) score -= (stats.avgLatency - 100) / 10;

        // Pénalité buffer health
        if (stats.avgBufferSize < 3) score -= (3 - stats.avgBufferSize) * 10;

        // Pénalité dropped frames
        score -= stats.droppedFrameRate * 2;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Créer l'overlay de debug
     */
    createOverlay() {
        if (this.overlayElement) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'performance-monitor-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.85);
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 12px;
            border-radius: 6px;
            z-index: 99999;
            min-width: 280px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            border: 1px solid #0f0;
        `;

        overlay.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold; border-bottom: 1px solid #0f0; padding-bottom: 4px;">
                📊 PERFORMANCE MONITOR
            </div>
            <div id="perf-stats"></div>
            <div style="margin-top: 8px; font-size: 10px; opacity: 0.7;">
                Press Ctrl+D to hide
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlayElement = overlay;
    }

    /**
     * Mettre à jour l'affichage de l'overlay
     */
    updateOverlay() {
        if (!this.overlayElement) return;

        const stats = this.calculateStats();
        const healthScore = this.getHealthScore();

        // Couleur du health score
        let healthColor = '#0f0'; // vert
        if (healthScore < 70) healthColor = '#ff0'; // jaune
        if (healthScore < 40) healthColor = '#f00'; // rouge

        const statsElement = this.overlayElement.querySelector('#perf-stats');
        statsElement.innerHTML = `
            <div style="margin-bottom: 6px;">
                <span style="color: ${healthColor}; font-weight: bold;">
                    Health: ${healthScore}%
                </span>
            </div>
            <div>FPS: <span style="color: ${stats.avgFps > 55 ? '#0f0' : '#f00'}">${stats.avgFps.toFixed(1)}</span></div>
            <div>Decode: ${stats.avgDecodeTime.toFixed(2)} ms</div>
            <div>Latency: ${stats.avgLatency.toFixed(1)} ms</div>
            <div>Buffer: ${stats.avgBufferSize.toFixed(1)} frames</div>
            <div>Dropped: ${stats.droppedFrameRate.toFixed(2)}%</div>
            <div>Bandwidth: ${stats.estimatedBandwidth.toFixed(2)} Mbps</div>
            <div>Uptime: ${Math.floor(stats.uptime)} sec</div>
            <div style="font-size: 10px; margin-top: 4px; opacity: 0.6;">
                Total frames: ${this.metrics.totalFrames}
            </div>
        `;
    }

    /**
     * Activer le monitoring avec overlay
     */
    enable() {
        if (this.enabled) return;

        this.enabled = true;
        this.createOverlay();

        // Mettre à jour l'affichage toutes les 500ms
        this.updateInterval = setInterval(() => {
            this.updateOverlay();
        }, 500);

        console.log('[PerformanceMonitor] Enabled');
    }

    /**
     * Désactiver le monitoring
     */
    disable() {
        if (!this.enabled) return;

        this.enabled = false;

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        if (this.overlayElement) {
            this.overlayElement.remove();
            this.overlayElement = null;
        }

        console.log('[PerformanceMonitor] Disabled');
    }

    /**
     * Toggle le monitoring (Ctrl+D)
     */
    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    /**
     * Réinitialiser toutes les métriques
     */
    reset() {
        this.metrics = {
            frameDecodeTime: [],
            renderTime: [],
            networkLatency: [],
            bufferHealth: [],
            fps: [],
            droppedFrames: 0,
            totalFrames: 0,
            bytesReceived: 0
        };
        this.startTime = performance.now();
        console.log('[PerformanceMonitor] Reset');
    }

    /**
     * Exporter les métriques en JSON (pour debugging)
     */
    exportMetrics() {
        const stats = this.calculateStats();
        return {
            stats: stats,
            rawMetrics: {
                fps: this.metrics.fps.slice(-60), // dernière seconde
                decodeTime: this.metrics.frameDecodeTime.slice(-60),
                latency: this.metrics.networkLatency.slice(-30),
                bufferHealth: this.metrics.bufferHealth.slice(-60)
            },
            timestamp: Date.now()
        };
    }

    /**
     * Logger les métriques dans la console
     */
    logStats() {
        const stats = this.calculateStats();
        console.log('=== Performance Stats ===');
        console.log(`FPS: ${stats.avgFps.toFixed(1)}`);
        console.log(`Decode Time: ${stats.avgDecodeTime.toFixed(2)} ms`);
        console.log(`Network Latency: ${stats.avgLatency.toFixed(1)} ms`);
        console.log(`Buffer Size: ${stats.avgBufferSize.toFixed(1)} frames`);
        console.log(`Dropped Frames: ${stats.droppedFrameRate.toFixed(2)}%`);
        console.log(`Bandwidth: ${stats.estimatedBandwidth.toFixed(2)} Mbps`);
        console.log(`Uptime: ${Math.floor(stats.uptime)} seconds`);
        console.log(`Health Score: ${this.getHealthScore()}%`);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}

// Keyboard shortcut (Ctrl+D)
if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            if (window.performanceMonitor) {
                window.performanceMonitor.toggle();
            }
        }
    });
}
