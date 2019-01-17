var express = require('express');
var router = express.Router();
var winston = require('winston');
var Promise = require('promise')
const logger = winston.loggers.get('herodote');
var amqp = require('amqplib');

let mongoUrl = 'localhost:27017/hero';
if(process.env.MONGO) {
    mongoUrl = 'mongo:27017/hero';
}

var monk = require('monk');
var db = monk(mongoUrl);
var jobs_db = db.get('jobs');

const heroQueue = 'hero';

sendMsg = (msg) => {
    return new Promise(function (resolve, reject){
        let conn = null;
        amqp.connect(process.env.RABBIT_URL).then(function(_conn) {
            conn = _conn;
            return conn.createChannel();
        }).then(ch => {
            return ch.assertQueue(heroQueue).then(() => {
                logger.debug('publish msg');
                ch.sendToQueue(heroQueue, Buffer.from(JSON.stringify(msg)))
                return ch.close()
            })
        })
        .then(() => {
            conn.close()
            resolve(true)
        })

    });
}


router.post('/', function(req, res, next) {
  jobs_db.insert(req.locals.logInfo).then(job => {
      return sendMsg(job)
  }).then( ok => {
    res.send('job submitted');
    res.end();
  }).catch(err => {
      logger.error('Failed to add job: ' + err);
      res.status(500).send(err.error);
      res.end();
  });
});

router.get('/', function(req, res, next) {
    jobs_db.find({}).then(jobs => {
        res.send(jobs);
        res.end();
    })
});

module.exports = router;
