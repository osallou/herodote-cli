var express = require('express');
var morgan = require('morgan');
var winston = require('winston');
var jwt = require('jsonwebtoken');

var loggerOptions = {
  level: 'info',
  format: winston.format.json(),
  defaultMeta: {service: 'herodote'},
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
}

if (process.env.NODE_ENV === 'development') {
  console.log('dev mode, show debug on console');
  loggerOptions.transports.push(new winston.transports.Console({
    format: winston.format.simple(),
    level: 'debug'
  }));
}

winston.loggers.add('herodote', loggerOptions);

var logger = winston.loggers.get('herodote');

logger.stream = {
  write: function(message, encoding) {
    logger.info(message);
  },
};

var jobsRouter = require('./jobs');

var app = express();

app.use(morgan('combined', { stream: logger.stream }));
app.set('port', process.env.PORT || 3000);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.all('*', function(req, res, next){

  logInfo = {}
  if(! req.locals) {
      req.locals = {};
  }
  let jwtToken = null;
  let authorization = req.headers['authorization'] || null;
  if (authorization) {
      let elts = authorization.split(' ');
      try {
          jwtToken = jwt.verify(elts[elts.length - 1], req.app.get('herodoteConfig').secret);
      } catch(err) {
          logger.warn('failed to decode jwt');
          jwtToken = null;
      }
  }
  if(jwtToken){
        if(jwtToken.job === undefined) {
            return res.status(401).send('Invalid token').end();
        }
        req.locals.logInfo = jwtToken.job;
        next();
  }
  else {
    return res.status(401).send('Invalid authorization header').end();
  }
});

app.use('/jobs', jobsRouter);

module.exports = app;
