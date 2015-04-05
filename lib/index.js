var Hoek = require('hoek')
  , Nano = require('nano')
  , url = require('url');

var internals = {};
internals.defaults = {
  nano: {
    url: 'http://localhost:5984'
  },
  prefix: 'nano'
};

internals.api = [
  'info', 'replicate', 'compact', 'changes', 'follow', 'session', 'insert',
  'get', 'head', 'copy', 'destroy', 'bulk', 'list', 'fetch', 'fetchRevs',
  'show', 'atomic', 'updateWithHandler', 'search', 'spatial', 'view',
  'viewWithList', 'multipart.insert', 'multipart.get', 'attachment.insert',
  'attachment.get', 'attachment.destroy'
];

module.exports.register = function (server, options, next) {
  var prefix = options.prefix || internals.defaults.prefix;
  // return error if server methods prefix is already in use
  if (server.methods[prefix]) {
    return next(new Error('There is already a plugin registered with the prefix \'' + prefix + '\''));
  }
  internals[prefix] = {};

  // save reference to plugin instance namespace
  var ns = internals[prefix];
  ns.options = Hoek.applyToDefaults(internals.defaults, options);
  ns.options.nano.url = url.resolve(ns.options.nano.url, ns.options.nano.db);
  ns.nano = Nano(ns.options.nano);

  internals.registerServerMethods(server, prefix);

  return next();
};

// registers server methods
internals.registerServerMethods = function registerServerMethods (server, prefix) {
  var methods = [];

  // register all server methods
  internals.api.forEach(function (name) {
    methods.push({
      name: prefix + '.' + name,
      method: internals.getApiFunction(name, prefix)
    });
  });
  server.method(methods);
};

// returns nano's method specified in name with intercepted callback to check for authentication
internals.getApiFunction = function (name, prefix) {
  return function () {
    // copy all argumens to a 'real' array to work with
    var args = Array.prototype.slice.call(arguments);
    // save originally passed callback for later
    var origCb = arguments[args.length - 1];
    // number of arguments minus callback
    var bound = args.length - 1;
    if (typeof origCb !== 'function') {
      // no-op function if there is no callback
      origCb = Hoek.ignore;
      // no callback, take all arguments
      bound = args.length;
    }
    // save reference to namespace of plugin instance
    var ns = internals[prefix];
    // create arguments array with substituted callback
    var checkArgs = args.slice(0, bound).concat(function (err, body, headers) {
      var cookie;
      // only do something if error status code is 401 (unauthorized)
      if (err && err.statusCode === 401) {
        ns.nano.auth(ns.options.user, ns.options.password, function (err, body, headers) {
          if (err) {
            origCb(err);
          }
          else {
            cookie = headers['set-cookie'][0];
            // include cookie in this plugin instance's options
            ns.options.nano = Hoek.applyToDefaults(ns.options.nano, {cookie: cookie});
            // instantiate nano with the new cookie
            ns.nano = Nano(ns.options.nano);
            // apply original arguments
            Hoek.reach(ns.nano, name).apply(ns.nano, args);
          }
        });
      }
      else {
        // set new cookie if received one
        if (headers && headers['set-cookie']) {
          cookie = headers['set-cookie'][0];
          // include cookie in this plugin instance's options
          ns.options.nano = Hoek.applyToDefaults(ns.options.nano, {cookie: cookie});
          // instantiate nano with the new cookie
          ns.nano = Nano(ns.options.nano);
        }
        // no need to do anything, directly call passed callback
        origCb(err, body, headers);
      }
    });

    // call nano's method with arguments and substituted callback
    return Hoek.reach(ns.nano, name).apply(ns.nano, checkArgs);
  };
};

module.exports.register.attributes = {
  pkg: require('../package.json'),
  multiple: true
};
