var Hapi = require('hapi');

var server = new Hapi.Server();
server.connection({ port: 8080 });

var plugins = [{
  register: require('../index'),
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
  register: require('../index'),
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
