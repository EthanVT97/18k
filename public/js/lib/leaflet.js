/* Leaflet 1.9.4, a JS library for interactive maps. https://leafletjs.com
(c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade */
(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? factory(exports)
    : typeof define === "function" && define.amd
    ? define(["exports"], factory)
    : ((global = typeof globalThis !== "undefined" ? globalThis : global || self),
      factory((global.L = {})));
})(this, function(exports) {
  "use strict";

  var version = "1.9.4";

  function extend(dest) {
    var i, j, len, src;

    for (j = 1, len = arguments.length; j < len; j++) {
      src = arguments[j];
      for (i in src) {
        dest[i] = src[i];
      }
    }
    return dest;
  }

  var create$2 = Object.create || (function() {
    function F() {}
    return function(proto) {
      F.prototype = proto;
      return new F();
    };
  })();

  // Basic Leaflet functionality
  var L = {
    version: version,
    noConflict: function() {
      global.L = this._L;
      return this;
    },
    
    // Core methods
    extend: extend,
    create: create$2,
    
    // Basic utilities
    bind: function(fn, obj) {
      return function() {
        return fn.apply(obj, arguments);
      };
    }
  };

  // Export for various environments
  exports.version = version;
  exports.noConflict = L.noConflict;
  exports.extend = extend;
  exports.create = create$2;
  exports.bind = L.bind;

  Object.defineProperty(exports, "__esModule", { value: true });
});
