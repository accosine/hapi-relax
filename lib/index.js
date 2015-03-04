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

internals.apiShallow = [
  'info', 'replicate', 'compact', 'changes', 'follow', 'session', 'insert',
  'get', 'head', 'copy', 'destroy', 'bulk', 'list', 'fetch', 'fetchRevs',
  'show', 'atomic', 'updateWithHandler', 'search', 'spatial', 'view',
  'viewWithList'
];

internals.apiNested = [
  {'toBe': 'multipartInsert', 'is': 'multipart.insert'},
  {'toBe': 'multipartGet', 'is': 'multipart.get'},
  {'toBe': 'attachmentInsert', 'is': 'attachment.insert'},
  {'toBe': 'attachmentGet', 'is': 'attachment.get'},
  {'toBe': 'attachmentDestroy', 'is': 'attachment.destroy'}
];

module.exports.register = function (server, options, next) {
  var prefix = options.prefix || internals.defaults.prefix;
  // return error if server methods prefix is already in use
  if (server.methods[prefix]) {
    return next(Error('There is already a plugin registered with the prefix \'' + prefix + '\''));
  }
  internals[prefix] = {};

  // save reference to plugin instance namespace
  var ns = internals[prefix];
  ns.options = Hoek.applyToDefaults(internals.defaults, options);
  ns.options.nano.url = url.resolve(ns.options.nano.url,
    ns.options.nano.db);
  ns.nano = Nano(ns.options.nano);

  internals.registerServerMethods(server, prefix);

  next();
};

// registers server methods
internals.registerServerMethods = function registerServerMethods (server, prefix) {
  // register all shallow nano methods
  internals.apiShallow.forEach(function (name) {
    server.method(prefix + '.' + name, internals.getApiFunction(name, prefix));
  });
  // register all nested nano methods
  internals.apiNested.forEach(function (name) {
    server.method(prefix + '.' + name.toBe, internals.getApiFunction(name.is, prefix));
  });
};

// returns nano's method specified in name with intercepted callback to check for authentication
internals.getApiFunction = function (name, prefix) {
  return function () {
    // copy all argumens to a 'real' array to work with
    var args = Array.prototype.slice.call(arguments)
      // create arguments array with substituted callback
      , checkArgs = args.slice(0, arguments.length - 1).concat(function (err, body, headers) {
        // only do something if error status code is 401 (unauthorized)
        if (err && err.statusCode === 401) {
          ns.nano.auth(ns.options.user, ns.options.password, function (err, body, headers) {
            if (err) {
              origCb(err);
            }
            else {
              var cookie = headers['set-cookie'][0];
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
          if (headers['set-cookie']) {
            var cookie = headers['set-cookie'][0];
            // include cookie in this plugin instance's options
            ns.options.nano = Hoek.applyToDefaults(ns.options.nano, {cookie: cookie});
            // instantiate nano with the new cookie
            ns.nano = Nano(ns.options.nano);
          }
          // no need to do anything, directly call passed callback
          origCb(err, body, headers);
        }
      })
      // save reference to namespace of plugin instance
      , ns = internals[prefix]
      // save originally passed callback for later
      , origCb = arguments[args.length - 1];

    // call nano's method with arguments and substituted callback
    Hoek.reach(ns.nano, name).apply(ns.nano, checkArgs);
  };
};

module.exports.register.attributes = {
  pkg: require('../package.json'),
  multiple: true
};
