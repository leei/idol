var sys = require('sys');

function mixin(base, mixin) {
  var ctor = base;
  if (base.constructors) {
    // Don't mixin the same constructor twice.
    for (var i in base.constructors) {
      if (base.constructors[i] === mixin)
        return base;
    }
    // Remember this new one.
    base.constructors.unshift(mixin);
  } else {
    // Remember all mixed in classes
    base.constructors = [mixin, base];
    // Create a function with the same name, that calls both functions...
    ctor = base.prototype.constructor = mixin_constructor(base.name, base);
    ctor.__proto__ = base;
  }

  // Inject the mixin prototype at the top of the chain
  ctor.prototype = insert_proto(base.prototype, mixin.prototype);
  //inspect_protos(ctor.prototype, "ctor.prototype");

  insert_proto(ctor.__proto__, mixin);
  //inspect_protos(ctor, "ctor");

  // Inform mixin that it has been included
  if (mixin.hasOwnProperty('included')) {
    var incl = mixin.included.call(mixin, ctor);
    if (incl) { ctor = incl; }
  }

  return ctor;
}

function mixin_constructor(name, ctor) {
  var str = "function __ctor() { var c = ctor.constructors; for (var i in c) { c[i].apply(this, arguments); } }";
  eval(str.replace(/__ctor/, name));
  return eval(name);
}

function insert_proto(base, mixin) {
  //inspect_protos(base,  "inserting: base ");
  //inspect_protos(mixin, "inserting: mixin");
  var copy = copyInto({}, mixin);
  copy.__mixed_in = true;
  // Find
  for (var p = base, prev = base; p.__mixed_in; prev = p, p = p.__proto__) {}
  if (p == base) { p.__mixed_in = true; } // Mark this as mixed in
  //inspect_protos(copy, "inserting: copy");
  copy.__proto__ = prev.__proto__;
  prev.__proto__ = copy;
  //inspect_protos(base, "inserted: base");
  return base;
}

function copyInto(copy, obj) {
  var names = Object.getOwnPropertyNames(obj);
  for (var i in names) {
    var p = names[i];
    if (p !== 'prototype') {
      var descr = Object.getOwnPropertyDescriptor(obj, p);
      //console.log("obj." + p + " = " + sys.inspect(descr));
      Object.defineProperty(copy, p, descr);
    }
  }
  return copy;
}
mixin.copyInto = copyInto;

function inspect_protos(obj, name) {
  console.log(name + " = " + sys.inspect(obj));
  var i = 0;
  while (obj.__proto__) {
    obj = obj.__proto__;
    console.log("  __proto__[" + i + "] = " + sys.inspect(obj));
    ++i;
  }
}

module.exports = mixin;

function Base() {
}

function A() {
}
A.prototype.a = function a() {}

function B() {
}
B.prototype.b = function b() {}

Base = mixin(Base, A);
Base = mixin(Base, B);


