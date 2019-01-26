# Herodote-cli

## About

Herodote-cli setup a server to handle some job requests from an [Herodote](https://github.com/osallou/herodote) server with web hooks.
It is composed of a server handling web hooks, and slaves that execute the jobs.

Herodote server will send a request to your server on data modification with the details of the command to execute. Data will be fetched from Openstack Swift, command executed and results pushed back to Swift.

Jobs are dispatched among slaves.

The secret provided at init is used to create JWT tokens used to authorize the requests. Keep this secret **private**. In case of compromission, restart the master using a different secret, invalid token requests will be rejected.

## Requirements

NodeJS and Docker installed on master and NodeJS and Swift python client on slaves.

## Status

Still in beta

## License

Apache 2.0

## Credits

2019, Olivier Sallou, IRISA

## Install

    npm install -g @osallou/herodote-cli


## Setup

    hero-cli init

*init* will explain what should be done after that. A *docker-compose.yml*  and *.env* file will be generated to start necessary components (mongo and rabbitmq). You may use local installs of those components, in this case simply update URLs/credentials on master and slave commands to match your install.

On Openstack, *init* will try to auto-detect private and public IP addresses. In case of failure, simply update .env file and master/slave commands.

## Development

Start a mongo and rabbitmq server locally (on host or docker exposing ports) and update rabbitmq credentials in command.

Install npm nodemon for autorestart on file change.

    NODE_ENV=development node node_modules/nodemon/bin/nodemon bin/hero-master --mongo localhost:27017/hero --rabbit amqp://login:password@host:3672/%2F --secret XXX

    NODE_ENV=development node node_modules/nodemon/bin/nodemon bin/hero-slave --mongo localhost:27017/hero --rabbit amqp://login:password@host:3672/%2F

## Production

    node bin/hero-master --mongo localhost:27017/hero --rabbit amqp://login:password@host:3672/%2F --secret XXXX
    node bin/hero-slave --mongo localhost:27017/hero --rabbit amqp://login:password@host:3672/%2F

## hero-cli

*hero-cli* is used at init, but it also gives information on jobs (listing, details). See -h for help.

    node bin/hero-cli -h
