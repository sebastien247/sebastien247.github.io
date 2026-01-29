const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const app = express();

// Configuration des ports
const HTTPS_PORT = process.env.HTTPS_PORT || 8081; // Port principal pour HTTPS (par défaut 8081 comme dans l'application)
const WS_CONTROL_PORT = process.env.WS_CONTROL_PORT || 8090; // Port pour le WebSocket de contrôle
const WS_VIDEO_PORT = process.env.WS_VIDEO_PORT || 8091; // Port pour le WebSocket vidéo
const WS_AUDIO_PORT = process.env.WS_AUDIO_PORT || 8092; // Port pour le WebSocket audio

// Options pour HTTPS avec certificat auto-signé
const options = {
  key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
  // Ajouter des configurations supplémentaires pour TLSv1.2
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.2',
  ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:AES128-GCM-SHA256:AES256-GCM-SHA384',
  honorCipherOrder: true,
  requestCert: false, // Ne pas demander de certificat client
  rejectUnauthorized: false // Accepter les connexions même sans certificat client
};

console.log('Certificat chargé:', path.join(__dirname, 'cert', 'cert.pem'));
console.log('Clé chargée:', path.join(__dirname, 'cert', 'key.pem'));

// Middleware pour le logging des requêtes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Servir les fichiers statiques du répertoire courant
app.use(express.static(__dirname));

// Route pour tester le serveur
app.get('/api/test', (req, res) => {
  res.json({ message: 'Le serveur HTTPS fonctionne!' });
});

// Route pour /getsocketport (simuler la réponse comme dans l'application)
app.get('/getsocketport', (req, res) => {
  const width = req.query.w || 1920;
  const height = req.query.h || 1080;
  const webcodec = req.query.webcodec || 'true';
  
  console.log(`Demande de socket pour écran ${width}x${height}, webcodec: ${webcodec}`);
  
  const response = {
    port: WS_CONTROL_PORT,
    resolution: 2,
    buildversion: 31,
    usebt: false,
    debug: true
  };
  
  console.log('Réponse:', JSON.stringify(response));
  res.json(response);
});

// Démarrer le serveur HTTPS principal
const server = https.createServer(options, app);
server.listen(HTTPS_PORT, () => {
  console.log(`Serveur HTTPS démarré sur https://localhost:${HTTPS_PORT}`);
  console.log(`Options TLS: ${options.minVersion} - ${options.maxVersion}`);
});

// Gestion des erreurs du serveur
server.on('error', (err) => {
  console.error('Erreur du serveur HTTPS:', err);
});

// Créer et démarrer le serveur WebSocket de contrôle
const wsControlServer = new https.createServer(options);

// Attacher le serveur WebSocket au serveur HTTPS
const wss = new WebSocketServer({ server: wsControlServer });

wss.on('connection', (ws, req) => {
  console.log(`Nouvelle connexion WebSocket de contrôle depuis ${req.socket.remoteAddress}`);
  
  ws.on('message', (message) => {
    console.log('Message reçu sur le WebSocket de contrôle:', message.toString());
    // Ici vous pouvez implémenter la logique de traitement des messages
  });
  
  ws.on('close', () => {
    console.log('Connexion WebSocket de contrôle fermée');
  });

  ws.on('error', (error) => {
    console.error('Erreur WebSocket:', error);
  });
});

wsControlServer.listen(WS_CONTROL_PORT, () => {
  console.log(`Serveur WebSocket de contrôle démarré sur wss://localhost:${WS_CONTROL_PORT}`);
});

// Gestion des erreurs des WebSockets
wsControlServer.on('error', (err) => {
  console.error('Erreur du serveur WebSocket de contrôle:', err);
});

console.log('Tous les serveurs sont configurés et en attente de connexions'); 