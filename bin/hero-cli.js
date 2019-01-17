const program = require('commander')
var crypto = require('crypto');
var winston = require('winston');
var fs = require('fs');
var axios = require('axios');
const myconsole = new (winston.transports.Console)({
  timestamp: true,
  level: 'info'
})
winston.loggers.add('herodote', {
  transports: [myconsole]
})

let mongoUrl = 'localhost:27017/hero';
var monk = require('monk');
var db = monk(mongoUrl);
var jobs_db = db.get('jobs');


const logger = winston.loggers.get('herodote');

const composeTpl = function() {
    return `version: '3'

services:
  mongo:
    image: mongo
    volumes:
      - \${PWD}/mongo:/data/db

  rabbitmq:
    image: rabbitmq
    hostname: herodote-rabbitmq
    ports:
      - "5672:5672"
    environment:
      - RABBITMQ_DEFAULT_USER=herodote
      - RABBITMQ_DEFAULT_PASS=\${RABBITMQ_PASSWORD}

  hero-master:
    image: osallou/hero
    environment:
      - MONGO=mongo:27017/hero
      - RABBIT_URL=amqp://herodote:\${RABBITMQ_PASSWORD}@localhost:5672/%2F
      - SECRET=\${SECRET}
`
}

const info = function(data) {
    return `
docker-compose.yml and .env files generated!

To receive compute requests from Herodote, go to the Herodote server and create a project (if not already done).
Then create a hook with executor "webhook", and add as extra parameters:

* url=https://PUBLIC/job
* secret=SECRET

To start master run:
    docker-compose up -d

To start a slave, on a slave host, run the following:
    hero-cli slave --secret SECRET --ip IP --rabbit amqp://herodote:RABBIT@IP:5672/%2F
    `.replace('SECRET', data.secret)
    .replace('RABBIT', data.rabbit)
    .replace(/IP/g, data.ip)
    .replace('PUBLIC', data.public)
}

const getMetaData= function(meta) {
    return new Promise(function(resolve, reject) {
        axios.get('http://169.254.169.254/latest/meta-data/' + meta).then(resp => {
            resolve(resp.data)
        }).catch(err => {
            logger.error('failed to fetch metadata from openstack');
            process.exit(1);
        })
    });
}

function writeCompose() {
    return new Promise(function(resolve, reject) {
        fs.writeFile('docker-compose.yml', composeTpl(), (err) => {
            if (err) throw err;
            resolve(true);
          });
    });
}


function writeEnv(envdata) {
    return new Promise(function(resolve, reject) {
        fs.writeFile('.env', envdata, (err) => {
            if (err) throw err;
            resolve(true);
          });
    });
}

program
  .command('init') // sub-command name
  .description('Initialize herodote client') // command description
  .option('-s, --secret [value]', 'secret to use', null)
  .action(function (args) {
    let secret = crypto.randomBytes(20).toString('hex');
    let rabbitmqPwd = crypto.randomBytes(10).toString('hex');
    if(args.secret) {
        secret = args.secret
    }
    let meta = {}
    envFile = "RABBITMQ_PASSWORD=" + rabbitmqPwd + "\n";
    envFile += "SECRET=" + secret + "\n";
    writeCompose().then( res => {
        return writeEnv(envFile)
    })
    .then(res => {
        return getMetaData('local-ipv4')
    })
    .then(res => {
        meta.privateIp = res;
        return getMetaData('public-ipv4')
    })
    .then(res => {
        meta.publicIp = res;
        if(meta.publicIp=="") {
            logger.warn('Could not find a public IP address, replace the Herodote URL with the publicly address of this server');
            meta.publicIp = 'public_ip_address_of_server';
        }
        console.log(info({
            secret: secret,
            ip: meta.privateIp,
            public: meta.publicIp,
            rabbit: rabbitmqPwd
        }));
        process.exit(0);
    }) 
  });

program
  .command('jobs') // sub-command name
  .description('Get jobs info') // command description
  .option('-i, --id [value]', 'job id', null)
  .action(function (args) {
    filter = {}
    if(args.id) {
        filter = {'_id': monk.id(args.id)}
    }
    jobs_db.find(filter).then(jobs => {
        results = []
        for(let i=0;i<jobs.length;i++) {
            let job = jobs[i];
            if(job.exitCode === undefined) {
                job.exitCode = -1
            }
            if(job.status === undefined) {
                job.status = "unknown"
            }
            results.push({'id': job._id, 'exitCode': job.exitCode, 'status': job.status});
        }
        console.table(results);
        process.exit(0);

    }).catch(err => {console.log('error',err); process.exit(1)});
  });

  program.parse(process.argv);