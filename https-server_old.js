const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const app = express();

// Configuration des ports
const HTTPS_PORT = process.env.HTTPS_PORT || 8081; // Port principal pour HTTPS (par défaut 8081 comme dans l'application)
const WS_CONTROL_PORT = process.env.WS_CONTROL_PORT || 9090; // Port pour le WebSocket de contrôle
const WS_VIDEO_PORT = process.env.WS_VIDEO_PORT || 9091; // Port pour le WebSocket vidéo
const WS_AUDIO_PORT = process.env.WS_AUDIO_PORT || 9092; // Port pour le WebSocket audio

// Options pour HTTPS avec certificat auto-signé
const options = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
  // Configuration pour l'authentification mutuelle SSL
  ca: [fs.readFileSync(path.join(__dirname, 'cert.pem'))], // Autorité de certification pour vérifier les clients
  requestCert: true, // Demander un certificat client
  rejectUnauthorized: false, // Ne pas rejeter les connexions sans certificat valide
  secureOptions: require('constants').SSL_OP_NO_TLSv1 | require('constants').SSL_OP_NO_TLSv1_1,
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA',
    'ECDHE-RSA-AES256-SHA'
  ].join(':'),
  minVersion: 'TLSv1.2'
};

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
  
  const response = {
    port: HTTPS_PORT,
    resolution: 2,
    buildversion: 31,
    usebt: false,
    debug: true
  };
  
  res.json(response);
});

// Démarrer le serveur HTTPS principal
const server = https.createServer(options, app);
server.listen(HTTPS_PORT, () => {
  console.log(`Serveur HTTPS démarré sur https://localhost:${HTTPS_PORT}`);
});

// Créer et démarrer le serveur WebSocket de contrôle
const wsControlServer = new WebSocketServer({ 
  server: server,
  path: '/control'
});

wsControlServer.on('connection', (ws) => {
  console.log('Nouvelle connexion WebSocket de contrôle');
  
  ws.on('message', (message) => {
    console.log('Message reçu sur le WebSocket de contrôle:', message.toString());
    // Ici vous pouvez implémenter la logique de traitement des messages
  });
  
  ws.on('close', () => {
    console.log('Connexion WebSocket de contrôle fermée');
  });
});

// Créer et démarrer le serveur WebSocket vidéo
const wsVideoServer = new WebSocketServer({ 
  server: server,
  path: '/video'
});

wsVideoServer.on('connection', (ws) => {
  console.log('Nouvelle connexion WebSocket vidéo');
});

// Créer et démarrer le serveur WebSocket audio
const wsAudioServer = new WebSocketServer({ 
  server: server,
  path: '/audio'
});

wsAudioServer.on('connection', (ws) => {
  console.log('Nouvelle connexion WebSocket audio');
});

console.log(`Serveur WebSocket de contrôle démarré sur wss://localhost:${HTTPS_PORT}/control`);
console.log(`Serveur WebSocket vidéo démarré sur wss://localhost:${HTTPS_PORT}/video`);
console.log(`Serveur WebSocket audio démarré sur wss://localhost:${HTTPS_PORT}/audio`); 