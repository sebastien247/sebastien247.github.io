importScripts("Decoder.js");

// ========== Constants and Variable Declarations ==========

const MAX_TEXTURE_POOL_SIZE = 5;
let pendingFrames = [],
    underflow = true,
    night = false,
    frameTimes = [],
    runtime = 0,
    frameCounter = 0,
    sps, decoder = null, socket, height, width, port, gl, heart = 0,
    broadwayDecoder = null,
    lastheart = 0, pongtimer, frameRate;

const texturePool = [];

// ========== Utility Functions ==========

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function appendByteArray(buffer1, buffer2) {
    // Validate inputs
    if (!buffer1 || !buffer2 || !buffer1.byteLength || !buffer2.byteLength) {
        console.error("appendByteArray: Invalid buffers", {buffer1, buffer2});
        return buffer1 || buffer2 || new Uint8Array(0);
    }
    
    const tmp = new Uint8Array((buffer1.byteLength | 0) + (buffer2.byteLength | 0));
    tmp.set(buffer1, 0);
    tmp.set(buffer2, buffer1.byteLength | 0);
    return tmp;
}

// ========== Frame Functions ==========

function updateFrameCounter() {
    frameTimes[runtime] = frameCounter;
    frameRate = Math.round((frameCounter - frameTimes[runtime - 10]) / 10);
    runtime++;
}

function getFrameStats() {
    frameCounter++;
    return frameRate;
}

// ========== WebGL and Canvas Functions ==========

function getTexture(gl) {
    if (texturePool.length > 0) return texturePool.pop();
    return gl.createTexture();
}

function releaseTexture(gl, texture) {
    if (texturePool.length < MAX_TEXTURE_POOL_SIZE) {
        texturePool.push(texture);
    } else {
        gl.deleteTexture(texture);
    }
}

function drawImageToCanvas(image) {
    const texture = getTexture(gl);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);

    if (isPowerOf2(width) && isPowerOf2(height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindTexture(gl.TEXTURE_2D, null);
    releaseTexture(gl, texture);

    if (image.close) {
        image.close();
    }
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function switchToBroadway() {
    console.log("Switching to broadway decoder");
    decoder = null;

    broadwayDecoder = new Decoder({rgb: true});
    broadwayDecoder.onPictureDecoded = function (buffer){
        pendingFrames.push(buffer)
        if(underflow) {
            renderFrame();
        }
    }
}

function initCanvas(canvas, forceBroadway) {

    height = canvas.height;
    width = canvas.width;

    gl = canvas.getContext('webgl2');

    const vertexSource = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0, 1);
            v_texCoord = a_texCoord;
        }
    `;
    const fragmentSource = `
        precision mediump float;
        uniform sampler2D u_image;
        varying vec2 v_texCoord;
        void main() {
            gl_FragColor = texture2D(u_image, v_texCoord);
        }
    `;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    positionLocation = gl.getAttribLocation(program, "a_position");
    texcoordLocation = gl.getAttribLocation(program, "a_texCoord");

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]), gl.STATIC_DRAW);

    texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0]), gl.STATIC_DRAW);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    if(!forceBroadway) {
        try {
            decoder = new VideoDecoder({
                output: (frame) => {
                    pendingFrames.push(frame);
                    if (underflow) {
                        renderFrame();
                    }
                },
                error: (e) => {
                    switchToBroadway()
                },
            })
        } catch(e) {
            switchToBroadway();
        }
    } else {
        console.log("Forcing to broadway decoder")
        switchToBroadway();
    }

    startSocket();
}

// ========== Rendering and Decoder Functions ==========

async function renderFrame() {
    underflow = pendingFrames.length === 0;
    if (underflow) {
        return;
    }
    const frame = pendingFrames.shift();
    drawImageToCanvas(frame);

    if (pendingFrames.length < 5) {
        socket.sendObject({action: "ACK"});
    }
    try {
        self.postMessage({
            fps: getFrameStats(),
            decodeQueueSize: decoder !== null ? decoder.decodeQueueSize : 0,
            pendingFrames: pendingFrames.length
        });
    } catch (e) {
        self.postMessage({error: e});
    }
    renderFrame();
}

function separateNalUnits(event){
    let i = -1;
    return event
        .reduce((output, value, index, self) => {
            if (value === 0 && self[index + 1] === 0 && self[index + 2] === 0 && self[index + 3] === 1) {
                i++;
            }
            if (!output[i]) {
                output[i] = [];
            }
            output[i].push(value);
            return output;
        }, [])
        .map(dat => Uint8Array.from(dat));
}

function videoMagic(dat){
    let unittype = (dat[4] & 0x1f);
    if (unittype === 1) {
        if(decoder !== null) {
            let chunk = new EncodedVideoChunk({
                type: 'delta',
                timestamp: 0,
                duration: 0,
                data: dat
            });
            if (decoder.state !== 'closed') {
                try {
                    decoder.decode(chunk);
                } catch (e) {
                    console.error("Video decoder error", e);
                    switchToBroadway();
                }
            } else {
                switchToBroadway();
            }
        }

        if(broadwayDecoder !== null) {
            broadwayDecoder.decode(dat)
        }
        return;
    }

    if (unittype === 5) {
        let data = appendByteArray(sps, dat);
        if(decoder !== null) {
            let chunk = new EncodedVideoChunk({
                type: 'key',
                timestamp: 0,
                duration: 0,
                data: data
            });
            if (decoder.state !== 'closed') {
                try {
                    decoder.decode(chunk);
                } catch (e) {
                    console.error("Video decoder error", e);
                    switchToBroadway();
                }
            } else {
                switchToBroadway();
            }
        }

        if(broadwayDecoder !== null) {
            broadwayDecoder.decode(data)
        }
    }
}

function headerMagic(dat) {
    let unittype = (dat[4] & 0x1f);

    if (unittype === 7) {
        let config = {
            codec: "avc1.",
            codedHeight: height,
            codedWidth: width,
        }
        for (let i = 5; i < 8; ++i) {
            var h = dat[i].toString(16);
            if (h.length < 2) {
                h = '0' + h;
            }
            config.codec += h;
        }
        sps = dat;
        if(decoder !== null) {
            try {
                decoder.configure(config);
            } catch (exc) {
                switchToBroadway();
            }
        }

        return;
    }
    else if (unittype === 8)
        sps=appendByteArray(sps,dat)
    else
        videoMagic(dat);
}

// ========== Socket and Message Handling ==========

function noPong() {
    self.postMessage({error: "no pong"});
}

function heartbeat() {
    if (lastheart !== 0) {
        if ((Date.now() - lastheart) > 3000) {
            if (socket.readyState === WebSocket.OPEN) {
                try {
                    socket.sendObject({action: "START"});
                } catch (e) {
                    self.postMessage({error: e});
                    startSocket();
                }
            }
        }
    }

    lastheart = Date.now();
    socket.sendObject({action: "PING"});
}



// Latency measurement variables
let latencyStats = {
    measurements: [],
    totalFrames: 0,
    startTime: performance.now(),
    lastReportTime: performance.now(),
    minLatency: Infinity,
    maxLatency: 0,
    totalLatency: 0,
    slowdownDetectionBuffer: [],
    reportingInterval: 5000, // Report every 5 seconds
    measurementWindowSize: 1000, // Keep last 1000 measurements for analysis
    timeOffset: null // Time offset between Android and browser clocks
};

function extractTimestampFromFrame(data) {
    if (data.length < 12) { // Need at least 8 bytes for timestamp + 4 for H.264 header
        return null; // Not enough data for timestamp + H.264
    }
    
    // Check if this looks like H.264 data (starts with 0x00 0x00 0x00 0x01)
    if (data[0] === 0x00 && data[1] === 0x00 && data[2] === 0x00 && data[3] === 0x01) {
        // This looks like regular H.264 data without timestamp
        return null;
    }
    
    // Extract 8-byte timestamp (big-endian) from the beginning
    let timestampMicros = 0;
    for (let i = 0; i < 8; i++) {
        timestampMicros = (timestampMicros * 256) + data[i];
    }
    
    // Sanity check: timestamp should be reasonable (not zero, not too far in future)
    // Android timestamps are typically in microseconds since boot
    if (timestampMicros === 0 || timestampMicros > Date.now() * 10000) { // 10x current time in microseconds
        return null; // Invalid timestamp
    }
    
    // Check if the H.264 data after timestamp looks valid
    if (data.length < 12 || !(data[8] === 0x00 && data[9] === 0x00 && data[10] === 0x00 && data[11] === 0x01)) {
        return null; // H.264 header not found after timestamp
    }
    
    return timestampMicros;
}

function measureLatency(androidTimestampMicros) {
    // Get current browser time in microseconds
    const browserTimestampMicros = (typeof self !== 'undefined' ? self.performance.now() : performance.now()) * 1000;
    
    // For the first frame, establish the time offset between Android and browser
    if (latencyStats.timeOffset === null) {
        latencyStats.timeOffset = browserTimestampMicros - androidTimestampMicros;
        console.log(`🕐 Time offset established: ${(latencyStats.timeOffset / 1000).toFixed(2)}ms`);
        console.log(`📱 Android timestamp: ${androidTimestampMicros}μs`);
        console.log(`💻 Browser timestamp: ${browserTimestampMicros}μs`);
    }
    
    // Calculate relative latency using the offset
    const adjustedAndroidTime = androidTimestampMicros + latencyStats.timeOffset;
    const latencyMicros = browserTimestampMicros - adjustedAndroidTime;
    const latencyMs = latencyMicros / 1000;
    
    // Update statistics
    latencyStats.totalFrames++;
    latencyStats.totalLatency += latencyMs;
    latencyStats.minLatency = Math.min(latencyStats.minLatency, latencyMs);
    latencyStats.maxLatency = Math.max(latencyStats.maxLatency, latencyMs);
    
    // Add to measurements buffer (keep only recent measurements)
    latencyStats.measurements.push({
        timestamp: browserTimestampMicros / 1000, // Convert to ms for consistency
        latency: latencyMs,
        frameNumber: latencyStats.totalFrames
    });
    
    // Keep buffer size manageable
    if (latencyStats.measurements.length > latencyStats.measurementWindowSize) {
        latencyStats.measurements.shift();
    }
    
    // Add to slowdown detection buffer (last 50 frames)
    latencyStats.slowdownDetectionBuffer.push(latencyMs);
    if (latencyStats.slowdownDetectionBuffer.length > 50) {
        latencyStats.slowdownDetectionBuffer.shift();
    }
    
    // Log individual frame latency (every 30th frame to avoid spam)
    if (latencyStats.totalFrames % 30 === 0) {
        console.log(`📊 Frame #${latencyStats.totalFrames}: ${latencyMs.toFixed(2)}ms latency`);
    }
    
    // Send stats to main thread for dashboard update (every 10 frames)
    if (latencyStats.totalFrames % 10 === 0) {
        self.postMessage({
            latencyStats: {
                totalFrames: latencyStats.totalFrames,
                totalLatency: latencyStats.totalLatency,
                minLatency: latencyStats.minLatency,
                maxLatency: latencyStats.maxLatency,
                measurements: latencyStats.measurements.slice(-100), // Last 100 measurements
                startTime: latencyStats.startTime
            }
        });
    }
    
    // Periodic detailed reporting
    const now = (typeof self !== 'undefined' ? self.performance.now() : performance.now());
    if (now - latencyStats.lastReportTime >= latencyStats.reportingInterval) {
        generateLatencyReport();
        latencyStats.lastReportTime = now;
    }
    
    return latencyMs;
}

function generateLatencyReport() {
    if (latencyStats.totalFrames === 0) return;
    
    const avgLatency = latencyStats.totalLatency / latencyStats.totalFrames;
    const currentTime = (typeof self !== 'undefined' ? self.performance.now() : performance.now());
    const runtime = (currentTime - latencyStats.startTime) / 1000; // seconds
    const fps = latencyStats.totalFrames / runtime;
    
    // Analyze recent measurements for trends
    const recentMeasurements = latencyStats.measurements.slice(-100); // Last 100 frames
    const recentAvg = recentMeasurements.reduce((sum, m) => sum + m.latency, 0) / recentMeasurements.length;
    
    // Detect recurring slowdowns in recent buffer
    const slowdownThreshold = avgLatency * 1.5; // 50% above average
    const recentSlowdowns = latencyStats.slowdownDetectionBuffer.filter(l => l > slowdownThreshold).length;
    const slowdownPercentage = (recentSlowdowns / latencyStats.slowdownDetectionBuffer.length) * 100;
    
    // Calculate percentiles
    const sortedLatencies = recentMeasurements.map(m => m.latency).sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;
    
    console.log("🚀 ═══════════════════ TESLA ANDROID AUTO LATENCY REPORT ═══════════════════");
    console.log(`📈 Runtime: ${runtime.toFixed(1)}s | Total Frames: ${latencyStats.totalFrames} | FPS: ${fps.toFixed(1)}`);
    console.log(`⚡ Overall Latency: Avg=${avgLatency.toFixed(2)}ms | Min=${latencyStats.minLatency.toFixed(2)}ms | Max=${latencyStats.maxLatency.toFixed(2)}ms`);
    console.log(`📊 Recent 100 Frames: Avg=${recentAvg.toFixed(2)}ms | P50=${p50.toFixed(2)}ms | P95=${p95.toFixed(2)}ms | P99=${p99.toFixed(2)}ms`);
    console.log(`🐌 Slowdown Analysis: ${recentSlowdowns}/50 frames (${slowdownPercentage.toFixed(1)}%) above ${slowdownThreshold.toFixed(1)}ms threshold`);
    
    // Performance assessment
    let performanceStatus = "🟢 EXCELLENT";
    if (avgLatency > 100) performanceStatus = "🔴 POOR";
    else if (avgLatency > 50) performanceStatus = "🟡 MODERATE"; 
    else if (avgLatency > 25) performanceStatus = "🟢 GOOD";
    
    console.log(`🎯 Performance Status: ${performanceStatus} (${avgLatency.toFixed(1)}ms average)`);
    console.log("═══════════════════════════════════════════════════════════════════════════");
}

function handleMessage(event) {
    const dat = new Uint8Array(event.data);
    
    // Debug: Log frame info
    console.log(`🔍 FRAME DEBUG: Received ${dat.length} bytes, first 16 bytes:`, 
                Array.from(dat.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // Extract timestamp and measure latency
    const androidTimestamp = extractTimestampFromFrame(dat);
    let actualVideoData = dat;
    
    if (androidTimestamp !== null && androidTimestamp > 0) {
        // We have a valid timestamp - measure latency
        try {
            const latency = measureLatency(androidTimestamp);
            
            // Remove timestamp prefix (first 8 bytes) to get actual H.264 data
            actualVideoData = dat.slice(8);
            
            console.log(`🎯 LATENCY FRAME: Android timestamp: ${androidTimestamp}μs, Latency: ${latency.toFixed(2)}ms`);
            
            // Debug: Log first few frames with detailed info
            if (latencyStats.totalFrames <= 3) {
                console.log(`🔍 Frame #${latencyStats.totalFrames} Debug:`);
                console.log(`   📱 Android timestamp: ${androidTimestamp}μs`);
                console.log(`   💻 Browser timestamp: ${(typeof self !== 'undefined' ? self.performance.now() : performance.now()) * 1000}μs`);
                console.log(`   🕐 Time offset: ${latencyStats.timeOffset}μs`);
                console.log(`   ⏱️ Calculated latency: ${latency.toFixed(2)}ms`);
            }
            
            // Log first frame with timestamp for verification
            if (latencyStats.totalFrames === 1) {
                console.log(`🎯 First timestamped frame received! Android timestamp: ${androidTimestamp}μs, Latency: ${latency.toFixed(2)}ms`);
            }
        } catch (error) {
            console.error("Error measuring latency:", error);
            // If latency measurement fails, just process as regular data
        }
    } else {
        // No timestamp found - this is regular H.264 data
        console.log("⚠️  No timestamp detected - frame starts with:", 
                   Array.from(dat.slice(0, 12)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }
    
    // Validate that we have valid data to process
    if (!actualVideoData || actualVideoData.length === 0) {
        console.error("handleMessage: No valid video data to process");
        return;
    }
    
    // Process the H.264 video data (with or without timestamp)
    handleVideoMessage(actualVideoData);
}

function handleVideoMessage(dat){

    let unittype = (dat[4] & 0x1f);
    if (unittype === 31)
    {
        if (pongtimer !== null)
            clearTimeout(pongtimer);

        pongtimer=setTimeout(noPong,3000);
        return;
    }
    if (unittype === 1 || unittype === 5) {
        videoMagic(dat);
        // Notify the main thread that a video frame was received (not just a pong packet)
        // Only log every 100th frame to reduce spam
        if (latencyStats.totalFrames % 100 === 0) {
            //console.log("Sending videoFrameReceived message to main thread", unittype);
        }
        self.postMessage({videoFrameReceived: true});
    }
    else
        separateNalUnits(dat).forEach(headerMagic)
}

function startSocket() {
    socket = new WebSocket(`wss://taada.top:${port}`);
    socket.sendObject = (obj) => {
        try {
            socket.send(JSON.stringify(obj));
        }
        catch (e)
        {
            self.postMessage({error:e});
        }
    }

    socket.binaryType = "arraybuffer";
    socket.addEventListener('open', () => {
        socket.binaryType = "arraybuffer";
        socket.sendObject({action: "START"});
        socket.sendObject({action: "NIGHT", value: night});
        
        // Au lieu de demander un keyframe immédiatement, attendons un peu
        // pour voir si des données arrivent naturellement
        setTimeout(() => {
            // Ne demander un keyframe que si aucune frame n'a été reçue
            if (pendingFrames.length === 0 && underflow) {
                console.log("No frames received after socket open, requesting keyframe");
                socket.sendObject({action: "REQUEST_KEYFRAME"});
            }
        }, 1000);
        
        if (heart === 0) {
            heart = setInterval(heartbeat, 200);
            setInterval(updateFrameCounter, 1000)
        }
    });

    socket.addEventListener('close', event => socketClose(event));
    socket.addEventListener('error', event => socketClose(event));
    socket.addEventListener('message', event => handleMessage(event));
}

function socketClose(event) {
    console.log('Error: Socket Closed ', event)
    self.postMessage({error: "Lost connection to phone, trying to reconnect"});
    startSocket();
}

async function isWebCodecsWorkingWithDecode() {
    try {
        const sample = new Uint8Array([
            0,0,0,1,103,66,0,42,218,1,224,8,159,150,106,2,2,2,15,20,42,160,0,0,0,1,104,206,13,136,0,0,0,1,101,184,79,255,254,30,66,128,0,128,95,147,21,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,21,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,146,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,228,185,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,46,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,75,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,192
        ]);
        return await new Promise((resolve) => {
            const decoder = new VideoDecoder({
                output: (frame) => {
                    frame.close();
                    resolve(true);
                },
                error: () => resolve(false)
            });
            decoder.configure({codec: 'avc1.42002a', codedHeight: 1080, codedWidth: 1920});
            const chunk = new EncodedVideoChunk({
                type: "key",
                timestamp: 0,
                data: sample
            });
            decoder.decode(chunk);
            // fallback in case output or error doesn't fire
            setTimeout(() => resolve(false), 1000);
        });
    } catch (e) {
        return false;
    }
}


let appVersion= 22;
let initted = false;
let postInitJobs = [];
function messageHandler(message) {
    if (message.data.action === 'NIGHT') {
        night = message.data.value;
    }
    if (socket.readyState === WebSocket.OPEN) {
        socket.sendObject(message.data);
    }
}

self.addEventListener('message', async (message) => {
    if (message.data.action === 'INIT') {
        port = message.data.port;
        appVersion=parseInt(message.data.appVersion);


        let useBroadway = message.data.broadway;

        if(!useBroadway) {
            const codecWorking = await isWebCodecsWorkingWithDecode();
            if(codecWorking) {
                console.log("webcodec functional");
            } else {
                console.log("webcodec broken");
                useBroadway = true;
            }
        }

        initCanvas(message.data.canvas, useBroadway);
        initted = true;
        if(postInitJobs.length > 0){
            postInitJobs.forEach(msg => messageHandler(msg));
            postInitJobs = []
        }
    } else if (message.data.action === 'RESIZE') {
        // Gestion du changement de résolution
        console.log("Resizing decoder to " + message.data.width + "x" + message.data.height);
        width = message.data.width;
        height = message.data.height;
        
        // Mettre à jour la configuration du décodeur si nous utilisons WebCodec
        if(decoder !== null && decoder.state !== 'closed') {
            try {
                // Reconfigurer le décodeur avec les nouvelles dimensions
                let config = {
                    codec: "avc1.",
                    codedHeight: height,
                    codedWidth: width,
                };
                
                // Ajouter le codec spécifique si nous l'avons déjà
                if (sps && sps.length > 7) {
                    for (let i = 5; i < 8; ++i) {
                        var h = sps[i].toString(16);
                        if (h.length < 2) {
                            h = '0' + h;
                        }
                        config.codec += h;
                    }
                } else {
                    // Codec par défaut si on n'a pas encore reçu de SPS
                    config.codec += "42002a";
                }
                
                console.log("Reconfiguring decoder with:", config);
                decoder.configure(config);
                
                self.postMessage({warning: "Résolution adaptée, en attente d'une nouvelle image clé..."});
            } catch (e) {
                console.error("Error reconfiguring decoder:", e);
                self.postMessage({error: "Erreur lors du changement de résolution: " + e.message});
                // En cas d'erreur, essayer de basculer vers Broadway
                switchToBroadway();
            }
        } else if (broadwayDecoder !== null) {
            // Pour Broadway, nous n'avons pas besoin de reconfiguration explicite
            // Le décodeur s'ajustera automatiquement à la nouvelle résolution
            console.log("Broadway decoder will automatically adjust to new resolution on next keyframe");
            self.postMessage({warning: "En attente d'une nouvelle image clé..."});
        }
        
        // Ajuster le viewport WebGL
        if (gl) {
            gl.viewport(0, 0, width, height);
        }
    } else if (message.data.action === 'CANVAS_RESIZE') {
        // Gestion du redimensionnement du canvas (offscreen)
        console.log("Resizing canvas to " + message.data.width + "x" + message.data.height);
        
        // Accéder au canvas et le redimensionner
        const canvas = gl.canvas;
        canvas.width = message.data.width;
        canvas.height = message.data.height;
        
        // Ajuster le viewport WebGL pour correspondre aux nouvelles dimensions
        gl.viewport(0, 0, message.data.width, message.data.height);
        
        // Mettre à jour les variables globales
        width = message.data.width;
        height = message.data.height;
        
        self.postMessage({info: "Canvas resized to " + width + "x" + height});
    } else if (message.data.action === 'CLEAR_BUFFERS') {
        // Vider les tampons de frames en attente
        console.log("Clearing pending frames buffer, had " + pendingFrames.length + " frames");
        
        // Nettoyer en conservant éventuellement la dernière frame pour éviter l'écran noir
        if (pendingFrames.length > 0) {
            const lastFrame = pendingFrames[pendingFrames.length - 1];
            pendingFrames = [];
            if (lastFrame) {
                pendingFrames.push(lastFrame);
            }
        } else {
            pendingFrames = [];
        }
        
        // Réinitialiser l'état du décodeur si nécessaire
        underflow = pendingFrames.length === 0;
        
        // Demander une nouvelle frame-clé
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.sendObject({action: "REQUEST_KEYFRAME"});
        }
    } else if(!initted) {
        postInitJobs.push(message);
    } else {
        messageHandler(message)
    }
});