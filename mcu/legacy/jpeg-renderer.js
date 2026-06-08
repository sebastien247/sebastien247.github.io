(function (global) {
  'use strict';

  // CSS-background JPEG renderer for MCU1 / WebKit 601 — Blob-URL transport, NO base64,
  // NO requestAnimationFrame, bounded memory. (v7)
  //
  // The page hands us a blob: URL per frame (URL.createObjectURL over the raw JPEG bytes
  // the worker TRANSFERS — no base64). Three things this buys us, each a measured problem
  // the render-bench never had:
  //   1. No base64: the worker base64-encoded every frame (~half a core at 18 fps, b64Max
  //      ~100 ms) which starved the whole pipeline. Gone — the worker just transfers bytes.
  //   2. Bounded memory: data: URIs piled up in WebKit's decoded-image cache (unbounded,
  //      since every live frame is unique) → the ~3 min "preserve resources" freeze. We hold
  //      a blob: URL we can REVOKE, and we revoke every URL the instant it is superseded or
  //      replaced, so memory stays flat.
  //   3. No rAF: the bench's css-preload chained the next decode straight from onload; the
  //      shipped renderer waited for a requestAnimationFrame between decodes, and a loaded
  //      MCU1 tab throttles rAF — pinning paint to ~1 fps while 18 fps arrived. We chain on
  //      onload, so paint rate tracks the decoder, not the throttled rAF.
  //
  // Flicker-safety is preserved: we decode each frame off-DOM via new Image() and set the
  // single #videobg's background-image only in onload — the previous frame holds until the
  // new one is decoded, so #000 is never composited between frames.
  //
  // Real-time: only the NEWEST frame is ever decoded; intermediates are dropped (and their
  // blob URLs revoked) under load. ES5 only.
  //
  // Public API: new JpegRenderer(element, onPaint?); .paint(blobUrl).
  //   onPaint(naturalWidth, naturalHeight, loadMs) fires once per frame actually shown.

  // A decode stuck longer than this is abandoned so a newer frame can be tried. Checked on
  // the next incoming frame (paint), which IS the clock — no timer needed.
  var LOAD_WATCHDOG_MS = 1500;

  function _revoke(u) {
    if (!u) return;
    try { if (global.URL && global.URL.revokeObjectURL) global.URL.revokeObjectURL(u); } catch (e) {}
  }

  function JpegRenderer(el, onPaint) {
    this.el = el;
    this.onPaint = onPaint || null;
    this.latest = null;      // newest blob URL handed in, not yet shown
    this.drawn = null;       // blob URL currently set as the background
    this.loadingUri = null;  // blob URL currently being decoded
    this.busy = false;
    this.loadStartedAt = 0;
  }

  // url = a blob: URL (URL.createObjectURL of the raw JPEG bytes). The renderer OWNS the
  // URL's lifetime from here: it will revoke it once it is superseded, replaced, or fails.
  JpegRenderer.prototype.paint = function (url) {
    if (!url) return;
    // Recover a wedged decode (its onload never fired) using the frame stream as the clock.
    if (this.busy && this.loadStartedAt && (Date.now() - this.loadStartedAt) > LOAD_WATCHDOG_MS) {
      _revoke(this.loadingUri);
      this.loadingUri = null;
      this.busy = false;
    }
    // The previous 'latest' was superseded before it could be shown — revoke it, unless it
    // is the frame currently decoding or the one on screen.
    if (this.latest && this.latest !== this.drawn && this.latest !== this.loadingUri) {
      _revoke(this.latest);
    }
    this.latest = url;
    if (!this.busy) this._kick();
  };

  JpegRenderer.prototype._kick = function () {
    var self = this;
    if (!self.latest || self.latest === self.drawn) { self.busy = false; return; }
    self.busy = true;
    self.loadingUri = self.latest;
    self.loadStartedAt = Date.now();
    var uri = self.latest;
    var im = new Image();
    im.onload = function () {
      var loadMs = Date.now() - self.loadStartedAt;
      var prev = self.drawn;
      try { self.el.style.backgroundImage = 'url(' + uri + ')'; } catch (e) {}
      self.drawn = uri;
      self.loadingUri = null;
      self.busy = false;
      if (prev && prev !== uri) _revoke(prev); // the frame we just replaced is no longer needed
      if (self.onPaint) {
        try { self.onPaint(im.naturalWidth || 0, im.naturalHeight || 0, loadMs); } catch (e2) {}
      }
      self._kick(); // chain straight to the newest frame — no rAF
    };
    im.onerror = function () {
      _revoke(uri);
      if (self.loadingUri === uri) self.loadingUri = null;
      self.busy = false;
      self._kick();
    };
    im.src = uri;
  };

  global.JpegRenderer = JpegRenderer;
})(typeof self !== 'undefined' ? self : this);
