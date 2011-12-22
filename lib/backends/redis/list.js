var Idol = require("../../idol").Idol;

function RedisList() {
  //console.log("instantiating redis list");
}

RedisList.prototype = {
};

var cmds = {
  lpush: { add: true, alias: 'unshift' },
  lpushx: { add: true },
  rpush: { add: true, alias: 'push', encode: 0 },
  rpushx: { add: true, encode: 0 },
  length: { redis: 'llen' },
  lpop: { remove: true, alias: 'shift', decode: 0 },
  rpop: { remove: true, alias: 'pop', decode: 0 },
  lset: { alias: 'set', encode: 1 },
  lrem: { alias: 'remove', encode: 1 },
  lindex: { alias: 'get', decode: 0 },
  linsert: { alias: 'insert', encode: 2 }
};

var util = require('util');
function define_op(name, descr) {
  //console.log("RedisList: define " + name + " " + util.inspect(descr));
  var f = RedisList.prototype[name] = function() {
    var list = this;
    var args = Array.prototype.slice.call(arguments);
    list.withId(function (err) {
      if (err) {
        if (callback) { callback(err); }
      } else {
        if (descr.encode) {
          console.log("encode " + descr.encode);
          args[descr.encode] = JSON.stringify(args[descr.decode]);
        }
        if (typeof args[args.length-1] === 'function' && descr.decode) {
          var callback = args.pop();
          args.push(function() {
            var args = Array.prototype.slice.call(arguments);
            args[descr.decode] = JSON.parse(args[descr.decode]);
            callback.apply(null, args);
          });
        }
        args.unshift(list.redisKey);
        //console.log("" + list +"." + (descr.redis || name) + "(" + args.join(", ") + ")");
        list.redis[descr.redis || name].apply(list.redis, args);
      }
    });
  };
  if (descr.alias) {
    //console.log("RedisList: aliasing " + descr.alias + " => " + name);
    RedisList.prototype[descr.alias] = f;
  }
}

for (var name in cmds) {
  define_op(name, cmds[name]);
}

module.exports = RedisList;
