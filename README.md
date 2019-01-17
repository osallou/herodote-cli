# Herodote-cli

## About

## Install

    npm install

## Development

    NODE_ENV=development SECRET=123 RABBIT_URL=amqp://guest:guest@localhost:5672/%2F node node_modules/nodemon/bin/nodemon bin/hero-master

## Production

    SECRET=XXX RABBIT_URL=YYY node bin/hero-master
