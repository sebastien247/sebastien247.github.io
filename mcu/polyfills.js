/**
 * polyfills.js — MCU1 / QtCarBrowser (Tesla MCU1) compatibility shim.
 *
 * Tesla MCU1 ships QtCarBrowser, a ~2015 WebKit (AppleWebKit/601 or /534) that
 * lacks fetch / AbortController and, on the oldest units, Promise / Map /
 * Symbol. This file feature-detects each API and provides a minimal, pure-ES5
 * implementation only when the native one is missing.
 *
 * It MUST load first — before main.js on the page, and as the first
 * importScripts() in the worker — so the rest of the (Babel-transpiled) code
 * finds the globals it expects. It is served only on the MCU1 (legacy) path;
 * modern Teslas never load it.
 *
 * Works in both window and Worker scope (keyed off `self`).
 */
(function (global) {

    // ---- performance.now -------------------------------------------------
    try {
        if (!global.performance) {
            global.performance = {};
        }
        if (typeof global.performance.now !== 'function') {
            var perfStart = Date.now();
            global.performance.now = function now() {
                return Date.now() - perfStart;
            };
        }
    } catch (e) { /* performance exists and is usable — ignore */ }

    // ---- requestAnimationFrame / cancelAnimationFrame --------------------
    if (typeof global.requestAnimationFrame !== 'function') {
        global.requestAnimationFrame = global.webkitRequestAnimationFrame || function (callback) {
            return global.setTimeout(function () {
                callback(global.performance.now());
            }, 16);
        };
    }
    if (typeof global.cancelAnimationFrame !== 'function') {
        global.cancelAnimationFrame = global.webkitCancelAnimationFrame || function (id) {
            global.clearTimeout(id);
        };
    }

    // ---- Symbol (minimal) ------------------------------------------------
    // Babel helpers and regenerator-runtime guard their Symbol use, but a
    // minimal stand-in removes any chance of a bare reference throwing.
    if (typeof global.Symbol === 'undefined') {
        var symbolCount = 0;
        var SymbolShim = function Symbol(description) {
            return '@@Symbol:' + (description === undefined ? '' : description) +
                ':' + (++symbolCount);
        };
        SymbolShim.iterator = '@@iterator';
        SymbolShim.asyncIterator = '@@asyncIterator';
        SymbolShim['for'] = function (key) { return '@@for:' + key; };
        global.Symbol = SymbolShim;
    }

    // ---- Uint8Array.from -------------------------------------------------
    if (typeof global.Uint8Array === 'function' &&
        typeof global.Uint8Array.from !== 'function') {
        global.Uint8Array.from = function from(source) {
            var length = source.length >>> 0;
            var result = new global.Uint8Array(length);
            for (var i = 0; i < length; i++) {
                result[i] = source[i];
            }
            return result;
        };
    }

    // ---- Map (minimal) ---------------------------------------------------
    if (typeof global.Map !== 'function') {
        var MapShim = function Map(entries) {
            this._keys = [];
            this._values = [];
            if (entries) {
                for (var i = 0; i < entries.length; i++) {
                    this.set(entries[i][0], entries[i][1]);
                }
            }
        };
        MapShim.prototype._indexOf = function (key) {
            return this._keys.indexOf(key);
        };
        MapShim.prototype.set = function (key, value) {
            var index = this._indexOf(key);
            if (index === -1) {
                this._keys.push(key);
                this._values.push(value);
            } else {
                this._values[index] = value;
            }
            return this;
        };
        MapShim.prototype.get = function (key) {
            var index = this._indexOf(key);
            return index === -1 ? undefined : this._values[index];
        };
        MapShim.prototype.has = function (key) {
            return this._indexOf(key) !== -1;
        };
        MapShim.prototype['delete'] = function (key) {
            var index = this._indexOf(key);
            if (index === -1) {
                return false;
            }
            this._keys.splice(index, 1);
            this._values.splice(index, 1);
            return true;
        };
        MapShim.prototype.clear = function () {
            this._keys = [];
            this._values = [];
        };
        MapShim.prototype.forEach = function (callback, thisArg) {
            for (var i = 0; i < this._keys.length; i++) {
                callback.call(thisArg, this._values[i], this._keys[i], this);
            }
        };
        try {
            Object.defineProperty(MapShim.prototype, 'size', {
                get: function () { return this._keys.length; }
            });
        } catch (e) { /* accessor properties unsupported — size getter skipped */ }
        global.Map = MapShim;
    }

    // ---- Promise (Promises/A+, minimal) ----------------------------------
    if (typeof global.Promise !== 'function') {
        var schedule = function (fn) { global.setTimeout(fn, 0); };

        var PromiseShim = function Promise(executor) {
            if (!(this instanceof PromiseShim)) {
                throw new TypeError("Promise constructor requires 'new'");
            }
            this._state = 0;        // 0 pending, 1 fulfilled, 2 rejected
            this._value = undefined;
            this._queue = [];
            var promise = this;
            if (typeof executor === 'function') {
                try {
                    executor(
                        function (value) { resolvePromise(promise, value); },
                        function (reason) { rejectPromise(promise, reason); }
                    );
                } catch (e) {
                    rejectPromise(promise, e);
                }
            }
        };

        function resolvePromise(promise, value) {
            if (promise._state !== 0) { return; }
            if (value === promise) {
                rejectPromise(promise, new TypeError('Promise resolved with itself'));
                return;
            }
            if (value && (typeof value === 'object' || typeof value === 'function')) {
                var then;
                try {
                    then = value.then;
                } catch (e) {
                    rejectPromise(promise, e);
                    return;
                }
                if (typeof then === 'function') {
                    var handled = false;
                    try {
                        then.call(value,
                            function (v) {
                                if (!handled) { handled = true; resolvePromise(promise, v); }
                            },
                            function (r) {
                                if (!handled) { handled = true; rejectPromise(promise, r); }
                            });
                    } catch (e) {
                        if (!handled) { handled = true; rejectPromise(promise, e); }
                    }
                    return;
                }
            }
            promise._state = 1;
            promise._value = value;
            drainPromise(promise);
        }

        function rejectPromise(promise, reason) {
            if (promise._state !== 0) { return; }
            promise._state = 2;
            promise._value = reason;
            drainPromise(promise);
        }

        function drainPromise(promise) {
            var queue = promise._queue;
            promise._queue = [];
            for (var i = 0; i < queue.length; i++) {
                runTask(promise, queue[i]);
            }
        }

        function runTask(promise, task) {
            schedule(function () {
                var callback = promise._state === 1 ? task.onFulfilled : task.onRejected;
                if (typeof callback !== 'function') {
                    if (promise._state === 1) {
                        resolvePromise(task.child, promise._value);
                    } else {
                        rejectPromise(task.child, promise._value);
                    }
                    return;
                }
                var result;
                try {
                    result = callback(promise._value);
                } catch (e) {
                    rejectPromise(task.child, e);
                    return;
                }
                resolvePromise(task.child, result);
            });
        }

        PromiseShim.prototype.then = function (onFulfilled, onRejected) {
            var child = new PromiseShim(function () {});
            var task = {
                onFulfilled: onFulfilled,
                onRejected: onRejected,
                child: child
            };
            if (this._state === 0) {
                this._queue.push(task);
            } else {
                runTask(this, task);
            }
            return child;
        };

        PromiseShim.prototype['catch'] = function (onRejected) {
            return this.then(undefined, onRejected);
        };

        PromiseShim.prototype['finally'] = function (onFinally) {
            return this.then(
                function (value) {
                    if (typeof onFinally === 'function') { onFinally(); }
                    return value;
                },
                function (reason) {
                    if (typeof onFinally === 'function') { onFinally(); }
                    throw reason;
                }
            );
        };

        PromiseShim.resolve = function (value) {
            if (value instanceof PromiseShim) { return value; }
            return new PromiseShim(function (resolve) { resolve(value); });
        };

        PromiseShim.reject = function (reason) {
            return new PromiseShim(function (_, reject) { reject(reason); });
        };

        PromiseShim.all = function (items) {
            return new PromiseShim(function (resolve, reject) {
                var results = [];
                var remaining = 0;
                var started = false;
                function settleOne(i, value) {
                    results[i] = value;
                    remaining--;
                    if (remaining === 0 && started) { resolve(results); }
                }
                for (var index = 0; index < items.length; index++) {
                    remaining++;
                    (function (i) {
                        PromiseShim.resolve(items[i]).then(function (value) {
                            settleOne(i, value);
                        }, reject);
                    })(index);
                }
                started = true;
                if (remaining === 0) { resolve(results); }
            });
        };

        PromiseShim.race = function (items) {
            return new PromiseShim(function (resolve, reject) {
                for (var i = 0; i < items.length; i++) {
                    PromiseShim.resolve(items[i]).then(resolve, reject);
                }
            });
        };

        global.Promise = PromiseShim;
    }

    // ---- AbortController / AbortSignal -----------------------------------
    if (typeof global.AbortController !== 'function') {
        var AbortSignalShim = function AbortSignal() {
            this.aborted = false;
            this.reason = undefined;
            this.onabort = null;
            this._listeners = [];
        };
        AbortSignalShim.prototype.addEventListener = function (type, listener) {
            if (type === 'abort' && typeof listener === 'function') {
                this._listeners.push(listener);
            }
        };
        AbortSignalShim.prototype.removeEventListener = function (type, listener) {
            if (type !== 'abort') { return; }
            var index = this._listeners.indexOf(listener);
            if (index !== -1) { this._listeners.splice(index, 1); }
        };
        AbortSignalShim.prototype._dispatch = function () {
            if (this.aborted) { return; }
            this.aborted = true;
            var event = { type: 'abort', target: this };
            if (typeof this.onabort === 'function') {
                try { this.onabort(event); } catch (e) { /* ignore */ }
            }
            var listeners = this._listeners.slice();
            for (var i = 0; i < listeners.length; i++) {
                try { listeners[i](event); } catch (e) { /* ignore */ }
            }
        };

        var AbortControllerShim = function AbortController() {
            this.signal = new AbortSignalShim();
        };
        AbortControllerShim.prototype.abort = function (reason) {
            this.signal.reason = reason;
            this.signal._dispatch();
        };

        global.AbortController = AbortControllerShim;
        global.AbortSignal = AbortSignalShim;
    }

    // ---- fetch (XHR-based: GET/HEAD, honours an AbortSignal) -------------
    function makeAbortError() {
        var error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return error;
    }

    if (typeof global.fetch !== 'function') {
        global.fetch = function fetch(resource, options) {
            options = options || {};
            var method = (options.method || 'GET').toUpperCase();
            var signal = options.signal;
            var url = String(resource);

            return new global.Promise(function (resolve, reject) {
                if (signal && signal.aborted) {
                    reject(makeAbortError());
                    return;
                }

                var xhr = new global.XMLHttpRequest();
                xhr.open(method, url, true);

                function cleanup() {
                    if (signal) { signal.removeEventListener('abort', onAbort); }
                }
                function onAbort() {
                    cleanup();
                    reject(makeAbortError());
                    try { xhr.abort(); } catch (e) { /* ignore */ }
                }

                xhr.onreadystatechange = function () {
                    if (xhr.readyState !== 4) { return; }
                    cleanup();
                    if (xhr.status === 0) {
                        // Aborted, or a network-level failure.
                        reject(new Error('Network request failed: ' + url));
                        return;
                    }
                    var bodyText = '' + (xhr.responseText || '');
                    var status = xhr.status;
                    resolve({
                        ok: status >= 200 && status < 300,
                        status: status,
                        statusText: xhr.statusText || '',
                        url: url,
                        text: function () { return global.Promise.resolve(bodyText); },
                        json: function () {
                            return new global.Promise(function (res, rej) {
                                try { res(JSON.parse(bodyText)); }
                                catch (e) { rej(e); }
                            });
                        }
                    });
                };
                xhr.onerror = function () {
                    cleanup();
                    reject(new Error('Network request failed: ' + url));
                };

                if (signal) { signal.addEventListener('abort', onAbort); }

                try {
                    xhr.send(options.body != null ? options.body : null);
                } catch (e) {
                    cleanup();
                    reject(e);
                }
            });
        };
    }

})(typeof self !== 'undefined' ? self : this);
