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
  object: require("./redis/object"),
  list: require("./redis/list")
};

RedisBackend.prototype = {
  // Returns the constructor for this kind.
  kindConstructor: function(kind) {
    //console.log("redis: look for " + (kind || 'object') + " constructor");
    return kinds[kind || 'object'];
  }
}

function RedisCommon() {
  this.redis = this.backend.client;
}

Object.defineProperty(RedisCommon, "redisPrefix", {
  enumerable: false,
  get: function() { return undefined; },
  set: function(v) {
    //console.log(this.name + ".redisPrefix <= " + v);
    Object.defineProperty(this, "redisPrefix", {
      enumerable: false, value: v
    })
  }
});

RedisCommon.included = function(ctor) {
  if (! ctor.redisPrefix) {
    ctor.redisPrefix = ctor.name;
  }
}

RedisCommon.prototype = {
  generateId: function(callback) {
    if (this._generating) {
      if (callback) { this.on("id", callback); }
    } else {
      var that = this;
      this._generating = true;
      this.redis.incr(this.redisPrefix, function(err, next_id) {
        if (! err) {
          //console.log("RedisCommon#generateId: " + next_id);
          delete that._generating;
          that.id = next_id;
          that.emit("new id", next_id);
        }
        if (callback) { callback(err, next_id); }
      });
    }
  },

  withId: function(callback) {
    if (this.id) {
      callback();
    } else {
      this.generateId(callback);
    }
  },

  multi: function() {
    return this.redis.multi();
  },

  destroy: function(callback) {
    var that = this;
    this.emit('destroying');
    this.redis.del(this.redisKey, function (err, nkeys) {
      if (nkeys === 1) { that.emit('destroyed'); }
      if (callback) { callback(err, nkeys === 1); }
    });
  }
}

Object.defineProperty(RedisCommon.prototype, "id", {
  enumerable: false,
  get: function() { return undefined; },
  set: function(v) {
    Object.defineProperties(this, {
      id: {
        enumerable: true, configurable: false,
        value: v
      },
      redisKey: {
        enumerable: true, configurable: false,
        value: this.constructor.redisPrefix + ":" + v
      }
    });
    this.emit('id', v);
  }
});

Object.defineProperty(RedisCommon.prototype, "redisPrefix", {
  enumerable: false,
  get: function() { return this.constructor.redisPrefix; }
});

RedisBackend.Common = RedisCommon;
