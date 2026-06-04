(function (global) {
  'use strict';

  // Renders JPEG frames to a 2D canvas with frame coalescing: while one frame
  // is decoding (Image.onload is async), only the most recent incoming frame is
  // kept as pending, so the picture never accumulates lag behind real time.
  // ES5 only — runs on WebKit 601 (MCU1 / QtCarBrowser). onPaint(w, h) is called
  // after each successful drawImage.
  function JpegRenderer(canvas, onPaint) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onPaint = onPaint || null;
    this.decoding = false;
    this.pending = null;
  }

  JpegRenderer.prototype.paint = function (bytes) {
    if (this.decoding) {
      this.pending = bytes; // coalesce — drop the previous pending frame
      return;
    }
    this._decode(bytes);
  };

  JpegRenderer.prototype._decode = function (bytes) {
    var self = this;
    var url;
    try {
      url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
    } catch (e) {
      return; // cannot build a URL — drop this frame, stay ready
    }
    this.decoding = true;
    var img = new Image();
    img.onload = function () {
      try {
        self.ctx.drawImage(img, 0, 0, self.canvas.width, self.canvas.height);
        if (self.onPaint) self.onPaint(img.width, img.height);
      } catch (e) {}
      self._done(url);
    };
    img.onerror = function () {
      self._done(url); // skip this frame; the next paint() recovers
    };
    img.src = url;
  };

  JpegRenderer.prototype._done = function (url) {
    try { URL.revokeObjectURL(url); } catch (e) {}
    this.decoding = false;
    if (this.pending) {
      var next = this.pending;
      this.pending = null;
      this._decode(next);
    }
  };

  global.JpegRenderer = JpegRenderer;
})(typeof self !== 'undefined' ? self : this);
