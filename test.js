var test = require('tape')
var websocket = require('./')
var echo = require("./echo-server")
var WebSocketServer = require('ws').Server
var http = require('http')

test('echo server', function(t) {

  echo.start(function() {
    var client = websocket(echo.url, echo.options)

    client.on('error', console.error)

    client.on('data', function(data) {
      t.ok(Buffer.isBuffer(data), 'is a buffer')
      t.equal(data.toString(), 'hello world')
      client.end()
      echo.stop(function() {
        t.end()
      })
    })

    client.write('hello world')
  });

});

test('emitting not connected errors', function(t) {

  echo.start(function() {
    var client = websocket(echo.url, echo.options)

    client.on('error', function() {
      echo.stop(function() {
        t.true(true, 'should emit error')
        t.end()
      })
    })

    client.once('data', function(data) {
      client.end()
      client.write('abcde')
    })

    client.write('hello world')
  });

});

test('passes options to websocket constructor', function(t) {
  t.plan(3)

  opts = {
    verifyClient: function verifyClient(info) {
      t.equal(info.req.headers['x-custom-header'], 'Custom Value')
      return true
    }
  }
  echo.start(opts, function() {
    var options = {headers: {'x-custom-header': 'Custom Value'}}
    var client = websocket(echo.url, options)

    client.on('error', console.error)

    client.on('data', function(data) {
      t.ok(Buffer.isBuffer(data), 'is a buffer')
      t.equal(data.toString(), 'hello world')
      client.end()
      echo.stop(function() {})
    })

    client.write('hello world')
  });

});


test('destroy', function(t) {
  t.plan(1)

  echo.start(function() {
    var client = websocket(echo.url, echo.options)

    client.on('close', function() {
      echo.stop(function() {
        t.pass('destroyed')
      })
    })

    setTimeout(function() {
      client.destroy();
    }, 200);
  });

});

test('emit sending errors if the socket is closed by the other party', function(t) {

  var server = http.createServer()
  var wss = new WebSocketServer({ server: server })

  server.listen(8344, function() {
    var client = websocket('ws://localhost:8344')

    wss.on('connection', function(ws) {
      var stream = websocket(ws)

      client.destroy()

      setTimeout(function() {
        stream.write('hello world')
      }, 50)

      stream.on('error', function(err) {
        t.ok(err, 'client errors')
        server.close(t.end.bind(t))
      })
    })
  })
})
