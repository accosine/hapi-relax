## hapi-relax

[**hapi**](https://github.com/hapijs/hapi) plugin that registers server methods using [**nano**](https://github.com/dscape/nano) and extends it by taking care of cookie authentication

### Introduction
hapi-relax enhances your hapi server by an interface for a specified CouchDB database. You can also pass a username and password and your can relax and stop worrying about authentication. When your cookie is invalid, it will fetch a new one and when CouchDB gives you a new one, it will update the plugin internally.

### Usage
The plugin takes the following options:

- `nano` - optional config which nano will be initialized with. Defaults to `{ host: 'http://localhost:5984' }`
- `user` - optional database username
- `password` - optional password for your database user
- `prefix` - optional namespace in which the server methods will be registered, the plugin can be registered multiple times e.g. for multiple databases or hosts. Defaults to `nano`

### API
[**nanos**](https://github.com/dscape/nano) API remains unchanged

- info
- replicate
- compact
- changes
- follow
- session
- insert
- get
- head
- copy
- destroy
- bulk
- list
- fetch
- fetchRevs
- show
- atomic
- updateWithHandler
- search
- spatial
- view
- viewWithList
- multipartInsert
- multipartGet
- attachmentInsert
- attachmentGet
- attachmentDestroy

### Example
```
var Hapi = require('hapi');

var server = new Hapi.Server();
server.connection({ port: 8080 });

var plugins = [{
  register: require('hapi-relax'),
  options: {
    nano: {
      url: 'http://localhost:5984',
      db: 'db1'
    },
    user: 'root',
    password: 'secret'
  }
},
{
  register: require('hapi-relax'),
  options: {
    nano: {
      url: 'http://localhost:5984',
      db: 'db2'
    },
    user: 'alice',
    password: 'rabbit',
    prefix: 'db2'
  }
}];

server.register(plugins, function (err) {
  if (err) {
    throw err;
  }
});

server.route({
    method: 'GET',
    path: '/db1/{key}',
    handler: function (request, reply) {
      var key = encodeURIComponent(request.params.key);
      server.methods.nano.get(key, function (err, body, headers) {
        if (err && err.reason === 'missing') {
          reply('Document does not exist').code(404);
        }
        else {
          reply(body);
        }
      });
    }
});

server.route({
    method: 'GET',
    path: '/db2/{key}',
    handler: function (request, reply) {
      var key = encodeURIComponent(request.params.key);
      server.methods.db2.get(key, function (err, body, headers) {
        if (err && err.reason === 'missing') {
          reply('Document does not exist').code(404);
        }
        else {
          reply(body);
        }
      });
    }
});

server.start(function () {
  console.log('Server running at:', server.info.uri);
});
```

