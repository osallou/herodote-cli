var express = require('express');
var router = express.Router();
var winston = require('winston');
var Promise = require('promise')
const logger = winston.loggers.get('herodote');
var amqp = require('amqplib');


var monk = require('monk');
//var db = monk(mongoUrl);
//var jobs_db = db.get('jobs');
let db = null;
let jobs_db = null;
let rabbitUrl = null;

const heroQueue = 'hero';

sendMsg = (msg) => {
    return new Promise(function (resolve, reject){
        let conn = null;
        amqp.connect(rabbitUrl).then(function(_conn) {
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

function setCfg(cfg) {
    db = monk(cfg.mongoUrl);
    jobs_db = db.get('jobs');
    rabbitUrl = cfg.rabbitUrl;
}


router.post('/', function(req, res, next) {
  if(db == null) {
    setCfg(req.app.get('herodoteConfig'))
  }
  req.body.status = 'pending';
  if(! req.body.cmd) {
      res.status(403).send('missing cmd');
      return;
  }
  req.body.submitDate = new Date();

  jobs_db.insert(req.body).then(job => {
    logger.info('new job request for: ' + job._id);
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
    if(db == null) {
        setCfg(req.app.get('herodoteConfig'))
    }
    jobs_db.find({}).then(jobs => {
        res.send(jobs);
        res.end();
    })
});

module.exports = router;
