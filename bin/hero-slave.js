#!/usr/bin/env node

const program = require('commander')
var fs = require('fs');
var amqp = require('amqplib/callback_api');
var Promise = require('promise');
var crypto = require('crypto');
const { spawn } = require('child_process');

let mongoUrl = 'localhost:27017/hero';
if(process.env.MONGO) {
    mongoUrl = process.env.MONGO;
}


var monk = require('monk');
var db = null;
var jobs_db = null;

function bail(err) {
    console.error(err);
    process.exit(1);
}

const heroQueue = 'hero';

runJob = (job) => {
    return new Promise(function(resolve, reject) {
        jobs_db.findOne({'_id': monk.id(job._id)}).then(jobInfo => {
            if(! jobInfo) {
                reject('not found')
            }
            jobs_db.update({'_id': monk.id(job._id)}, {'$set': {'status': 'running'}})
            resolve(jobInfo);
        })
        .catch(err => {
            console.log('failed to update job status', job);
        });
    })
}

successJob = (job, code) => {
    console.log('job exec success', job);
    jobs_db.update({'_id': monk.id(job._id)}, {'$set': {'exitCode': code, 'status': 'over'}}).catch(err => {
        console.log('failed to update job status', job);
    })
}

failJob = (job) => {
    console.log('failed to execute job', job);
    jobs_db.update({'_id': monk.id(job._id)}, {'$set': {'exitCode': -1, 'status': 'failed'}}).catch(err => {
        console.log('failed to update job status', job);
    })
}

function consumer(conn) {
    var ok = conn.createChannel(on_open);
    function on_open(err, ch) {
      if (err != null) bail(err);
      console.log('connected to queue hero');
      ch.assertQueue(heroQueue);
      ch.consume(heroQueue, function(msg) {
        if (msg !== null) {
            let content = JSON.parse(msg.content.toString());
            console.log('new job request', content._id);
            runJob(content).then(job => {
                console.log('run the job ', content._id);
                let cmdFileId = crypto.randomBytes(10).toString('hex');
                let cmdFile = '/tmp/' + cmdFileId + '.sh';
                fs.writeFile('/tmp/' + cmdFile + '.sh', job.cmd, (err) => {
                    if (err) {
                        fs.unlinkSync(cmdFile);
                        failJob(content);
                        ch.ack(msg);
                    };
                    const cmd = spawn('bash', [cmdFile]);
                    cmd.stdout.on('data', (data) => {
                        console.log(`stdout: ${data}`);
                    });
                    
                    cmd.stderr.on('data', (data) => {
                        console.log(`stderr: ${data}`);
                    });
                    
                    cmd.on('close', (code) => {
                        successJob(content, code);
                        fs.unlinkSync(cmdFile);
                        console.log('job over', content._id, 'code', code);
                        ch.ack(msg);
                    })
                    
                });
              }).catch(err => {
                  console.log('error, could not execute job', err);
                  ch.ack(msg);
              })
            
        } else {
            ch.ack(msg);
        }
      }, {noAck: false});
    }
  }
  

program
  .command('run') 
  .description('start slave') 
  .option('-r, --rabbit [value]', 'RabbitMQ connection url', null)
  .option('-m, --mongo [value]', 'MongoDB connection url', null)

  .action(function (args) {
    let rabbit = null;
    if(process.env.RABBIT_URL) {
        rabbit = process.env.RABBIT_URL;
    }
    if(args.rabbit) {
        rabbit = args.rabbit;
    }
    if(args.mongo) {
        mongoUrl = args.mongo
    }
    db = monk(mongoUrl);
    jobs_db = db.get('jobs');
    amqp.connect(rabbit, function(err, conn) {
        if (err != null) bail(err);
        consumer(conn);
    });
  });

  program.parse(process.argv);
