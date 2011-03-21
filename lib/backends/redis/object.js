var Idol = require("../../idol").Idol, Redis = require("../redis");

var mixin = require('../../mixin');
var sys = require('sys');

function RedisObject(inits) {
  if (! inits) { inits = {}; }
  //console.log("new redis object: " + this.constructor.name + ": inits " + sys.inspect(inits));

  // Initialize attributes
  var attribute_descrs = this.constructor.attributes;
  //console.log("new " + this.constructor.name + ": descr " + sys.inspect(attribute_descrs));
  this.attributes = {};
  for (var a in attribute_descrs) {
    this.attributes[a] = inits[a] || attribute_descrs[a].default;
    //console.log(" -- init " + a + " <= " + this.attributes[a]);
  }
}

RedisObject.prototype = {
  updateAttribute: function(a, v, callback) {
    var attrs = {};
    attrs[a] = v;
    this.updateAttributes(attrs, callback);
  },

  updateAttributes: function(attrs, callback) {
    var obj = this;
    this.withId(function (err) {
      if (err) {
        if (callback) { callback(err); }
      } else {
        var multi = obj.multi();
        for (var a in attrs) {
          var prev = obj.attributes[a], v = attrs[a];
          obj.attributes[a] = v;
          obj.emit('attribute', a, v, prev, multi);
          multi = multi.hset(obj.redisKey, a, JSON.stringify(v));
        }
        multi.publish('attributes', JSON.stringify(attrs));
        multi.exec(function (err, results) {
          if (false) {
            for (var i = 1; i < multi.queue.length; ++i) {
              console.log("redis multi: " + multi.queue[i].join(" ") + " => " + results[i-1]);
            }
          }
          if (callback) { callback(err, obj); }
        });
      }
    });
  },

  readAttributes: function(callback) {
    var obj = this;
    this.redis.hgetall(this.redisKey, function(err, hash) {
      //console.log(obj.toString() + ".readAttributes " + (err ? err : sys.inspect(hash)));
      for (var a in hash) {
        obj.attributes[a] = hash[a] = JSON.parse(hash[a]);
      }
      obj.emit('loaded', hash);
      if (callback) { callback(err, hash); }
    });
  },

  save: function(callback) {
    var obj = this;
    this.withId(function (err) {
      if (! err) {
        obj.updateAttributes(obj.attributes, callback);
        obj.emit('save');
      }
    });
  },

  isNewRecord: function() {
    return ! this.id;
  },

  toString: function() {
    var str = "#<" + this.constructor.name + ":" + this.id;
    var descrs = this.constructor.attributes;
    for (var a in descrs) {
      str += " " + a + "=" + this.attributes[a];
    }
    return str + ">";
  }
}

RedisObject.included = function(ctor) {
  mixin(ctor, Redis.Common);

  ctor.attributes = {};

  var config = ctor.config;
  for (var a in config.attributes) {
    ctor.defineAttribute(a, config.attributes[a]);
  }
}

RedisObject.defineAttribute = function(name, descr) {
  var write_once = descr.write_once;

  // Remember the description
  this.attributes[name] = descr;

  // Define the property.
  Object.defineProperty(this.prototype, name, {
    enumerable: true,
    get: function() { return this.attributes[name]; },
    set: function(v) {
      if (this.id) {
        this.updateAttribute(name, v);
      } else {
        this.attributes[name] = v;
      }
      if (write_once) {
        Object.defineProperty(this.prototype, name, {
          enumerable: true, value: v
        });
      }
    }
  });
}

RedisObject.attribute = function(name) {
}

RedisObject.load = function(id, callback) {
  var obj = new this();
  obj.id = id;
  obj.readAttributes(function (err, hash) {
    if (callback) { callback(err, obj); }
  });
}

module.exports = RedisObject;
