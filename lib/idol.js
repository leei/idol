var sys = require('sys'), util = require('util');
var EventEmitter = require('events').EventEmitter;

function Idol() {
  this.idolInit();
}

Idol.define = function define() {
  var name, cb;

  var args = Array.prototype.slice.call(arguments);
  //console.log("define: args = " + sys.inspect(args));
  switch (typeof args[0]) {
  case 'function':
    cb = args.shift();
    //console.log("define: cb = " + cb);
    break;
  case 'string':
    name = args.shift();
    //console.log("define: name = " + name);
    break;
  }

  // Configure this with the remaining object
  var config = args.shift() || {};
  //console.log("define: config = " + sys.inspect(config));
  var super = config.super || Idol;

  // Define constructor if name was set.
  function _name_() {
    super.call(this, arguments);
    if (cb) { cb.call(this, arguments); }
  }
  if (cb) {
    name = cb.name;
  }
  console.log("define " + name + ": super = " + super);

  var ctor_str = _name_.toString().replace(/_name_/, name);
  eval(ctor_str);
  //console.log("define: ctor_str = " + ctor_str);
  ctor = eval(name);
  console.log("define: ctor = " + ctor);

  Idol.init_constructor.call(ctor, config);

  return ctor;
};

Idol.init_constructor = function(config) {
  console.log("Idol.init_constructor(" + this.name + "): " + sys.inspect(config));
  var super = config.super || Idol;
  Object.defineProperty(this, 'super', {
    enumerable: true,
    value: super
  });
  //console.log("Idol.init_constructor: super = " + super);
  for (var prop in super) {
    //console.log("Copy super." + prop);
    this[prop] = super[prop];
  }
  // Start by inheriting from...
  util.inherits(this, super);

  // Inherited values can be redefined for this constructor.
  this.prototype.inherited = Object.create(this.super.prototype.inherited);
};

Idol.isIdolConstructor = function() {
  return true;
}

Idol.defineProperty = function(name, desc) {
  var holder = this.prototype[desc.inherited ? 'inherited' : 'common'];
  Object.defineProperty(this, name, {
    enumerable: true,
    get: function() { return holder[name]; },
    set: function(v) { return holder[name] = v; }
  });
  if (desc.value) { this[name] = desc.value; }
}

Idol.addProtos = function(protos) {
  for (var p in protos) {
    this.prototype[p] = protos[p];
  }
}

Idol.prototype = Object.create(EventEmitter.prototype);
Idol.addProtos({
  common: {},
  inherited: {},

  idolInit: function() {
    //console.log("called idolInit: " + sys.inspect(this));
    EventEmitter.call(this);
  },

  isIdol: function() {
    return true;
  }
});

// Allow for the definition of a variety of backends
Idol.backends = {};
Idol.addBackend = function(name, ctor) {
  console.log("Idol: Add backend " + name + " => " + ctor.name);
  Idol.backends[name] = ctor;
}

// No automatically insert all backends in ./backends
var fs = require('fs');
fs.readdir(__dirname + "/backends", function (err, files) {
  if (err) {
    console.log("No backends: " + err);
  } else {
    for (var i in files) {
      var ctor = require(__dirname + "/backends/" + files[i]);
      if (typeof ctor === 'function' && ctor.idolKey) {
        Idol.addBackend(ctor.idolKey, ctor);
      } else {
        console.log("No backend in " + files[i]);
      }
    }
  }
});

exports.Idol = Idol;