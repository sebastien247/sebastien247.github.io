(function (global) {
  'use strict';

  // CSS-background JPEG renderer for MCU1 / WebKit 601 (QtCarBrowser) — with a decode
  // PRELOAD to kill the inter-frame black flash, while KEEPING the css background-image
  // display path (the measured-fast path on QtCarBrowser: ~24 fps at 480×270 vs ~6 canvas).
  //
  // The flash: the old css-direct path set #videobg.style.backgroundImage = url(data:…)
  // once per rAF. On WebKit 601, reassigning a background-image to a NOT-yet-decoded
  // data URI makes the element composite its own background-color (#000) until the
  // async decode finishes. While the map changes (driving) that #000 shows between
  // frames = the flicker.
  //
  // Fix WITHOUT leaving css-bg: decode each frame off-DOM via new Image() FIRST, and
  // set the div's background-image ONLY in that Image's onload. The data URI is then
  // already in WebKit's image cache, so assigning it as the background is a cache hit
  // that paints immediately — and the previous frame stays on screen until the new one
  // is ready, so #000 is never composited between frames. This is the bench's
  // "css-preload" variant (~22 fps, vs css-direct ~24 — same family, flash-free).
  //
  // Real-time: only the NEWEST frame is ever preloaded (a busy flag drops intermediates
  // under load, so we never lag behind). A load watchdog recovers a wedged decode as a
  // freeze (the last frame holds), never a black. ES5 only.
  //
  // Public API: new JpegRenderer(element, onPaint?); .paint(dataUri).
  //   onPaint(naturalWidth, naturalHeight, loadMs) fires once per frame ACTUALLY shown
  //   (post-decode), so a paint count ~= visible fps and loadMs = real decode latency.

  var raf = global.requestAnimationFrame || global.webkitRequestAnimationFrame ||
            function (cb) { return setTimeout(cb, 16); };

  // If a preload neither completes nor errors within this long, abandon it so the loop
  // can try a newer frame instead of wedging on a stuck decode.
  var LOAD_WATCHDOG_MS = 1000;

  function JpegRenderer(el, onPaint) {
    this.el = el;
    this.onPaint = onPaint || null;
    this.latest = null;     // newest data URI handed in
    this.drawn = null;      // data URI currently applied to the background
    this.busy = false;      // a preload is in flight
    this.loadStartedAt = 0;
    this._startLoop();
  }

  // bytes-or-dataURI in; this renderer expects a complete JPEG data URI string
  // ("data:image/jpeg;base64,...") produced by the worker.
  JpegRenderer.prototype.paint = function (dataUri) {
    if (dataUri) this.latest = dataUri;
  };

  JpegRenderer.prototype._startLoop = function () {
    var self = this;
    (function loop() {
      // Recover from a wedged preload so a newer frame can be tried.
      if (self.busy && self.loadStartedAt &&
          (Date.now() - self.loadStartedAt) > LOAD_WATCHDOG_MS) {
        self.busy = false;
      }
      if (self.latest && self.latest !== self.drawn && !self.busy) {
        self.busy = true;
        self.loadStartedAt = Date.now();
        var uri = self.latest;
        // Apply the (now-decoded) frame as the css background and report it.
        var apply = function (nw, nh) {
          var loadMs = Date.now() - self.loadStartedAt;
          try {
            // No quotes needed: base64 data URIs contain no spaces or parens.
            self.el.style.backgroundImage = 'url(' + uri + ')';
          } catch (e) {}
          self.drawn = uri;
          self.busy = false;
          if (self.onPaint) {
            try { self.onPaint(nw || 0, nh || 0, loadMs); } catch (e2) {}
          }
        };
        if (typeof Image !== 'undefined') {
          // Preload off-DOM: decode happens here; the background-image set in onload
          // is a cache hit, so #videobg never shows #000 mid-decode. The previous
          // frame stays visible until this resolves.
          var im = new Image();
          im.onload = function () { apply(im.naturalWidth, im.naturalHeight); };
          im.onerror = function () { self.busy = false; };
          im.src = uri;
        } else {
          // No Image constructor (not a browser) — fall back to a direct set.
          apply(0, 0);
        }
      }
      raf(loop);
    })();
  };

  global.JpegRenderer = JpegRenderer;
})(typeof self !== 'undefined' ? self : this);
