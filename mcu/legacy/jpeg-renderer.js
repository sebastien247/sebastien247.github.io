(function (global) {
  'use strict';

  // CSS-background JPEG renderer for MCU1 / WebKit 601 (QtCarBrowser).
  //
  // QtCarBrowser composites a CSS background-image far more cheaply than it
  // blits a canvas with drawImage — measured on a real MCU1 at ~24 fps vs ~6
  // for the identical JPEG stream. So instead of decoding into a 2D canvas we
  // hand each JPEG to the browser as a data URI and let it paint it as an
  // element's background. The decoder is the same; the display path is ~4x
  // lighter.
  //
  // The worker delivers ready-to-use data URIs (base64 done off the main
  // thread). We swap the background at most ONCE PER ANIMATION FRAME, newest
  // frame only — never oversaturating the compositor, never lagging behind
  // real time. ES5 only.
  //
  // Public API: new JpegRenderer(element, onPaint?); .paint(dataUri).

  var raf = global.requestAnimationFrame || global.webkitRequestAnimationFrame ||
            function (cb) { return setTimeout(cb, 16); };

  function JpegRenderer(el, onPaint) {
    this.el = el;
    this.onPaint = onPaint || null;
    this.latest = null; // most recent data URI handed in
    this.drawn = null;  // last data URI actually applied to the background
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
      if (self.latest && self.latest !== self.drawn) {
        self.drawn = self.latest;
        try {
          // No quotes needed: base64 data URIs contain no spaces or parens.
          self.el.style.backgroundImage = 'url(' + self.drawn + ')';
          if (self.onPaint) self.onPaint();
        } catch (e) {}
      }
      raf(loop);
    })();
  };

  global.JpegRenderer = JpegRenderer;
})(typeof self !== 'undefined' ? self : this);
