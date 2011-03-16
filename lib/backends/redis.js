var redis = require('redis');
var idol = require('../idol');

function RedisBackend(client) {
  this.client = client;
  this.subClient = redis.createClient(client.port, client.host);
  this.subClient.select(client.currDB);
}
module.exports = RedisBackend;

// Tell idol how to initialize this.
RedisBackend.idolKey = 'redis';

var kinds = {
  object: require("./redis/object")
};

RedisBackend.prototype = {
  // Returns the constructor for this kind.
  kindConstructor: function(kind) {
    //console.log("redis: look for " + (kind || 'object') + " constructor");
    return kinds[kind || 'object'];
  }
}
