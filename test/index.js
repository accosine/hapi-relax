var Code = require('code')
  , Hapi = require('hapi')
  , Lab = require('lab')
  , Nock = require('nock')
  , config = require('./config')
  , path = require('path');

var lab = exports.lab = Lab.script()
  , nockBack = Nock.back;

var plugins = config.plugins;
nockBack.fixtures = path.join(__dirname, 'fixtures');

lab.experiment('Plugin registration', function() {
  var server;

  lab.beforeEach(function (done) {
    server = new Hapi.Server();
    done();
  });

  lab.test('Plugin loads successfully', function (done) {
    server.register(plugins.a, function (err) {
      Code.expect(err).to.be.undefined();
      Code.expect(server.methods.nano).to.be.object();
      Code.expect(server.methods.customPrefix).to.be.object();
      Code.expect(server.methods.nano).to.not.deep.equal(server.methods.customPrefix);
      done();
    });
  });

  lab.test('Plugin returns error when same prefix is used twice', function (done) {
    server.register(plugins.a.concat(plugins.b), function (err) {
      var expErr = 'Error: There is already a plugin registered with the prefix' +
                   ' \'customPrefix\'';
      Code.expect(err).to.be.an.instanceof(Error);
      Code.expect(err.toString()).to.equal(expErr);
      done();
    });
  });
});

lab.experiment('Server methods', function() {
  var server = new Hapi.Server();

  lab.before(function (done) {
    server.register(plugins.b, function (err) {
      if (err) {
        throw err;
      }
      done();
    });
  });

  lab.test('Get method returns document', function (done) {
    nockBack('getDoc0.json', function (nockDone) {
      server.methods.customPrefix.get('doc0', function (err, body, headers) {
        Code.expect(err).to.be.null();
        Code.expect(body).to.be.object();
        Code.expect(headers).to.be.object();
        Code.expect(headers.statusCode).to.equal(200);
        Code.expect(body._rev).to.be.string();
        Code.expect(body._id).to.be.string();
        Code.expect(body._id).to.equal('doc0');
        Code.expect(body.content).to.equal('Hello universe!');
        Nock.cleanAll();
        nockDone();
        done();
      });
    });
  });

  lab.test('Get method returns error for non existing document', function (done) {
    nockBack('getDoc1.json', function (nockDone) {
      server.methods.customPrefix.get('doc1', function (err, body, headers) {
        Code.expect(err).to.be.an.instanceof(Error);
        Code.expect(err.reason).to.equal('missing');
        Code.expect(err.statusCode).to.equal(404);
        Code.expect(err.errid).to.equal('non_200');
        Code.expect(err.description).to.equal('couch returned 404');
        Nock.cleanAll();
        nockDone();
        done();
      });
    });
  });

  lab.test('Get method returns error for non existing document in non existing database', function (done) {
    nockBack('wrongDb.json', function (nockDone) {
      server.methods.wrong.get('doc1', function (err, body, headers) {
        Code.expect(err).to.be.an.instanceof(Error);
        Code.expect(err.reason).to.equal('no_db_file');
        Code.expect(err.statusCode).to.equal(404);
        Code.expect(err.errid).to.equal('non_200');
        Code.expect(err.description).to.equal('couch returned 404');
        Nock.cleanAll();
        nockDone();
        done();
      });
    });
  });
});

lab.experiment('Authentication', function() {
  var server = new Hapi.Server();

  lab.before(function (done) {
    server.register(plugins.b.concat(plugins.c), function (err) {
      if (err) {
        throw err;
      }
      done();
    });
  });

    lab.test('Get method returns error when credentials are wrong', function (done) {
      nockBack('auth.json', function (nockDone) {
        server.methods.wrongPw.get('doc1', function (err, body, headers) {
          Code.expect(err).to.be.an.instanceof(Error);
          Code.expect(err.reason).to.equal('Name or password is incorrect.');
          Code.expect(err.statusCode).to.equal(401);
          Code.expect(err.errid).to.equal('non_200');
          Code.expect(err.description).to.equal('couch returned 401');
          Nock.cleanAll();
          nockDone();
          done();
        });
      });
    });


  lab.test('Two requests in a row should only require one authentication', function (done) {
    nockBack('auth2.json', function (nockDone) {
      server.methods.customPrefix.info(function (err, body, headers) {
        var body1 = body
          , err1 = err
          , headers1 = headers;
        Code.expect(err).to.be.null();
        Code.expect(body).to.be.object();
        Code.expect(headers).to.be.object();
        Code.expect(headers.statusCode).to.equal(200);
        Code.expect(body.db_name).to.equal('test2');
        server.methods.customPrefix.info(function (err, body, headers) {
          Code.expect(err).to.deep.equal(err1);
          Code.expect(body).to.deep.equal(body1);
          Code.expect(headers).to.deep.equal(headers1);
          Nock.cleanAll();
          nockDone();
          done();
        });
      });
    });
  });

  // Set couch_httpd_auth timeout to something like 10 seconds for this test to pass unmocked
  lab.test('Two requests with delay will reassign cookie if passed in headers', function (done) {
    nockBack('cookie.json', function (nockDone) {
      server.methods.customPrefix.info(function (err, body, headers) {
        var body1 = body
          , err1 = err
          , headers1 = headers;
        Code.expect(err).to.be.null();
        Code.expect(body).to.be.object();
        Code.expect(headers).to.be.object();
        Code.expect(headers.statusCode).to.equal(200);
        Code.expect(body.db_name).to.equal('test2');
        setTimeout(function () {
          server.methods.customPrefix.info(function (err, body, headers) {
            Code.expect(err).to.deep.equal(err1);
            Code.expect(body).to.deep.equal(body1);
            Code.expect(headers['set-cookie']).to.be.array();
            Nock.cleanAll();
            nockDone();
            done();
          });
        }, process.env.NOCK_OFF ? 5000 : 0);
      });
    });
  });
});
