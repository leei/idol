var redis = require('redis');
var idol = require('../idol');

function RedisBackend(client) {
  this.client = client;
  this.subClient = redis.createClient(client.port, client.host);
  this.subClient.select(client.currDB);
}

RedisBackend.prototype = {
}

// Tell idol how to initialize this.
RedisBackend.idolKey = 'redis';

module.exports = RedisBackend;
