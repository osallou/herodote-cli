#!/usr/bin/env node

/**
 * Module dependencies.
 */
const program = require('commander')
var app = require('../herodote/master');
var debug = require('debug')('herotode:server');
var http = require('http');
let server = null;

function runMaster() {
  /**
   * Get port from environment and store in Express.
   */
  var port = normalizePort(process.env.PORT || '3000');

  app.set('port', port);

  /**
   * Create HTTP server.
   */

  server = http.createServer(app);
  /**
   * Listen on provided port, on all network interfaces.
   */

  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);
}

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}


program
  .command('run') 
  .description('start master') 
  .option('-r, --rabbit [value]', 'RabbitMQ connection url', null)
  .option('-m, --mongo [value]', 'MongoDB connection url', null)
  .option('-s, --secret [value]', 'secret shared with Herodote', null)
  .action(function (args) {
    let rabbit = 'amqp://guest:guest@localhost:5672';
    let mongoUrl = 'localhost:27017/hero';
    let secret = 'undefined';
    if(args.rabbit) {
        rabbit = args.rabbit;
    }
    if(process.env.RABBITMQ_URL) {
      rabbit = process.env.RABBITMQ_URL;
    }
    if(args.mongo) {
        mongoUrl = args.mongo
    }
    if(process.env.MONGO) {
      mongoUrl = process.env.MONGO;
    }
    if(args.secret) {
      secret = args.secret
    }
    if(process.env.SECRET) {
      secret = process.env.SECRET;
    }
    cfg = {
      mongoUrl: mongoUrl,
      rabbitUrl: rabbit,
      secret: secret
    }
    console.log('Start master with config', cfg);
    app.set('herodoteConfig', cfg);
    runMaster();
    
  });

  program.parse(process.argv);