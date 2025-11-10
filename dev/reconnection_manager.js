/**
 * RECONNECTION MANAGER
 *
 * Gestion intelligente de la reconnexion automatique avec exponential backoff
 * Gère les coupures réseau (tunnel, parking, changement de réseau)
 *
 * Features:
 * - Exponential backoff avec jitter
 * - Détection de la qualité réseau
 * - Notifications utilisateur
 * - Statistiques de connexion
 */

class ReconnectionManager {
    constructor(options = {}) {
        // Configuration
        this.maxRetries = options.maxRetries || 15;
        this.baseDelay = options.baseDelay || 1000; // 1 seconde
        this.maxDelay = options.maxDelay || 30000; // 30 secondes
        this.jitterRange = options.jitterRange || 0.3; // ±30%

        // État
        this.retries = 0;
        this.isConnected = false;
        this.isReconnecting = false;
        this.reconnectTimeout = null;

        // Statistiques
        this.stats = {
            totalDisconnections: 0,
            totalReconnections: 0,
            failedReconnections: 0,
            connectionUptime: 0,
            lastDisconnectTime: null,
            lastConnectTime: null
        };

        // Callbacks
        this.onReconnectStart = null;
        this.onReconnectSuccess = null;
        this.onReconnectFailed = null;
        this.onMaxRetriesReached = null;

        // UI
        this.statusElement = null;
    }

    /**
     * Calculer le délai avec exponential backoff + jitter
     */
    calculateDelay() {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
        const exponentialDelay = Math.min(
            this.baseDelay * Math.pow(2, this.retries),
            this.maxDelay
        );

        // Ajouter du jitter pour éviter les "thundering herd"
        const jitter = exponentialDelay * this.jitterRange * (Math.random() * 2 - 1);
        const finalDelay = exponentialDelay + jitter;

        return Math.max(this.baseDelay, finalDelay);
    }

    /**
     * Démarrer une tentative de reconnexion
     */
    async startReconnection(connectFunction) {
        if (this.isReconnecting) {
            console.warn('[ReconnectionManager] Already reconnecting');
            return;
        }

        this.isReconnecting = true;
        this.stats.totalDisconnections++;
        this.stats.lastDisconnectTime = Date.now();

        console.log('[ReconnectionManager] Starting reconnection process');

        // Notifier le début de reconnexion
        if (this.onReconnectStart) {
            this.onReconnectStart();
        }

        // Lancer le processus de reconnexion
        await this.attemptReconnection(connectFunction);
    }

    /**
     * Tentative de reconnexion avec backoff
     */
    async attemptReconnection(connectFunction) {
        while (this.retries < this.maxRetries && this.isReconnecting) {
            const delay = this.calculateDelay();

            console.log(`[ReconnectionManager] Attempt ${this.retries + 1}/${this.maxRetries} in ${(delay/1000).toFixed(1)}s`);

            // Mettre à jour l'UI
            this.updateStatus(`Reconnexion (${this.retries + 1}/${this.maxRetries})...`, delay);

            // Attendre le délai
            await this.delay(delay);

            // Vérifier si on doit toujours continuer
            if (!this.isReconnecting) {
                console.log('[ReconnectionManager] Reconnection cancelled');
                return;
            }

            try {
                // Tenter la connexion
                await connectFunction();

                // Succès!
                this.handleReconnectSuccess();
                return;

            } catch (error) {
                console.error(`[ReconnectionManager] Attempt ${this.retries + 1} failed:`, error);
                this.retries++;
                this.stats.failedReconnections++;
            }
        }

        // Max retries atteint
        this.handleMaxRetriesReached();
    }

    /**
     * Gérer une reconnexion réussie
     */
    handleReconnectSuccess() {
        console.log('[ReconnectionManager] Reconnection successful!');

        this.isConnected = true;
        this.isReconnecting = false;
        this.stats.totalReconnections++;
        this.stats.lastConnectTime = Date.now();

        // Calculer le temps de déconnexion
        if (this.stats.lastDisconnectTime) {
            const downtime = Date.now() - this.stats.lastDisconnectTime;
            console.log(`[ReconnectionManager] Downtime: ${(downtime/1000).toFixed(1)}s`);
        }

        // Réinitialiser les compteurs
        this.retries = 0;

        // Mettre à jour l'UI
        this.updateStatus('Connecté', null, true);
        setTimeout(() => this.hideStatus(), 3000);

        // Notifier le callback
        if (this.onReconnectSuccess) {
            this.onReconnectSuccess();
        }
    }

    /**
     * Gérer l'échec complet de reconnexion
     */
    handleMaxRetriesReached() {
        console.error('[ReconnectionManager] Max retries reached, giving up');

        this.isReconnecting = false;

        // Mettre à jour l'UI
        this.updateStatus(
            `Échec de reconnexion après ${this.maxRetries} tentatives`,
            null,
            false,
            true
        );

        // Notifier le callback
        if (this.onMaxRetriesReached) {
            this.onMaxRetriesReached();
        }
    }

    /**
     * Notifier une déconnexion
     */
    notifyDisconnected() {
        this.isConnected = false;
        console.log('[ReconnectionManager] Connection lost');
    }

    /**
     * Annuler la reconnexion en cours
     */
    cancel() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.isReconnecting = false;
        console.log('[ReconnectionManager] Reconnection cancelled');
    }

    /**
     * Réinitialiser les compteurs
     */
    reset() {
        this.retries = 0;
        this.isReconnecting = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        console.log('[ReconnectionManager] Reset');
    }

    /**
     * Promise delay
     */
    delay(ms) {
        return new Promise((resolve) => {
            this.reconnectTimeout = setTimeout(resolve, ms);
        });
    }

    /**
     * Créer l'élément de status UI
     */
    createStatusElement() {
        if (this.statusElement) return;

        const element = document.createElement('div');
        element.id = 'reconnection-status';
        element.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 16px;
            z-index: 100000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            display: none;
            text-align: center;
            min-width: 300px;
        `;

        element.innerHTML = `
            <div id="reconnect-message"></div>
            <div id="reconnect-progress" style="margin-top: 12px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
                <div id="reconnect-progress-bar" style="height: 100%; background: #4caf50; width: 0%; transition: width 0.3s;"></div>
            </div>
            <div id="reconnect-timer" style="margin-top: 8px; font-size: 14px; color: #999;"></div>
        `;

        document.body.appendChild(element);
        this.statusElement = element;
    }

    /**
     * Mettre à jour le status UI
     */
    updateStatus(message, delay = null, isSuccess = false, isError = false) {
        this.createStatusElement();

        const messageEl = this.statusElement.querySelector('#reconnect-message');
        const progressEl = this.statusElement.querySelector('#reconnect-progress');
        const progressBar = this.statusElement.querySelector('#reconnect-progress-bar');
        const timerEl = this.statusElement.querySelector('#reconnect-timer');

        messageEl.textContent = message;
        this.statusElement.style.display = 'block';

        // Couleur selon le status
        if (isSuccess) {
            this.statusElement.style.background = 'rgba(76, 175, 80, 0.95)';
        } else if (isError) {
            this.statusElement.style.background = 'rgba(244, 67, 54, 0.95)';
        } else {
            this.statusElement.style.background = 'rgba(0, 0, 0, 0.9)';
        }

        // Progress bar
        if (delay) {
            progressEl.style.display = 'block';
            progressBar.style.width = '0%';

            const startTime = Date.now();
            const updateProgress = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(100, (elapsed / delay) * 100);

                progressBar.style.width = progress + '%';
                timerEl.textContent = `${((delay - elapsed) / 1000).toFixed(1)}s`;

                if (progress < 100 && this.isReconnecting) {
                    requestAnimationFrame(updateProgress);
                }
            };
            updateProgress();
        } else {
            progressEl.style.display = 'none';
            timerEl.textContent = '';
        }
    }

    /**
     * Cacher le status UI
     */
    hideStatus() {
        if (this.statusElement) {
            this.statusElement.style.display = 'none';
        }
    }

    /**
     * Obtenir les statistiques
     */
    getStats() {
        const uptime = this.stats.lastConnectTime ?
            Date.now() - this.stats.lastConnectTime : 0;

        return {
            ...this.stats,
            currentUptime: uptime,
            successRate: this.stats.totalDisconnections > 0 ?
                (this.stats.totalReconnections / this.stats.totalDisconnections * 100).toFixed(1) + '%' :
                '100%',
            isConnected: this.isConnected,
            isReconnecting: this.isReconnecting,
            currentRetry: this.retries
        };
    }

    /**
     * Logger les statistiques
     */
    logStats() {
        const stats = this.getStats();
        console.log('=== Reconnection Stats ===');
        console.log(`Total disconnections: ${stats.totalDisconnections}`);
        console.log(`Successful reconnections: ${stats.totalReconnections}`);
        console.log(`Failed reconnections: ${stats.failedReconnections}`);
        console.log(`Success rate: ${stats.successRate}`);
        console.log(`Current uptime: ${(stats.currentUptime / 1000).toFixed(1)}s`);
        console.log(`Status: ${this.isConnected ? 'Connected' : 'Disconnected'}`);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReconnectionManager;
}
