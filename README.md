# Herodote-cli

## About

Herodote-cli setup a server to handle some job requests from an Herodote server with web hooks.
It is composed of a server handling web hooks, and slaves that execute the jobs.

Needs NodeJS, Swift python client and Docker installed (master and slaves).

## Status

In development

## License

Apache 2.0

## Credits

2019, Olivier Sallou, IRISA

## Install

    npm install

## Development

    NODE_ENV=development SECRET=123 RABBIT_URL=amqp://guest:guest@localhost:5672/%2F node node_modules/nodemon/bin/nodemon bin/hero-master
    NODE_ENV=development SECRET=123 RABBIT_URL=amqp://guest:guest@localhost:5672/%2F node node_modules/nodemon/bin/nodemon bin/hero-slave

## Production

    SECRET=XXX RABBIT_URL=YYY node bin/hero-master
    SECRET=XXX RABBIT_URL=YYY node bin/hero-slave
