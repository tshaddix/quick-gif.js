(function webpackUniversalModuleDefinition(root, factory) {
  if (typeof exports === "object" && typeof module === "object")
    module.exports = factory();
  else if (typeof define === "function" && define.amd) define([], factory);
  else if (typeof exports === "object") exports["Quick-Gif.js"] = factory();
  else root["Quick-Gif.js"] = factory();
})(typeof self !== "undefined" ? self : this, function() {
  return /******/ (function(modules) {
    // webpackBootstrap
    /******/ // The module cache
    /******/ var installedModules = {}; // The require function
    /******/
    /******/ /******/ function __webpack_require__(moduleId) {
      /******/
      /******/ // Check if module is in cache
      /******/ if (installedModules[moduleId]) {
        /******/ return installedModules[moduleId].exports;
        /******/
      } // Create a new module (and put it into the cache)
      /******/ /******/ var module = (installedModules[moduleId] = {
        /******/ i: moduleId,
        /******/ l: false,
        /******/ exports: {}
        /******/
      }); // Execute the module function
      /******/
      /******/ /******/ modules[moduleId].call(
        module.exports,
        module,
        module.exports,
        __webpack_require__
      ); // Flag the module as loaded
      /******/
      /******/ /******/ module.l = true; // Return the exports of the module
      /******/
      /******/ /******/ return module.exports;
      /******/
    } // expose the modules object (__webpack_modules__)
    /******/
    /******/
    /******/ /******/ __webpack_require__.m = modules; // expose the module cache
    /******/
    /******/ /******/ __webpack_require__.c = installedModules; // define getter function for harmony exports
    /******/
    /******/ /******/ __webpack_require__.d = function(exports, name, getter) {
      /******/ if (!__webpack_require__.o(exports, name)) {
        /******/ Object.defineProperty(exports, name, {
          /******/ configurable: false,
          /******/ enumerable: true,
          /******/ get: getter
          /******/
        });
        /******/
      }
      /******/
    }; // getDefaultExport function for compatibility with non-harmony modules
    /******/
    /******/ /******/ __webpack_require__.n = function(module) {
      /******/ var getter =
        module && module.__esModule
          ? /******/ function getDefault() {
              return module["default"];
            }
          : /******/ function getModuleExports() {
              return module;
            };
      /******/ __webpack_require__.d(getter, "a", getter);
      /******/ return getter;
      /******/
    }; // Object.prototype.hasOwnProperty.call
    /******/
    /******/ /******/ __webpack_require__.o = function(object, property) {
      return Object.prototype.hasOwnProperty.call(object, property);
    }; // __webpack_public_path__
    /******/
    /******/ /******/ __webpack_require__.p = ""; // Load entry module and return exports
    /******/
    /******/ /******/ return __webpack_require__((__webpack_require__.s = 0));
    /******/
  })(
    /************************************************************************/
    /******/ [
      /* 0 */
      /***/ function(module, exports, __webpack_require__) {
        "use strict";

        Object.defineProperty(exports, "__esModule", { value: true });
        var gif_1 = __webpack_require__(1);
        exports.GIF = gif_1.GIF;

        /***/
      },
      /* 1 */
      /***/ function(module, exports, __webpack_require__) {
        "use strict";

        Object.defineProperty(exports, "__esModule", { value: true });
        const events_1 = __webpack_require__(2);
        const browser = __webpack_require__(3);
        const workerSrc = __webpack_require__(4);
        // create a worker blob to hold the worker
        // src code
        const workerBlob = new Blob([workerSrc]);
        var RepeatTypes;
        (function(RepeatTypes) {
          RepeatTypes[(RepeatTypes["Forever"] = 0)] = "Forever";
          RepeatTypes[(RepeatTypes["Once"] = -1)] = "Once";
        })((RepeatTypes = exports.RepeatTypes || (exports.RepeatTypes = {})));
        class GIF extends events_1.EventEmitter {
          constructor(width, height, options = {}) {
            super();
            this.options = {
              workers: 2,
              repeat: RepeatTypes.Forever,
              quality: 10,
              background: "#fff",
              transparent: null,
              dither: null,
              frameOptions: {
                delay: 500,
                dispose: -1
              }
            };
            this.isRunning = false;
            this.isOpen = true;
            this.activeWorkers = [];
            this.freeWorkers = [];
            this.frames = [];
            this.nextFrame = 0;
            this.finishedFrames = 0;
            this.imageParts = [];
            this.workerURL = null;
            this.width = width;
            this.height = height;
            Object.keys(options).forEach(key => {
              this.options[key] = options[key];
            });
            // bind handlers / methods
            this.start = this.start.bind(this);
            this.addFrame = this.addFrame.bind(this);
            this.destroy = this.destroy.bind(this);
            this.render = this.render.bind(this);
            this.spawnWorkers = this.spawnWorkers.bind(this);
            this.onFrameFinished = this.onFrameFinished.bind(this);
            this.renderNextFrame = this.renderNextFrame.bind(this);
            this.finishRendering = this.finishRendering.bind(this);
            this.getTask = this.getTask.bind(this);
          }
          start() {
            if (this.isRunning) {
              throw new Error("Already running");
            }
            this.isRunning = true;
            this.isOpen = true;
            this.nextFrame = 0;
            this.finishedFrames = 0;
            this.workerURL = URL.createObjectURL(workerBlob);
            this.spawnWorkers();
          }
          addFrame(imageData, frameOptions) {
            if (!this.isOpen) {
              throw new Error(
                "Can not add frame - the renderer has been closed"
              );
            }
            const frame = Object.assign(
              {},
              this.options.frameOptions,
              frameOptions,
              {
                transparent: this.options.transparent,
                imageData: imageData.data
              }
            );
            this.frames.push(frame);
            this.imageParts.push(null);
            this.render();
          }
          finish() {
            this.isOpen = false;
            this.render();
          }
          /**
           * Destroys all allocated resources
           * including spawned workers
           */
          destroy() {
            this.isRunning = false;
            this.isOpen = true;
            this.nextFrame = 0;
            this.finishedFrames = 0;
            // terminate all the workers
            this.activeWorkers.concat(this.freeWorkers).forEach(worker => {
              worker.terminate();
            });
            this.activeWorkers = [];
            this.freeWorkers = [];
            // revoke worker blob url
            URL.revokeObjectURL(this.workerURL);
            this.workerURL = null;
          }
          render() {
            // no free workers
            if (!this.freeWorkers.length) {
              return;
            }
            // we don't want to process the last frame
            // in the queue if the renderer is still open.
            // This is so we have the opportunity to mark
            // the frame as the last frame for the encoder
            // if we end up closing the renderer later on
            // without adding more frames
            if (this.isOpen && this.nextFrame === this.frames.length - 1) {
              return;
            }
            // todo emit progess events
            // console.log(this.finishedFrames, this.frames.length);
            const allFramesRendered =
              this.finishedFrames === this.frames.length;
            if (!allFramesRendered) {
              this.renderNextFrame();
            } else if (!this.isOpen && this.isRunning) {
              this.finishRendering();
            } else {
              return;
            }
          }
          spawnWorkers() {
            const numWorkers = this.options.workers - this.freeWorkers.length;
            let w = 0;
            while (w < numWorkers) {
              const worker = new Worker(this.workerURL);
              worker.onmessage = event => {
                // remove worker from active workers
                this.activeWorkers.splice(
                  this.activeWorkers.indexOf(worker),
                  1
                );
                this.freeWorkers.push(worker);
                this.onFrameFinished(event.data);
              };
              this.freeWorkers.push(worker);
              w++;
            }
            return numWorkers;
          }
          onFrameFinished(result) {
            this.finishedFrames++;
            this.imageParts[result.index] = result;
            // clear out frame memory
            this.frames[result.index] = null;
            this.render();
          }
          renderNextFrame() {
            // renderNextFrame should not be called if there are no free workers
            if (!this.freeWorkers.length) {
              throw new Error("No free workers to process next frame");
            }
            if (this.nextFrame >= this.frames.length) {
              return;
            }
            const frame = this.frames[this.nextFrame];
            this.nextFrame += 1;
            const worker = this.freeWorkers.shift();
            const task = this.getTask(frame);
            this.activeWorkers.push(worker);
            worker.postMessage(task);
          }
          finishRendering() {
            let len = 0;
            this.imageParts.forEach((result, i) => {
              len +=
                (result.pages.length - 1) * result.pageSize + result.cursor;
              if (i === this.imageParts.length - 1) {
                len += result.pageSize - result.cursor;
              }
            });
            // console.log(`rendering finished - filesize ${Math.round(len / 1000)}kb`);
            const data = new Uint8Array(len);
            let offset = 0;
            this.imageParts.forEach((result, j) => {
              result.pages.forEach((page, i) => {
                data.set(page, offset);
                if (i === result.pages.length - 1) {
                  offset += result.cursor;
                } else {
                  offset += result.pageSize;
                }
              });
            });
            const image = new Blob([data], { type: "image/gif" });
            this.emit("finished", image, data);
            this.isRunning = false;
          }
          getTask(frame) {
            const { options } = this;
            const index = this.frames.indexOf(frame);
            const task = {
              index,
              last: index === this.frames.length - 1 && !this.isOpen,
              delay: frame.delay,
              dispose: frame.dispose,
              transparent: frame.transparent,
              width: this.width,
              height: this.height,
              quality: options.quality,
              dither: options.dither,
              repeat: options.repeat,
              canTransfer: browser.name === "chrome",
              data: frame.imageData
            };
            return task;
          }
        }
        exports.GIF = GIF;

        /***/
      },
      /* 2 */
      /***/ function(module, exports) {
        // Copyright Joyent, Inc. and other Node contributors.
        //
        // Permission is hereby granted, free of charge, to any person obtaining a
        // copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to permit
        // persons to whom the Software is furnished to do so, subject to the
        // following conditions:
        //
        // The above copyright notice and this permission notice shall be included
        // in all copies or substantial portions of the Software.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
        // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
        // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
        // USE OR OTHER DEALINGS IN THE SOFTWARE.

        function EventEmitter() {
          this._events = this._events || {};
          this._maxListeners = this._maxListeners || undefined;
        }
        module.exports = EventEmitter;

        // Backwards-compat with node 0.10.x
        EventEmitter.EventEmitter = EventEmitter;

        EventEmitter.prototype._events = undefined;
        EventEmitter.prototype._maxListeners = undefined;

        // By default EventEmitters will print a warning if more than 10 listeners are
        // added to it. This is a useful default which helps finding memory leaks.
        EventEmitter.defaultMaxListeners = 10;

        // Obviously not all Emitters should be limited to 10. This function allows
        // that to be increased. Set to zero for unlimited.
        EventEmitter.prototype.setMaxListeners = function(n) {
          if (!isNumber(n) || n < 0 || isNaN(n))
            throw TypeError("n must be a positive number");
          this._maxListeners = n;
          return this;
        };

        EventEmitter.prototype.emit = function(type) {
          var er, handler, len, args, i, listeners;

          if (!this._events) this._events = {};

          // If there is no 'error' event listener then throw.
          if (type === "error") {
            if (
              !this._events.error ||
              (isObject(this._events.error) && !this._events.error.length)
            ) {
              er = arguments[1];
              if (er instanceof Error) {
                throw er; // Unhandled 'error' event
              } else {
                // At least give some kind of context to the user
                var err = new Error(
                  'Uncaught, unspecified "error" event. (' + er + ")"
                );
                err.context = er;
                throw err;
              }
            }
          }

          handler = this._events[type];

          if (isUndefined(handler)) return false;

          if (isFunction(handler)) {
            switch (arguments.length) {
              // fast cases
              case 1:
                handler.call(this);
                break;
              case 2:
                handler.call(this, arguments[1]);
                break;
              case 3:
                handler.call(this, arguments[1], arguments[2]);
                break;
              // slower
              default:
                args = Array.prototype.slice.call(arguments, 1);
                handler.apply(this, args);
            }
          } else if (isObject(handler)) {
            args = Array.prototype.slice.call(arguments, 1);
            listeners = handler.slice();
            len = listeners.length;
            for (i = 0; i < len; i++) listeners[i].apply(this, args);
          }

          return true;
        };

        EventEmitter.prototype.addListener = function(type, listener) {
          var m;

          if (!isFunction(listener))
            throw TypeError("listener must be a function");

          if (!this._events) this._events = {};

          // To avoid recursion in the case that type === "newListener"! Before
          // adding it to the listeners, first emit "newListener".
          if (this._events.newListener)
            this.emit(
              "newListener",
              type,
              isFunction(listener.listener) ? listener.listener : listener
            );

          if (!this._events[type])
            // Optimize the case of one listener. Don't need the extra array object.
            this._events[type] = listener;
          else if (isObject(this._events[type]))
            // If we've already got an array, just append.
            this._events[type].push(listener);
          else
            // Adding the second element, need to change to array.
            this._events[type] = [this._events[type], listener];

          // Check for listener leak
          if (isObject(this._events[type]) && !this._events[type].warned) {
            if (!isUndefined(this._maxListeners)) {
              m = this._maxListeners;
            } else {
              m = EventEmitter.defaultMaxListeners;
            }

            if (m && m > 0 && this._events[type].length > m) {
              this._events[type].warned = true;
              console.error(
                "(node) warning: possible EventEmitter memory " +
                  "leak detected. %d listeners added. " +
                  "Use emitter.setMaxListeners() to increase limit.",
                this._events[type].length
              );
              if (typeof console.trace === "function") {
                // not supported in IE 10
                console.trace();
              }
            }
          }

          return this;
        };

        EventEmitter.prototype.on = EventEmitter.prototype.addListener;

        EventEmitter.prototype.once = function(type, listener) {
          if (!isFunction(listener))
            throw TypeError("listener must be a function");

          var fired = false;

          function g() {
            this.removeListener(type, g);

            if (!fired) {
              fired = true;
              listener.apply(this, arguments);
            }
          }

          g.listener = listener;
          this.on(type, g);

          return this;
        };

        // emits a 'removeListener' event iff the listener was removed
        EventEmitter.prototype.removeListener = function(type, listener) {
          var list, position, length, i;

          if (!isFunction(listener))
            throw TypeError("listener must be a function");

          if (!this._events || !this._events[type]) return this;

          list = this._events[type];
          length = list.length;
          position = -1;

          if (
            list === listener ||
            (isFunction(list.listener) && list.listener === listener)
          ) {
            delete this._events[type];
            if (this._events.removeListener)
              this.emit("removeListener", type, listener);
          } else if (isObject(list)) {
            for (i = length; i-- > 0; ) {
              if (
                list[i] === listener ||
                (list[i].listener && list[i].listener === listener)
              ) {
                position = i;
                break;
              }
            }

            if (position < 0) return this;

            if (list.length === 1) {
              list.length = 0;
              delete this._events[type];
            } else {
              list.splice(position, 1);
            }

            if (this._events.removeListener)
              this.emit("removeListener", type, listener);
          }

          return this;
        };

        EventEmitter.prototype.removeAllListeners = function(type) {
          var key, listeners;

          if (!this._events) return this;

          // not listening for removeListener, no need to emit
          if (!this._events.removeListener) {
            if (arguments.length === 0) this._events = {};
            else if (this._events[type]) delete this._events[type];
            return this;
          }

          // emit removeListener for all listeners on all events
          if (arguments.length === 0) {
            for (key in this._events) {
              if (key === "removeListener") continue;
              this.removeAllListeners(key);
            }
            this.removeAllListeners("removeListener");
            this._events = {};
            return this;
          }

          listeners = this._events[type];

          if (isFunction(listeners)) {
            this.removeListener(type, listeners);
          } else if (listeners) {
            // LIFO order
            while (listeners.length)
              this.removeListener(type, listeners[listeners.length - 1]);
          }
          delete this._events[type];

          return this;
        };

        EventEmitter.prototype.listeners = function(type) {
          var ret;
          if (!this._events || !this._events[type]) ret = [];
          else if (isFunction(this._events[type])) ret = [this._events[type]];
          else ret = this._events[type].slice();
          return ret;
        };

        EventEmitter.prototype.listenerCount = function(type) {
          if (this._events) {
            var evlistener = this._events[type];

            if (isFunction(evlistener)) return 1;
            else if (evlistener) return evlistener.length;
          }
          return 0;
        };

        EventEmitter.listenerCount = function(emitter, type) {
          return emitter.listenerCount(type);
        };

        function isFunction(arg) {
          return typeof arg === "function";
        }

        function isNumber(arg) {
          return typeof arg === "number";
        }

        function isObject(arg) {
          return typeof arg === "object" && arg !== null;
        }

        function isUndefined(arg) {
          return arg === void 0;
        }

        /***/
      },
      /* 3 */
      /***/ function(module, exports) {
        const ua = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        const UA = ua.match(
          /(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/
        ) || [null, "unknown", 0];
        const mode = UA[1] === "ie" && document.documentMode;

        const browser = {
          name: UA[1] === "version" ? UA[3] : UA[1],
          version:
            mode || parseFloat(UA[1] === "opera" && UA[4] ? UA[4] : UA[2]),

          platform: {
            name: ua.match(/ip(?:ad|od|hone)/)
              ? "ios"
              : (ua.match(/(?:webos|android)/) ||
                  platform.match(/mac|win|linux/) || ["other"])[0]
          }
        };

        browser[browser.name] = true;
        browser[browser.name + parseInt(browser.version, 10)] = true;
        browser.platform[browser.platform.name] = true;

        module.exports = browser;

        /***/
      },
      /* 4 */
      /***/ function(module, exports) {
        module.exports =
          '/******/ (function(modules) { // webpackBootstrap\n/******/ \t// The module cache\n/******/ \tvar installedModules = {};\n/******/\n/******/ \t// The require function\n/******/ \tfunction __webpack_require__(moduleId) {\n/******/\n/******/ \t\t// Check if module is in cache\n/******/ \t\tif(installedModules[moduleId]) {\n/******/ \t\t\treturn installedModules[moduleId].exports;\n/******/ \t\t}\n/******/ \t\t// Create a new module (and put it into the cache)\n/******/ \t\tvar module = installedModules[moduleId] = {\n/******/ \t\t\ti: moduleId,\n/******/ \t\t\tl: false,\n/******/ \t\t\texports: {}\n/******/ \t\t};\n/******/\n/******/ \t\t// Execute the module function\n/******/ \t\tmodules[moduleId].call(module.exports, module, module.exports, __webpack_require__);\n/******/\n/******/ \t\t// Flag the module as loaded\n/******/ \t\tmodule.l = true;\n/******/\n/******/ \t\t// Return the exports of the module\n/******/ \t\treturn module.exports;\n/******/ \t}\n/******/\n/******/\n/******/ \t// expose the modules object (__webpack_modules__)\n/******/ \t__webpack_require__.m = modules;\n/******/\n/******/ \t// expose the module cache\n/******/ \t__webpack_require__.c = installedModules;\n/******/\n/******/ \t// define getter function for harmony exports\n/******/ \t__webpack_require__.d = function(exports, name, getter) {\n/******/ \t\tif(!__webpack_require__.o(exports, name)) {\n/******/ \t\t\tObject.defineProperty(exports, name, {\n/******/ \t\t\t\tconfigurable: false,\n/******/ \t\t\t\tenumerable: true,\n/******/ \t\t\t\tget: getter\n/******/ \t\t\t});\n/******/ \t\t}\n/******/ \t};\n/******/\n/******/ \t// getDefaultExport function for compatibility with non-harmony modules\n/******/ \t__webpack_require__.n = function(module) {\n/******/ \t\tvar getter = module && module.__esModule ?\n/******/ \t\t\tfunction getDefault() { return module[\'default\']; } :\n/******/ \t\t\tfunction getModuleExports() { return module; };\n/******/ \t\t__webpack_require__.d(getter, \'a\', getter);\n/******/ \t\treturn getter;\n/******/ \t};\n/******/\n/******/ \t// Object.prototype.hasOwnProperty.call\n/******/ \t__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };\n/******/\n/******/ \t// __webpack_public_path__\n/******/ \t__webpack_require__.p = "";\n/******/\n/******/ \t// Load entry module and return exports\n/******/ \treturn __webpack_require__(__webpack_require__.s = 0);\n/******/ })\n/************************************************************************/\n/******/ ([\n/* 0 */\n/***/ (function(module, exports, __webpack_require__) {\n\n"use strict";\n\r\nObject.defineProperty(exports, "__esModule", { value: true });\r\nconst GIFEncoder = __webpack_require__(1);\r\nfunction renderFrame(task) {\r\n    const encoder = new GIFEncoder(task.width, task.height);\r\n    if (task.index === 0) {\r\n        encoder.writeHeader();\r\n    }\r\n    else {\r\n        encoder.firstFrame = false;\r\n    }\r\n    encoder.setTransparent(task.transparent);\r\n    encoder.setDispose(task.dispose);\r\n    encoder.setRepeat(task.repeat);\r\n    encoder.setDelay(task.delay);\r\n    encoder.setQuality(task.quality);\r\n    encoder.setDither(task.dither);\r\n    encoder.addFrame(task.data);\r\n    if (task.last) {\r\n        encoder.finish();\r\n    }\r\n    const stream = encoder.stream();\r\n    const pages = stream.pages;\r\n    const cursor = stream.cursor;\r\n    const pageSize = stream.constructor.pageSize;\r\n    const result = Object.assign({}, task, { pages,\r\n        cursor,\r\n        pageSize });\r\n    if (task.canTransfer) {\r\n        const transfer = Array.from(result.pages).map(page => page.buffer);\r\n        self.postMessage(result, transfer);\r\n    }\r\n    else {\r\n        self.postMessage(result, undefined);\r\n    }\r\n}\r\nself.onmessage = function (event) {\r\n    renderFrame(event.data);\r\n};\r\n\n\n/***/ }),\n/* 1 */\n/***/ (function(module, exports, __webpack_require__) {\n\n/*\n  GIFEncoder.js\n\n  Authors\n  Kevin Weiner (original Java version - kweiner@fmsware.com)\n  Thibault Imbert (AS3 version - bytearray.org)\n  Johan Nordberg (JS version - code@johan-nordberg.com)\n*/\n\nvar NeuQuant = __webpack_require__(2);\nvar LZWEncoder = __webpack_require__(3);\n\nfunction ByteArray() {\n  this.page = -1;\n  this.pages = [];\n  this.newPage();\n}\n\nByteArray.pageSize = 4096;\nByteArray.charMap = {};\n\nfor (var i = 0; i < 256; i++) ByteArray.charMap[i] = String.fromCharCode(i);\n\nByteArray.prototype.newPage = function() {\n  this.pages[++this.page] = new Uint8Array(ByteArray.pageSize);\n  this.cursor = 0;\n};\n\nByteArray.prototype.getData = function() {\n  var rv = "";\n  for (var p = 0; p < this.pages.length; p++) {\n    for (var i = 0; i < ByteArray.pageSize; i++) {\n      rv += ByteArray.charMap[this.pages[p][i]];\n    }\n  }\n  return rv;\n};\n\nByteArray.prototype.writeByte = function(val) {\n  if (this.cursor >= ByteArray.pageSize) this.newPage();\n  this.pages[this.page][this.cursor++] = val;\n};\n\nByteArray.prototype.writeUTFBytes = function(string) {\n  for (var l = string.length, i = 0; i < l; i++)\n    this.writeByte(string.charCodeAt(i));\n};\n\nByteArray.prototype.writeBytes = function(array, offset, length) {\n  for (var l = length || array.length, i = offset || 0; i < l; i++)\n    this.writeByte(array[i]);\n};\n\nfunction GIFEncoder(width, height) {\n  // image size\n  this.width = ~~width;\n  this.height = ~~height;\n\n  // transparent color if given\n  this.transparent = null;\n\n  // transparent index in color table\n  this.transIndex = 0;\n\n  // -1 = no repeat, 0 = forever. anything else is repeat count\n  this.repeat = -1;\n\n  // frame delay (hundredths)\n  this.delay = 0;\n\n  this.image = null; // current frame\n  this.pixels = null; // BGR byte array from frame\n  this.indexedPixels = null; // converted frame indexed to palette\n  this.colorDepth = null; // number of bit planes\n  this.colorTab = null; // RGB palette\n  this.neuQuant = null; // NeuQuant instance that was used to generate this.colorTab.\n  this.usedEntry = new Array(); // active palette entries\n  this.palSize = 7; // color table size (bits-1)\n  this.dispose = -1; // disposal code (-1 = use default)\n  this.firstFrame = true;\n  this.sample = 10; // default sample interval for quantizer\n  this.dither = false; // default dithering\n  this.globalPalette = false;\n\n  this.out = new ByteArray();\n}\n\n/*\n  Sets the delay time between each frame, or changes it for subsequent frames\n  (applies to last frame added)\n*/\nGIFEncoder.prototype.setDelay = function(milliseconds) {\n  this.delay = Math.round(milliseconds / 10);\n};\n\n/*\n  Sets frame rate in frames per second.\n*/\nGIFEncoder.prototype.setFrameRate = function(fps) {\n  this.delay = Math.round(100 / fps);\n};\n\n/*\n  Sets the GIF frame disposal code for the last added frame and any\n  subsequent frames.\n\n  Default is 0 if no transparent color has been set, otherwise 2.\n*/\nGIFEncoder.prototype.setDispose = function(disposalCode) {\n  if (disposalCode >= 0) this.dispose = disposalCode;\n};\n\n/*\n  Sets the number of times the set of GIF frames should be played.\n\n  -1 = play once\n  0 = repeat indefinitely\n\n  Default is -1\n\n  Must be invoked before the first image is added\n*/\n\nGIFEncoder.prototype.setRepeat = function(repeat) {\n  this.repeat = repeat;\n};\n\n/*\n  Sets the transparent color for the last added frame and any subsequent\n  frames. Since all colors are subject to modification in the quantization\n  process, the color in the final palette for each frame closest to the given\n  color becomes the transparent color for that frame. May be set to null to\n  indicate no transparent color.\n*/\nGIFEncoder.prototype.setTransparent = function(color) {\n  this.transparent = color;\n};\n\n/*\n  Adds next GIF frame. The frame is not written immediately, but is\n  actually deferred until the next frame is received so that timing\n  data can be inserted.  Invoking finish() flushes all frames.\n*/\nGIFEncoder.prototype.addFrame = function(imageData) {\n  this.image = imageData;\n\n  this.colorTab =\n    this.globalPalette && this.globalPalette.slice ? this.globalPalette : null;\n\n  this.getImagePixels(); // convert to correct format if necessary\n  this.analyzePixels(); // build color table & map pixels\n\n  if (this.globalPalette === true) this.globalPalette = this.colorTab;\n\n  if (this.firstFrame) {\n    this.writeLSD(); // logical screen descriptior\n    this.writePalette(); // global color table\n    if (this.repeat >= 0) {\n      // use NS app extension to indicate reps\n      this.writeNetscapeExt();\n    }\n  }\n\n  this.writeGraphicCtrlExt(); // write graphic control extension\n  this.writeImageDesc(); // image descriptor\n  if (!this.firstFrame && !this.globalPalette) this.writePalette(); // local color table\n  this.writePixels(); // encode and write pixel data\n\n  this.firstFrame = false;\n};\n\n/*\n  Adds final trailer to the GIF stream, if you don\'t call the finish method\n  the GIF stream will not be valid.\n*/\nGIFEncoder.prototype.finish = function() {\n  this.out.writeByte(0x3b); // gif trailer\n};\n\n/*\n  Sets quality of color quantization (conversion of images to the maximum 256\n  colors allowed by the GIF specification). Lower values (minimum = 1)\n  produce better colors, but slow processing significantly. 10 is the\n  default, and produces good color mapping at reasonable speeds. Values\n  greater than 20 do not yield significant improvements in speed.\n*/\nGIFEncoder.prototype.setQuality = function(quality) {\n  if (quality < 1) quality = 1;\n  this.sample = quality;\n};\n\n/*\n  Sets dithering method. Available are:\n  - FALSE no dithering\n  - TRUE or FloydSteinberg\n  - FalseFloydSteinberg\n  - Stucki\n  - Atkinson\n  You can add \'-serpentine\' to use serpentine scanning\n*/\nGIFEncoder.prototype.setDither = function(dither) {\n  if (dither === true) dither = "FloydSteinberg";\n  this.dither = dither;\n};\n\n/*\n  Sets global palette for all frames.\n  You can provide TRUE to create global palette from first picture.\n  Or an array of r,g,b,r,g,b,...\n*/\nGIFEncoder.prototype.setGlobalPalette = function(palette) {\n  this.globalPalette = palette;\n};\n\n/*\n  Returns global palette used for all frames.\n  If setGlobalPalette(true) was used, then this function will return\n  calculated palette after the first frame is added.\n*/\nGIFEncoder.prototype.getGlobalPalette = function() {\n  return (\n    (this.globalPalette &&\n      this.globalPalette.slice &&\n      this.globalPalette.slice(0)) ||\n    this.globalPalette\n  );\n};\n\n/*\n  Writes GIF file header\n*/\nGIFEncoder.prototype.writeHeader = function() {\n  this.out.writeUTFBytes("GIF89a");\n};\n\n/*\n  Analyzes current frame colors and creates color map.\n*/\nGIFEncoder.prototype.analyzePixels = function() {\n  if (!this.colorTab) {\n    this.neuQuant = new NeuQuant(this.pixels, this.sample);\n    this.neuQuant.buildColormap(); // create reduced palette\n    this.colorTab = this.neuQuant.getColormap();\n  }\n\n  // map image pixels to new palette\n  if (this.dither) {\n    this.ditherPixels(\n      this.dither.replace("-serpentine", ""),\n      this.dither.match(/-serpentine/) !== null\n    );\n  } else {\n    this.indexPixels();\n  }\n\n  this.pixels = null;\n  this.colorDepth = 8;\n  this.palSize = 7;\n\n  // get closest match to transparent color if specified\n  if (this.transparent !== null) {\n    this.transIndex = this.findClosest(this.transparent, true);\n  }\n};\n\n/*\n  Index pixels, without dithering\n*/\nGIFEncoder.prototype.indexPixels = function(imgq) {\n  var nPix = this.pixels.length / 3;\n  this.indexedPixels = new Uint8Array(nPix);\n  var k = 0;\n  for (var j = 0; j < nPix; j++) {\n    var index = this.findClosestRGB(\n      this.pixels[k++] & 0xff,\n      this.pixels[k++] & 0xff,\n      this.pixels[k++] & 0xff\n    );\n    this.usedEntry[index] = true;\n    this.indexedPixels[j] = index;\n  }\n};\n\n/*\n  Taken from http://jsbin.com/iXofIji/2/edit by PAEz\n*/\nGIFEncoder.prototype.ditherPixels = function(kernel, serpentine) {\n  var kernels = {\n    FalseFloydSteinberg: [[3 / 8, 1, 0], [3 / 8, 0, 1], [2 / 8, 1, 1]],\n    FloydSteinberg: [\n      [7 / 16, 1, 0],\n      [3 / 16, -1, 1],\n      [5 / 16, 0, 1],\n      [1 / 16, 1, 1]\n    ],\n    Stucki: [\n      [8 / 42, 1, 0],\n      [4 / 42, 2, 0],\n      [2 / 42, -2, 1],\n      [4 / 42, -1, 1],\n      [8 / 42, 0, 1],\n      [4 / 42, 1, 1],\n      [2 / 42, 2, 1],\n      [1 / 42, -2, 2],\n      [2 / 42, -1, 2],\n      [4 / 42, 0, 2],\n      [2 / 42, 1, 2],\n      [1 / 42, 2, 2]\n    ],\n    Atkinson: [\n      [1 / 8, 1, 0],\n      [1 / 8, 2, 0],\n      [1 / 8, -1, 1],\n      [1 / 8, 0, 1],\n      [1 / 8, 1, 1],\n      [1 / 8, 0, 2]\n    ]\n  };\n\n  if (!kernel || !kernels[kernel]) {\n    throw "Unknown dithering kernel: " + kernel;\n  }\n\n  var ds = kernels[kernel];\n  var index = 0,\n    height = this.height,\n    width = this.width,\n    data = this.pixels;\n  var direction = serpentine ? -1 : 1;\n\n  this.indexedPixels = new Uint8Array(this.pixels.length / 3);\n\n  for (var y = 0; y < height; y++) {\n    if (serpentine) direction = direction * -1;\n\n    for (\n      var x = direction == 1 ? 0 : width - 1, xend = direction == 1 ? width : 0;\n      x !== xend;\n      x += direction\n    ) {\n      index = y * width + x;\n      // Get original colour\n      var idx = index * 3;\n      var r1 = data[idx];\n      var g1 = data[idx + 1];\n      var b1 = data[idx + 2];\n\n      // Get converted colour\n      idx = this.findClosestRGB(r1, g1, b1);\n      this.usedEntry[idx] = true;\n      this.indexedPixels[index] = idx;\n      idx *= 3;\n      var r2 = this.colorTab[idx];\n      var g2 = this.colorTab[idx + 1];\n      var b2 = this.colorTab[idx + 2];\n\n      var er = r1 - r2;\n      var eg = g1 - g2;\n      var eb = b1 - b2;\n\n      for (\n        var i = direction == 1 ? 0 : ds.length - 1,\n          end = direction == 1 ? ds.length : 0;\n        i !== end;\n        i += direction\n      ) {\n        var x1 = ds[i][1]; // *direction;  //  Should this by timesd by direction?..to make the kernel go in the opposite direction....got no idea....\n        var y1 = ds[i][2];\n        if (x1 + x >= 0 && x1 + x < width && y1 + y >= 0 && y1 + y < height) {\n          var d = ds[i][0];\n          idx = index + x1 + y1 * width;\n          idx *= 3;\n\n          data[idx] = Math.max(0, Math.min(255, data[idx] + er * d));\n          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + eg * d));\n          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + eb * d));\n        }\n      }\n    }\n  }\n};\n\n/*\n  Returns index of palette color closest to c\n*/\nGIFEncoder.prototype.findClosest = function(c, used) {\n  return this.findClosestRGB(\n    (c & 0xff0000) >> 16,\n    (c & 0x00ff00) >> 8,\n    c & 0x0000ff,\n    used\n  );\n};\n\nGIFEncoder.prototype.findClosestRGB = function(r, g, b, used) {\n  if (this.colorTab === null) return -1;\n\n  if (this.neuQuant && !used) {\n    return this.neuQuant.lookupRGB(r, g, b);\n  }\n\n  var c = b | (g << 8) | (r << 16);\n\n  var minpos = 0;\n  var dmin = 256 * 256 * 256;\n  var len = this.colorTab.length;\n\n  for (var i = 0, index = 0; i < len; index++) {\n    var dr = r - (this.colorTab[i++] & 0xff);\n    var dg = g - (this.colorTab[i++] & 0xff);\n    var db = b - (this.colorTab[i++] & 0xff);\n    var d = dr * dr + dg * dg + db * db;\n    if ((!used || this.usedEntry[index]) && d < dmin) {\n      dmin = d;\n      minpos = index;\n    }\n  }\n\n  return minpos;\n};\n\n/*\n  Extracts image pixels into byte array pixels\n  (removes alphachannel from canvas imagedata)\n*/\nGIFEncoder.prototype.getImagePixels = function() {\n  var w = this.width;\n  var h = this.height;\n  this.pixels = new Uint8Array(w * h * 3);\n\n  var data = this.image;\n  var srcPos = 0;\n  var count = 0;\n\n  for (var i = 0; i < h; i++) {\n    for (var j = 0; j < w; j++) {\n      this.pixels[count++] = data[srcPos++];\n      this.pixels[count++] = data[srcPos++];\n      this.pixels[count++] = data[srcPos++];\n      srcPos++;\n    }\n  }\n};\n\n/*\n  Writes Graphic Control Extension\n*/\nGIFEncoder.prototype.writeGraphicCtrlExt = function() {\n  this.out.writeByte(0x21); // extension introducer\n  this.out.writeByte(0xf9); // GCE label\n  this.out.writeByte(4); // data block size\n\n  var transp, disp;\n  if (this.transparent === null) {\n    transp = 0;\n    disp = 0; // dispose = no action\n  } else {\n    transp = 1;\n    disp = 2; // force clear if using transparent color\n  }\n\n  if (this.dispose >= 0) {\n    disp = this.dispose & 7; // user override\n  }\n  disp <<= 2;\n\n  // packed fields\n  this.out.writeByte(\n    0 | // 1:3 reserved\n    disp | // 4:6 disposal\n    0 | // 7 user input - 0 = none\n      transp // 8 transparency flag\n  );\n\n  this.writeShort(this.delay); // delay x 1/100 sec\n  this.out.writeByte(this.transIndex); // transparent color index\n  this.out.writeByte(0); // block terminator\n};\n\n/*\n  Writes Image Descriptor\n*/\nGIFEncoder.prototype.writeImageDesc = function() {\n  this.out.writeByte(0x2c); // image separator\n  this.writeShort(0); // image position x,y = 0,0\n  this.writeShort(0);\n  this.writeShort(this.width); // image size\n  this.writeShort(this.height);\n\n  // packed fields\n  if (this.firstFrame || this.globalPalette) {\n    // no LCT - GCT is used for first (or only) frame\n    this.out.writeByte(0);\n  } else {\n    // specify normal LCT\n    this.out.writeByte(\n      0x80 | // 1 local color table 1=yes\n      0 | // 2 interlace - 0=no\n      0 | // 3 sorted - 0=no\n      0 | // 4-5 reserved\n        this.palSize // 6-8 size of color table\n    );\n  }\n};\n\n/*\n  Writes Logical Screen Descriptor\n*/\nGIFEncoder.prototype.writeLSD = function() {\n  // logical screen size\n  this.writeShort(this.width);\n  this.writeShort(this.height);\n\n  // packed fields\n  this.out.writeByte(\n    0x80 | // 1 : global color table flag = 1 (gct used)\n    0x70 | // 2-4 : color resolution = 7\n    0x00 | // 5 : gct sort flag = 0\n      this.palSize // 6-8 : gct size\n  );\n\n  this.out.writeByte(0); // background color index\n  this.out.writeByte(0); // pixel aspect ratio - assume 1:1\n};\n\n/*\n  Writes Netscape application extension to define repeat count.\n*/\nGIFEncoder.prototype.writeNetscapeExt = function() {\n  this.out.writeByte(0x21); // extension introducer\n  this.out.writeByte(0xff); // app extension label\n  this.out.writeByte(11); // block size\n  this.out.writeUTFBytes("NETSCAPE2.0"); // app id + auth code\n  this.out.writeByte(3); // sub-block size\n  this.out.writeByte(1); // loop sub-block id\n  this.writeShort(this.repeat); // loop count (extra iterations, 0=repeat forever)\n  this.out.writeByte(0); // block terminator\n};\n\n/*\n  Writes color table\n*/\nGIFEncoder.prototype.writePalette = function() {\n  this.out.writeBytes(this.colorTab);\n  var n = 3 * 256 - this.colorTab.length;\n  for (var i = 0; i < n; i++) this.out.writeByte(0);\n};\n\nGIFEncoder.prototype.writeShort = function(pValue) {\n  this.out.writeByte(pValue & 0xff);\n  this.out.writeByte((pValue >> 8) & 0xff);\n};\n\n/*\n  Encodes and writes pixel data\n*/\nGIFEncoder.prototype.writePixels = function() {\n  var enc = new LZWEncoder(\n    this.width,\n    this.height,\n    this.indexedPixels,\n    this.colorDepth\n  );\n  enc.encode(this.out);\n};\n\n/*\n  Retrieves the GIF stream\n*/\nGIFEncoder.prototype.stream = function() {\n  return this.out;\n};\n\nmodule.exports = GIFEncoder;\n\n\n/***/ }),\n/* 2 */\n/***/ (function(module, exports) {\n\n/* NeuQuant Neural-Net Quantization Algorithm\n * ------------------------------------------\n *\n * Copyright (c) 1994 Anthony Dekker\n *\n * NEUQUANT Neural-Net quantization algorithm by Anthony Dekker, 1994.\n * See "Kohonen neural networks for optimal colour quantization"\n * in "Network: Computation in Neural Systems" Vol. 5 (1994) pp 351-367.\n * for a discussion of the algorithm.\n * See also  http://members.ozemail.com.au/~dekker/NEUQUANT.HTML\n *\n * Any party obtaining a copy of these files from the author, directly or\n * indirectly, is granted, free of charge, a full and unrestricted irrevocable,\n * world-wide, paid up, royalty-free, nonexclusive right and license to deal\n * in this software and documentation files (the "Software"), including without\n * limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,\n * and/or sell copies of the Software, and to permit persons who receive\n * copies from any such party to do so, with the only requirement being\n * that this copyright notice remain intact.\n *\n * (JavaScript port 2012 by Johan Nordberg)\n */\n\nvar ncycles = 100; // number of learning cycles\nvar netsize = 256; // number of colors used\nvar maxnetpos = netsize - 1;\n\n// defs for freq and bias\nvar netbiasshift = 4; // bias for colour values\nvar intbiasshift = 16; // bias for fractions\nvar intbias = 1 << intbiasshift;\nvar gammashift = 10;\nvar gamma = 1 << gammashift;\nvar betashift = 10;\nvar beta = intbias >> betashift; /* beta = 1/1024 */\nvar betagamma = intbias << (gammashift - betashift);\n\n// defs for decreasing radius factor\nvar initrad = netsize >> 3; // for 256 cols, radius starts\nvar radiusbiasshift = 6; // at 32.0 biased by 6 bits\nvar radiusbias = 1 << radiusbiasshift;\nvar initradius = initrad * radiusbias; //and decreases by a\nvar radiusdec = 30; // factor of 1/30 each cycle\n\n// defs for decreasing alpha factor\nvar alphabiasshift = 10; // alpha starts at 1.0\nvar initalpha = 1 << alphabiasshift;\nvar alphadec; // biased by 10 bits\n\n/* radbias and alpharadbias used for radpower calculation */\nvar radbiasshift = 8;\nvar radbias = 1 << radbiasshift;\nvar alpharadbshift = alphabiasshift + radbiasshift;\nvar alpharadbias = 1 << alpharadbshift;\n\n// four primes near 500 - assume no image has a length so large that it is\n// divisible by all four primes\nvar prime1 = 499;\nvar prime2 = 491;\nvar prime3 = 487;\nvar prime4 = 503;\nvar minpicturebytes = 3 * prime4;\n\n/*\n  Constructor: NeuQuant\n\n  Arguments:\n\n  pixels - array of pixels in RGB format\n  samplefac - sampling factor 1 to 30 where lower is better quality\n\n  >\n  > pixels = [r, g, b, r, g, b, r, g, b, ..]\n  >\n*/\nfunction NeuQuant(pixels, samplefac) {\n  var network; // int[netsize][4]\n  var netindex; // for network lookup - really 256\n\n  // bias and freq arrays for learning\n  var bias;\n  var freq;\n  var radpower;\n\n  /*\n    Private Method: init\n\n    sets up arrays\n  */\n  function init() {\n    network = [];\n    netindex = new Int32Array(256);\n    bias = new Int32Array(netsize);\n    freq = new Int32Array(netsize);\n    radpower = new Int32Array(netsize >> 3);\n\n    var i, v;\n    for (i = 0; i < netsize; i++) {\n      v = (i << (netbiasshift + 8)) / netsize;\n      network[i] = new Float64Array([v, v, v, 0]);\n      //network[i] = [v, v, v, 0]\n      freq[i] = intbias / netsize;\n      bias[i] = 0;\n    }\n  }\n\n  /*\n    Private Method: unbiasnet\n\n    unbiases network to give byte values 0..255 and record position i to prepare for sort\n  */\n  function unbiasnet() {\n    for (var i = 0; i < netsize; i++) {\n      network[i][0] >>= netbiasshift;\n      network[i][1] >>= netbiasshift;\n      network[i][2] >>= netbiasshift;\n      network[i][3] = i; // record color number\n    }\n  }\n\n  /*\n    Private Method: altersingle\n\n    moves neuron *i* towards biased (b,g,r) by factor *alpha*\n  */\n  function altersingle(alpha, i, b, g, r) {\n    network[i][0] -= alpha * (network[i][0] - b) / initalpha;\n    network[i][1] -= alpha * (network[i][1] - g) / initalpha;\n    network[i][2] -= alpha * (network[i][2] - r) / initalpha;\n  }\n\n  /*\n    Private Method: alterneigh\n\n    moves neurons in *radius* around index *i* towards biased (b,g,r) by factor *alpha*\n  */\n  function alterneigh(radius, i, b, g, r) {\n    var lo = Math.abs(i - radius);\n    var hi = Math.min(i + radius, netsize);\n\n    var j = i + 1;\n    var k = i - 1;\n    var m = 1;\n\n    var p, a;\n    while (j < hi || k > lo) {\n      a = radpower[m++];\n\n      if (j < hi) {\n        p = network[j++];\n        p[0] -= a * (p[0] - b) / alpharadbias;\n        p[1] -= a * (p[1] - g) / alpharadbias;\n        p[2] -= a * (p[2] - r) / alpharadbias;\n      }\n\n      if (k > lo) {\n        p = network[k--];\n        p[0] -= a * (p[0] - b) / alpharadbias;\n        p[1] -= a * (p[1] - g) / alpharadbias;\n        p[2] -= a * (p[2] - r) / alpharadbias;\n      }\n    }\n  }\n\n  /*\n    Private Method: contest\n\n    searches for biased BGR values\n  */\n  function contest(b, g, r) {\n    /*\n      finds closest neuron (min dist) and updates freq\n      finds best neuron (min dist-bias) and returns position\n      for frequently chosen neurons, freq[i] is high and bias[i] is negative\n      bias[i] = gamma * ((1 / netsize) - freq[i])\n    */\n\n    var bestd = ~(1 << 31);\n    var bestbiasd = bestd;\n    var bestpos = -1;\n    var bestbiaspos = bestpos;\n\n    var i, n, dist, biasdist, betafreq;\n    for (i = 0; i < netsize; i++) {\n      n = network[i];\n\n      dist = Math.abs(n[0] - b) + Math.abs(n[1] - g) + Math.abs(n[2] - r);\n      if (dist < bestd) {\n        bestd = dist;\n        bestpos = i;\n      }\n\n      biasdist = dist - (bias[i] >> (intbiasshift - netbiasshift));\n      if (biasdist < bestbiasd) {\n        bestbiasd = biasdist;\n        bestbiaspos = i;\n      }\n\n      betafreq = freq[i] >> betashift;\n      freq[i] -= betafreq;\n      bias[i] += betafreq << gammashift;\n    }\n\n    freq[bestpos] += beta;\n    bias[bestpos] -= betagamma;\n\n    return bestbiaspos;\n  }\n\n  /*\n    Private Method: inxbuild\n\n    sorts network and builds netindex[0..255]\n  */\n  function inxbuild() {\n    var i,\n      j,\n      p,\n      q,\n      smallpos,\n      smallval,\n      previouscol = 0,\n      startpos = 0;\n    for (i = 0; i < netsize; i++) {\n      p = network[i];\n      smallpos = i;\n      smallval = p[1]; // index on g\n      // find smallest in i..netsize-1\n      for (j = i + 1; j < netsize; j++) {\n        q = network[j];\n        if (q[1] < smallval) {\n          // index on g\n          smallpos = j;\n          smallval = q[1]; // index on g\n        }\n      }\n      q = network[smallpos];\n      // swap p (i) and q (smallpos) entries\n      if (i != smallpos) {\n        j = q[0];\n        q[0] = p[0];\n        p[0] = j;\n        j = q[1];\n        q[1] = p[1];\n        p[1] = j;\n        j = q[2];\n        q[2] = p[2];\n        p[2] = j;\n        j = q[3];\n        q[3] = p[3];\n        p[3] = j;\n      }\n      // smallval entry is now in position i\n\n      if (smallval != previouscol) {\n        netindex[previouscol] = (startpos + i) >> 1;\n        for (j = previouscol + 1; j < smallval; j++) netindex[j] = i;\n        previouscol = smallval;\n        startpos = i;\n      }\n    }\n    netindex[previouscol] = (startpos + maxnetpos) >> 1;\n    for (j = previouscol + 1; j < 256; j++) netindex[j] = maxnetpos; // really 256\n  }\n\n  /*\n    Private Method: inxsearch\n\n    searches for BGR values 0..255 and returns a color index\n  */\n  function inxsearch(b, g, r) {\n    var a, p, dist;\n\n    var bestd = 1000; // biggest possible dist is 256*3\n    var best = -1;\n\n    var i = netindex[g]; // index on g\n    var j = i - 1; // start at netindex[g] and work outwards\n\n    while (i < netsize || j >= 0) {\n      if (i < netsize) {\n        p = network[i];\n        dist = p[1] - g; // inx key\n        if (dist >= bestd) i = netsize;\n        else {\n          // stop iter\n          i++;\n          if (dist < 0) dist = -dist;\n          a = p[0] - b;\n          if (a < 0) a = -a;\n          dist += a;\n          if (dist < bestd) {\n            a = p[2] - r;\n            if (a < 0) a = -a;\n            dist += a;\n            if (dist < bestd) {\n              bestd = dist;\n              best = p[3];\n            }\n          }\n        }\n      }\n      if (j >= 0) {\n        p = network[j];\n        dist = g - p[1]; // inx key - reverse dif\n        if (dist >= bestd) j = -1;\n        else {\n          // stop iter\n          j--;\n          if (dist < 0) dist = -dist;\n          a = p[0] - b;\n          if (a < 0) a = -a;\n          dist += a;\n          if (dist < bestd) {\n            a = p[2] - r;\n            if (a < 0) a = -a;\n            dist += a;\n            if (dist < bestd) {\n              bestd = dist;\n              best = p[3];\n            }\n          }\n        }\n      }\n    }\n\n    return best;\n  }\n\n  /*\n    Private Method: learn\n\n    "Main Learning Loop"\n  */\n  function learn() {\n    var i;\n\n    var lengthcount = pixels.length;\n    var alphadec = 30 + (samplefac - 1) / 3;\n    var samplepixels = lengthcount / (3 * samplefac);\n    var delta = ~~(samplepixels / ncycles);\n    var alpha = initalpha;\n    var radius = initradius;\n\n    var rad = radius >> radiusbiasshift;\n\n    if (rad <= 1) rad = 0;\n    for (i = 0; i < rad; i++)\n      radpower[i] = alpha * ((rad * rad - i * i) * radbias / (rad * rad));\n\n    var step;\n    if (lengthcount < minpicturebytes) {\n      samplefac = 1;\n      step = 3;\n    } else if (lengthcount % prime1 !== 0) {\n      step = 3 * prime1;\n    } else if (lengthcount % prime2 !== 0) {\n      step = 3 * prime2;\n    } else if (lengthcount % prime3 !== 0) {\n      step = 3 * prime3;\n    } else {\n      step = 3 * prime4;\n    }\n\n    var b, g, r, j;\n    var pix = 0; // current pixel\n\n    i = 0;\n    while (i < samplepixels) {\n      b = (pixels[pix] & 0xff) << netbiasshift;\n      g = (pixels[pix + 1] & 0xff) << netbiasshift;\n      r = (pixels[pix + 2] & 0xff) << netbiasshift;\n\n      j = contest(b, g, r);\n\n      altersingle(alpha, j, b, g, r);\n      if (rad !== 0) alterneigh(rad, j, b, g, r); // alter neighbours\n\n      pix += step;\n      if (pix >= lengthcount) pix -= lengthcount;\n\n      i++;\n\n      if (delta === 0) delta = 1;\n      if (i % delta === 0) {\n        alpha -= alpha / alphadec;\n        radius -= radius / radiusdec;\n        rad = radius >> radiusbiasshift;\n\n        if (rad <= 1) rad = 0;\n        for (j = 0; j < rad; j++)\n          radpower[j] = alpha * ((rad * rad - j * j) * radbias / (rad * rad));\n      }\n    }\n  }\n\n  /*\n    Method: buildColormap\n\n    1. initializes network\n    2. trains it\n    3. removes misconceptions\n    4. builds colorindex\n  */\n  function buildColormap() {\n    init();\n    learn();\n    unbiasnet();\n    inxbuild();\n  }\n  this.buildColormap = buildColormap;\n\n  /*\n    Method: getColormap\n\n    builds colormap from the index\n\n    returns array in the format:\n\n    >\n    > [r, g, b, r, g, b, r, g, b, ..]\n    >\n  */\n  function getColormap() {\n    var map = [];\n    var index = [];\n\n    for (var i = 0; i < netsize; i++) index[network[i][3]] = i;\n\n    var k = 0;\n    for (var l = 0; l < netsize; l++) {\n      var j = index[l];\n      map[k++] = network[j][0];\n      map[k++] = network[j][1];\n      map[k++] = network[j][2];\n    }\n    return map;\n  }\n  this.getColormap = getColormap;\n\n  /*\n    Method: lookupRGB\n\n    looks for the closest *r*, *g*, *b* color in the map and\n    returns its index\n  */\n  this.lookupRGB = inxsearch;\n}\n\nmodule.exports = NeuQuant;\n\n\n/***/ }),\n/* 3 */\n/***/ (function(module, exports) {\n\n/*\n  LZWEncoder.js\n\n  Authors\n  Kevin Weiner (original Java version - kweiner@fmsware.com)\n  Thibault Imbert (AS3 version - bytearray.org)\n  Johan Nordberg (JS version - code@johan-nordberg.com)\n\n  Acknowledgements\n  GIFCOMPR.C - GIF Image compression routines\n  Lempel-Ziv compression based on \'compress\'. GIF modifications by\n  David Rowley (mgardi@watdcsu.waterloo.edu)\n  GIF Image compression - modified \'compress\'\n  Based on: compress.c - File compression ala IEEE Computer, June 1984.\n  By Authors: Spencer W. Thomas (decvax!harpo!utah-cs!utah-gr!thomas)\n  Jim McKie (decvax!mcvax!jim)\n  Steve Davies (decvax!vax135!petsd!peora!srd)\n  Ken Turkowski (decvax!decwrl!turtlevax!ken)\n  James A. Woods (decvax!ihnp4!ames!jaw)\n  Joe Orost (decvax!vax135!petsd!joe)\n*/\n\nvar EOF = -1;\nvar BITS = 12;\nvar HSIZE = 5003; // 80% occupancy\nvar masks = [\n  0x0000,\n  0x0001,\n  0x0003,\n  0x0007,\n  0x000f,\n  0x001f,\n  0x003f,\n  0x007f,\n  0x00ff,\n  0x01ff,\n  0x03ff,\n  0x07ff,\n  0x0fff,\n  0x1fff,\n  0x3fff,\n  0x7fff,\n  0xffff\n];\n\nfunction LZWEncoder(width, height, pixels, colorDepth) {\n  var initCodeSize = Math.max(2, colorDepth);\n\n  var accum = new Uint8Array(256);\n  var htab = new Int32Array(HSIZE);\n  var codetab = new Int32Array(HSIZE);\n\n  var cur_accum,\n    cur_bits = 0;\n  var a_count;\n  var free_ent = 0; // first unused entry\n  var maxcode;\n\n  // block compression parameters -- after all codes are used up,\n  // and compression rate changes, start over.\n  var clear_flg = false;\n\n  // Algorithm: use open addressing double hashing (no chaining) on the\n  // prefix code / next character combination. We do a variant of Knuth\'s\n  // algorithm D (vol. 3, sec. 6.4) along with G. Knott\'s relatively-prime\n  // secondary probe. Here, the modular division first probe is gives way\n  // to a faster exclusive-or manipulation. Also do block compression with\n  // an adaptive reset, whereby the code table is cleared when the compression\n  // ratio decreases, but after the table fills. The variable-length output\n  // codes are re-sized at this point, and a special CLEAR code is generated\n  // for the decompressor. Late addition: construct the table according to\n  // file size for noticeable speed improvement on small files. Please direct\n  // questions about this implementation to ames!jaw.\n  var g_init_bits, ClearCode, EOFCode;\n\n  // Add a character to the end of the current packet, and if it is 254\n  // characters, flush the packet to disk.\n  function char_out(c, outs) {\n    accum[a_count++] = c;\n    if (a_count >= 254) flush_char(outs);\n  }\n\n  // Clear out the hash table\n  // table clear for block compress\n  function cl_block(outs) {\n    cl_hash(HSIZE);\n    free_ent = ClearCode + 2;\n    clear_flg = true;\n    output(ClearCode, outs);\n  }\n\n  // Reset code table\n  function cl_hash(hsize) {\n    for (var i = 0; i < hsize; ++i) htab[i] = -1;\n  }\n\n  function compress(init_bits, outs) {\n    var fcode, c, i, ent, disp, hsize_reg, hshift;\n\n    // Set up the globals: g_init_bits - initial number of bits\n    g_init_bits = init_bits;\n\n    // Set up the necessary values\n    clear_flg = false;\n    n_bits = g_init_bits;\n    maxcode = MAXCODE(n_bits);\n\n    ClearCode = 1 << (init_bits - 1);\n    EOFCode = ClearCode + 1;\n    free_ent = ClearCode + 2;\n\n    a_count = 0; // clear packet\n\n    ent = nextPixel();\n\n    hshift = 0;\n    for (fcode = HSIZE; fcode < 65536; fcode *= 2) ++hshift;\n    hshift = 8 - hshift; // set hash code range bound\n    hsize_reg = HSIZE;\n    cl_hash(hsize_reg); // clear hash table\n\n    output(ClearCode, outs);\n\n    outer_loop: while ((c = nextPixel()) != EOF) {\n      fcode = (c << BITS) + ent;\n      i = (c << hshift) ^ ent; // xor hashing\n      if (htab[i] === fcode) {\n        ent = codetab[i];\n        continue;\n      } else if (htab[i] >= 0) {\n        // non-empty slot\n        disp = hsize_reg - i; // secondary hash (after G. Knott)\n        if (i === 0) disp = 1;\n        do {\n          if ((i -= disp) < 0) i += hsize_reg;\n          if (htab[i] === fcode) {\n            ent = codetab[i];\n            continue outer_loop;\n          }\n        } while (htab[i] >= 0);\n      }\n      output(ent, outs);\n      ent = c;\n      if (free_ent < 1 << BITS) {\n        codetab[i] = free_ent++; // code -> hashtable\n        htab[i] = fcode;\n      } else {\n        cl_block(outs);\n      }\n    }\n\n    // Put out the final code.\n    output(ent, outs);\n    output(EOFCode, outs);\n  }\n\n  function encode(outs) {\n    outs.writeByte(initCodeSize); // write "initial code size" byte\n    remaining = width * height; // reset navigation variables\n    curPixel = 0;\n    compress(initCodeSize + 1, outs); // compress and write the pixel data\n    outs.writeByte(0); // write block terminator\n  }\n\n  // Flush the packet to disk, and reset the accumulator\n  function flush_char(outs) {\n    if (a_count > 0) {\n      outs.writeByte(a_count);\n      outs.writeBytes(accum, 0, a_count);\n      a_count = 0;\n    }\n  }\n\n  function MAXCODE(n_bits) {\n    return (1 << n_bits) - 1;\n  }\n\n  // Return the next pixel from the image\n  function nextPixel() {\n    if (remaining === 0) return EOF;\n    --remaining;\n    var pix = pixels[curPixel++];\n    return pix & 0xff;\n  }\n\n  function output(code, outs) {\n    cur_accum &= masks[cur_bits];\n\n    if (cur_bits > 0) cur_accum |= code << cur_bits;\n    else cur_accum = code;\n\n    cur_bits += n_bits;\n\n    while (cur_bits >= 8) {\n      char_out(cur_accum & 0xff, outs);\n      cur_accum >>= 8;\n      cur_bits -= 8;\n    }\n\n    // If the next entry is going to be too big for the code size,\n    // then increase it, if possible.\n    if (free_ent > maxcode || clear_flg) {\n      if (clear_flg) {\n        maxcode = MAXCODE((n_bits = g_init_bits));\n        clear_flg = false;\n      } else {\n        ++n_bits;\n        if (n_bits == BITS) maxcode = 1 << BITS;\n        else maxcode = MAXCODE(n_bits);\n      }\n    }\n\n    if (code == EOFCode) {\n      // At EOF, write the rest of the buffer.\n      while (cur_bits > 0) {\n        char_out(cur_accum & 0xff, outs);\n        cur_accum >>= 8;\n        cur_bits -= 8;\n      }\n      flush_char(outs);\n    }\n  }\n\n  this.encode = encode;\n}\n\nmodule.exports = LZWEncoder;\n\n\n/***/ })\n/******/ ]);\n';

        /***/
      }
      /******/
    ]
  );
});
//# sourceMappingURL=index.js.map
