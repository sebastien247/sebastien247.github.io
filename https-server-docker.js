const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const app = express();

// Configuration des ports
const HTTP_PORT = process.env.HTTP_PORT || 80;    // Port HTTP pour Let's Encrypt
const HTTPS_PORT = process.env.HTTPS_PORT || 443; // Port principal pour HTTPS (443 pour SSL)

// Chemins des certificats configurables via variables d'environnement
const CERT_KEY_PATH = process.env.CERT_KEY_PATH || path.join(__dirname, 'cert', 'key.pem');
const CERT_FULL_PATH = process.env.CERT_FULL_PATH || path.join(__dirname, 'cert', 'cert.pem');

// Créer le dossier pour les challenges ACME si nécessaire
const ACME_CHALLENGE_DIR = path.join(__dirname, '.well-known', 'acme-challenge');
if (!fs.existsSync(ACME_CHALLENGE_DIR)) {
    fs.mkdirSync(ACME_CHALLENGE_DIR, { recursive: true });
}

// Route spéciale pour les challenges Let's Encrypt
app.use('/.well-known/acme-challenge', express.static(ACME_CHALLENGE_DIR));

// Options pour HTTPS
const options = {
  key: fs.readFileSync(CERT_KEY_PATH),
  cert: fs.readFileSync(CERT_FULL_PATH),
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.2',
  ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:AES128-GCM-SHA256:AES256-GCM-SHA384',
  honorCipherOrder: true,
  requestCert: false,
  rejectUnauthorized: false
};

console.log('Certificats chargés depuis:');
console.log('- Clé:', CERT_KEY_PATH);
console.log('- Certificat:', CERT_FULL_PATH);

// Middleware pour le logging des requêtes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Servir les fichiers statiques du répertoire courant
app.use(express.static(__dirname));

// Démarrer le serveur HTTP pour Let's Encrypt
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`Serveur HTTP démarré sur http://0.0.0.0:${HTTP_PORT}`);
});

// Démarrer le serveur HTTPS principal
const server = https.createServer(options, app);
server.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`Serveur HTTPS démarré sur https://0.0.0.0:${HTTPS_PORT}`);
  console.log(`Options TLS: ${options.minVersion} - ${options.maxVersion}`);
});

// Gestion des erreurs des serveurs
httpServer.on('error', (err) => {
  console.error('Erreur du serveur HTTP:', err);
});

server.on('error', (err) => {
  console.error('Erreur du serveur HTTPS:', err);
});

console.log('Tous les serveurs sont configurés et en attente de connexions'); 
