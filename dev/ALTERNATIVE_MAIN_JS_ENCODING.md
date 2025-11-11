# ALTERNATIVE: Encodage Binaire dans main.js

## Vue d'ensemble

Cette approche encode les touch events **dans main.js** (main thread) avant de les envoyer au worker.

---

## Modifications Nécessaires

### 1. Modifier main.js

```javascript
// En haut du fichier main.js
const binaryTouchEncoder = new (function() {
    // Copier la classe BinaryTouchEncoder ici
    // OU charger via <script src="binary_touch_protocol.js">
})();

// Modifier handleTouchStart/Move/End
function handleTouchStart(event) {
    event.preventDefault();
    initializeAudioOnFirstTouch();

    const newTouches = convertTouchListToCoords(event.changedTouches);
    newTouches.forEach(touch => activeTouches.set(touch.id, touch));

    const allTouches = convertTouchListToCoords(event.touches);

    // NOUVEAU: Encoder en binaire
    try {
        const binaryData = binaryTouchEncoder.encode('MULTITOUCH_DOWN', newTouches);

        // Envoyer le buffer binaire au worker avec transfert
        demuxDecodeWorker.postMessage({
            action: 'BINARY_TOUCH',
            data: binaryData,
            originalAction: 'MULTITOUCH_DOWN'
        }, [binaryData]); // Transferable object
    } catch (error) {
        // Fallback JSON
        demuxDecodeWorker.postMessage({
            action: "MULTITOUCH_DOWN",
            touches: newTouches,
            allTouches: allTouches,
            timestamp: performance.now()
        });
    }

    // Rétrocompatibilité single-touch
    if (allTouches.length === 1 && newTouches.length > 0) {
        demuxDecodeWorker.postMessage({
            action: "DOWN",
            X: newTouches[0].x,
            Y: newTouches[0].y,
            timestamp: performance.now()
        });
    }
}

// Même chose pour handleTouchEnd et processTouchMove
```

### 2. Modifier async_decoder.js

```javascript
// Dans messageHandler
function messageHandler(message) {
    if (message.data.action === 'NIGHT') {
        night = message.data.value;
    }

    if (socket.readyState === WebSocket.OPEN) {
        const action = message.data.action;

        // NOUVEAU: Détecter les messages binaires
        if (action === 'BINARY_TOUCH') {
            // Le buffer binaire arrive déjà encodé
            const binaryData = message.data.data;

            try {
                socket.send(binaryData);

                if (BINARY_TOUCH_DEBUG) {
                    console.log('[BinaryTouch] Forwarded binary data:', binaryData.byteLength + ' bytes');
                }
            } catch (error) {
                console.error('[BinaryTouch] Send error:', error);
            }
        } else {
            // Messages JSON normaux
            socket.sendObject(message.data);
        }
    }
}
```

---

## Avantages de cette Approche

1. ✅ **Encodage plus tôt dans le pipeline**
2. ✅ **Main.js a le contrôle complet**
3. ✅ **Worker devient un simple proxy**

## Inconvénients

1. ❌ **Main.js plus complexe** (ajout de logique d'encodage)
2. ❌ **PostMessage supplémentaire** (ArrayBuffer transfer)
3. ❌ **Code dupliqué** (import dans 2 fichiers)
4. ❌ **Détection de format nécessaire** dans le worker
5. ❌ **Fragmentation des logs** (debug dans 2 threads)

---

## Comparaison

| Aspect | Encodage dans async_decoder.js | Encodage dans main.js |
|--------|-------------------------------|----------------------|
| **Simplicité** | ✅ Simple | ❌ Plus complexe |
| **Performance** | ✅ Pas de postMessage extra | ⚠️ Transfert ArrayBuffer |
| **Maintenabilité** | ✅ Tout dans worker | ❌ Split sur 2 fichiers |
| **Contrôle** | ⚠️ Worker contrôle | ✅ Main contrôle |
| **Logs** | ✅ Centralisés | ❌ Fragmentés |

---

## Recommandation

**Garder l'encodage dans async_decoder.js** (approche actuelle) car:
- Plus simple
- Meilleure performance
- Meilleur pour maintenance
- Le WebSocket vit déjà dans le worker

Utiliser l'encodage dans main.js **seulement si**:
- Vous voulez que main.js contrôle entièrement l'encodage
- Vous avez besoin de pré-traiter les données avant envoi au worker
