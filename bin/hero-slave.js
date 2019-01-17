console.log('not yet implemented');
var fs = require('fs');
var amqp = require('amqplib/callback_api');
var Promise = require('promise')
const { spawn } = require('child_process');

let mongoUrl = 'localhost:27017/hero';
if(process.env.MONGO) {
    mongoUrl = 'mongo:27017/hero';
}

var monk = require('monk');
var db = monk(mongoUrl);
var jobs_db = db.get('jobs');

function bail(err) {
    console.error(err);
    process.exit(1);
}

const heroQueue = 'hero';

runJob = (job) => {
    return new Promise(function(resolve, reject) {
 
        jobs_db.update({'_id': monk.id(job._id)}, {'$set': {'status': 'running'}})
        .then(res => {
            resolve();
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
            runJob(content).then(() => {
                console.log('run the job ', content._id);
                fs.writeFile('/tmp/cmd.sh', content.cmd, (err) => {
                    if (err) {
                        failJob(content);
                        ch.ack(msg);
                    };
                    const cmd = spawn('bash', ['/tmp/cmd.sh']);
                    cmd.stdout.on('data', (data) => {
                        console.log(`stdout: ${data}`);
                    });
                    
                    cmd.stderr.on('data', (data) => {
                        console.log(`stderr: ${data}`);
                    });
                    
                    cmd.on('close', (code) => {
                        successJob(content, code)
                        console.log('job over', content._id, 'code', code);
                        ch.ack(msg)
                    })
                    
                });
              })
            
        } else {
            ch.ack(msg);
        }
      }, {noAck: false});
    }
  }
  
amqp.connect(process.env.RABBIT_URL, function(err, conn) {
      if (err != null) bail(err);
      consumer(conn);
});