var util = require('util');
var EventEmitter = require('events').EventEmitter;
var mixin = require('mixin');

function Idol() {
  this.idolInit();
}

Idol.define = function define() {
  var args = Array.prototype.slice.call(arguments);
  //console.log("define: args = " + util.inspect(args));
  var ctor_or_name = args.shift();

  var name, ctor;
  switch (typeof ctor_or_name) {
  case 'function':
    ctor = ctor_or_name;
    name = ctor.name;
    //console.log("define: cb = " + cb);
    break;
  case 'string':
    name = ctor_or_name;
    //console.log("define: name = " + name);

    // Construct a constructor function for this Idol class.
    // - 1. Substitute the proper name into our function
    function _name_() {}
    var ctor_str = _name_.toString().replace(/_name_/, name);
    // - 2. Eval it and thus define a function with the correct name
    eval(ctor_str);
    //console.log("define: ctor_str = " + ctor_str);
    // - 3. Eval that name so as to extract the function object.
    ctor = eval(name);
    //console.log("define: ctor = " + ctor);
    break;
  default:
    throw("First argument must be constructor function or name");
    break;
  }

  // Configure this with the remaining object
  var config = args.shift() || {};
  ctor.config = config;

  // By doing this, we allow derived ctors (i.e. this) to pass down config values.
  ctor = mixin(ctor, this);

  // Ensure that Idol does get included, even if this ctor is used as a mixin.
  if (! ctor.hasOwnProperty("included")) {
    ctor.included = function(base) {
      //console.log(this.name + ".included(" + base.name + "): mixin Idol.");
      return mixin(base, Idol);
    };
  }

  // Inherited values can be redefined for this constructor.
  ctor.prototype.inherited = Object.create(this.prototype.inherited);

  // Save the configuration values
  for (var p in config) {
    //console.log(ctor.name + "." + p + " <= " + config[p]);
    ctor[p] = config[p];
  }

  return ctor;
};

// Copy all enumerable properties from src to dst
Idol.copyProperties = function(src, dst) {
  //console.log("copyProperties " + src + " => " + dst);
  for (var prop in src) {
    var descr = Object.getOwnPropertyDescriptor(src, prop);
    //console.log("Copy " + src + "." + prop + " = " + util.inspect(descr));
    Object.defineProperty(dst, prop, descr);
  }
};

Idol.included = function(ctor) {

  var config = ctor.config || {};
  //console.log(this.name + ".included(" + ctor.name + ")" );

  // Initialize a backend instance if we must
  var backend_type = config.backend_type;
  //console.log(ctor.name + ".backend_type = " + backend_type);
  if ( backend_type && config[backend_type]) {
    //console.log(ctor.name + ".backend = " + config[backend_type]);
    var klass = Idol.backends[backend_type]; // Find the class to instantiate.
    if (! klass) { throw("unrecognized backend: " + backend_type); }
    //console.log(ctor.name + ": initialize " + backend_type + " instance");
    ctor.backend = new klass(config[backend_type]);
  }

  var mixin_names = [];
  for (var m in ctor.constructors) {
    mixin_names.push(ctor.constructors[m].name);
  }
  //console.log(ctor.name + ".mixins = [" + mixin_names.join(", ") + "]");
  return ctor;
};

Idol.ifInstantiable = function(name, val) {
  //console.log(this.name + ".ifInstantiable: backend = " + this.backend);
  //console.log(this.name + ".ifInstantiable: kind    = " + this.kind);

  if (this.backend && this.kind) {
    // Now mixin the kindConstructor
    //console.log(this.name + ": kind " + this.backend_type + "/" + this.kind);

    var kind_ctor = this.backend.kindConstructor(this.kind);
    //console.log(this.name + ": mixin kind " + kind_ctor.name);
    mixin(this, kind_ctor);

    // Also, instantiable Idol ctors are EventEmitters
    mixin(this, EventEmitter);
  }
}

Idol.isIdolConstructor = function() {
  return true;
}

Idol.sharedProperty = function(name, desc, cb) {
  var which = desc.inherited ? 'inherited' : 'common';
  var holder = this.prototype[which];
  //console.log("sharedProperty[" + which + "] " + this.name + "." + name);
  Object.defineProperty(this, name, {
    enumerable: true,
    get: function() { return holder[name]; },
    set: function(v) {
      //console.log(this.name + " property[" + name + "] <= " + v);
      holder[name] = v;
      if (cb) { cb.call(this, name, v); }
      return v;
    }
  });
  Object.defineProperty(this.prototype, name, {
    enumerable: true,
    get: function() { return holder[name]; }
  });
  if (desc.value) { this[name] = desc.value; }
}

Idol.addProtos = function(protos) {
  for (var p in protos) {
    this.prototype[p] = protos[p];
  }
}

Idol.prototype = {
  common: {},
  inherited: {},

  idolInit: function() {
    //console.log(this.constructor.name + ".idolInit()");

    // Only instantiable with a backend.
    if (! this.backend) { throw this.constructor.name + " has no backend."; }
    if (! this.kind) { throw this.constructor.name + " has no kind."; }
  },

  isIdol: function() {
    return true;
  }
};

// Every instantiable Idol class needs a backend
Idol.sharedProperty('backend', { inherited: true }, Idol.ifInstantiable);
Idol.sharedProperty('kind', { inherited: true }, Idol.ifInstantiable);

// Allow for the definition of a variety of backends
Idol.backends = {};
Idol.addBackend = function(name, ctor) {
  //console.log("Idol: Add backend " + name + " => " + ctor.name);
  Idol.backends[name] = ctor;
}

// Automatically load all backends in ./backends
var fs = require('fs');
fs.readdir(__dirname + "/backends", function (err, files) {
  if (err) {
    console.log("No backends: " + err);
  } else {
    for (var i in files) {
      if (files[i].match(/.js$/)) {
        var ctor = require(__dirname + "/backends/" + files[i]);
        if (typeof ctor === 'function' && ctor.idolKey) {
          Idol.addBackend(ctor.idolKey, ctor);
        } else {
          console.log("No backend in " + files[i]);
        }
      }
    }
  }
});

exports.Idol = Idol;