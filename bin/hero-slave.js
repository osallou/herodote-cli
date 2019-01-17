console.log('not yet implemented');

var amqp = require('amqplib/callback_api');

function bail(err) {
    console.error(err);
    process.exit(1);
}

const heroQueue = 'hero';

function consumer(conn) {
    var ok = conn.createChannel(on_open);
    function on_open(err, ch) {
      if (err != null) bail(err);
      console.log('connected to queue hero');
      ch.assertQueue(heroQueue);
      ch.consume(heroQueue, function(msg) {
        if (msg !== null) {
            let content = JSON.parse(msg.content.toString());
            console.log('new job request', content);
            ch.ack(msg);
            
        } else {
            ch.ack(msg);
        }
      });
    }
  }
  
amqp.connect(process.env.RABBIT_URL, function(err, conn) {
      if (err != null) bail(err);
      consumer(conn);
});