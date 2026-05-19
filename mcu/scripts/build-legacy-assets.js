/**
 * build-legacy-assets.js
 *
 * Second half of `npm run build:legacy` (after Babel transpiles main.js,
 * async_decoder.js and binary_touch_protocol.js into legacy/). It assembles a
 * fully self-contained legacy/ bundle for MCU1 / QtCarBrowser:
 *
 *   - copies the non-transpiled assets: Decoder.js (already ES5 asm.js),
 *     polyfills.js (hand-written ES5), styles.css, favicon.ico, mute.svg
 *   - prepends importScripts("polyfills.js") to the transpiled worker
 *   - generates legacy/index.html from index.html, stripping the Firebase /
 *     feedback integration (its modern SDK cannot run on MCU1) and injecting
 *     polyfills.js as the first script
 *
 * Pure CommonJS / ES5 so it runs on any Node.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var SRC_DIR = path.join(__dirname, '..');
var LEGACY_DIR = path.join(SRC_DIR, 'legacy');

function log(message) {
    console.log('[build-legacy] ' + message);
}

function fail(message) {
    console.error('[build-legacy] ERROR: ' + message);
    process.exit(1);
}

// --- 1. legacy/ must exist (Babel creates it, but be defensive) ----------
if (!fs.existsSync(LEGACY_DIR)) {
    fs.mkdirSync(LEGACY_DIR);
}

// --- 2. Copy the assets that are not transpiled --------------------------
var ASSETS = ['Decoder.js', 'polyfills.js', 'styles.css', 'favicon.ico', 'mute.svg'];
ASSETS.forEach(function (name) {
    var from = path.join(SRC_DIR, name);
    if (!fs.existsSync(from)) {
        log('WARNING: source asset missing, skipped: ' + name);
        return;
    }
    fs.copyFileSync(from, path.join(LEGACY_DIR, name));
    log('copied ' + name);
});

// --- 3. Prepend importScripts("polyfills.js") to the worker --------------
// The worker must load the polyfills before its own (transpiled) body and
// before Decoder.js / binary_touch_protocol.js, which it importScripts() next.
var workerPath = path.join(LEGACY_DIR, 'async_decoder.js');
if (!fs.existsSync(workerPath)) {
    fail('legacy/async_decoder.js not found — did Babel run?');
}
var workerCode = fs.readFileSync(workerPath, 'utf8');
var importLine = 'importScripts("polyfills.js");\n';
if (workerCode.lastIndexOf(importLine, 0) !== 0) {
    fs.writeFileSync(workerPath, importLine + workerCode);
    log('prepended importScripts("polyfills.js") to async_decoder.js');
} else {
    log('async_decoder.js already imports polyfills.js — left as-is');
}

// --- 4. Generate legacy/index.html ---------------------------------------
var htmlPath = path.join(SRC_DIR, 'index.html');
if (!fs.existsSync(htmlPath)) {
    fail('index.html not found.');
}
var html = fs.readFileSync(htmlPath, 'utf8');

// Strip the MCU1 client-side redirect <script> first — before the other
// <script> strips below. The legacy page IS the redirect target, and removing
// it first keeps the inline-Firebase regex anchored to the right <script> tag.
html = html.replace(/[ \t]*<script>[\s\S]*?mcu1-legacy-redirect[\s\S]*?<\/script>\r?\n?/i, '');

// Strip the feedback stylesheet link.
html = html.replace(/[ \t]*<link[^>]*feedback\.css[^>]*>\r?\n?/i, '');

// Strip the Firebase SDK <script> tags (loaded from gstatic.com) + comment.
html = html.replace(/[ \t]*<!--\s*Firebase SDK[^>]*-->\r?\n?/i, '');
html = html.replace(/[ \t]*<script[^>]*firebasejs[^>]*><\/script>\r?\n?/gi, '');

// Strip the feedback-system module <script> tags and their comment.
html = html.replace(/[ \t]*<!--\s*Feedback System Modules\s*-->\r?\n?/i, '');
['firebase-config.js', 'feedback-service.js', 'feedback-dialog.js', 'feedback-snackbar.js']
    .forEach(function (file) {
        var escaped = file.replace(/[.]/g, '\\.');
        var re = new RegExp('[ \\t]*<script[^>]*src=["\']' + escaped + '["\'][^>]*><\\/script>\\r?\\n?', 'i');
        html = html.replace(re, '');
    });

// Strip the inline Firebase init <script> block.
html = html.replace(/[ \t]*<script>[\s\S]*?FirebaseConfig[\s\S]*?<\/script>\r?\n?/i, '');

// Inject polyfills.js as the first script — immediately before main.js.
html = html.replace(/(<script[^>]*src=["']main\.js["'][^>]*><\/script>)/i,
    '<script src="polyfills.js"></script>\n$1');

if (html.indexOf('polyfills.js') === -1) {
    fail('could not inject polyfills.js into index.html (no main.js <script> found).');
}
if (/firebasejs|FirebaseConfig/.test(html)) {
    log('WARNING: index.html still references Firebase after stripping — check the markup.');
}

fs.writeFileSync(path.join(LEGACY_DIR, 'index.html'), html);
log('generated index.html');

// --- 5. Sanity check: warn if a bare regeneratorRuntime global survived --
// Babel 7.18+ inlines the regenerator runtime as a self-contained helper
// (_regeneratorRuntime), so no external runtime is normally needed. If a bare
// `regeneratorRuntime` global reference shows up, polyfills.js must provide it.
['main.js', 'async_decoder.js', 'binary_touch_protocol.js'].forEach(function (name) {
    var file = path.join(LEGACY_DIR, name);
    if (!fs.existsSync(file)) {
        return;
    }
    var code = fs.readFileSync(file, 'utf8');
    if (/[^._$a-zA-Z0-9]regeneratorRuntime\b/.test(' ' + code)) {
        log('WARNING: ' + name + ' references a bare `regeneratorRuntime` global — ' +
            'regenerator-runtime must be bundled into polyfills.js.');
    }
});

log('done — legacy/ bundle assembled.');
