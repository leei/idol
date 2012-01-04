var mixin = require("mixin"),
    util = require("util"),
    async = require("async");

/**
 * This mixin will ensure that validations are successful before attributes
 * are updated to the REDIS store.
 */
function Validate() {
}

/*
 * When validate is called, it will call the callback with true or false
 * depending on whether the object is considered valid. This defaults to
 * simply clear the error and then callback true.
 */
function validateMethod(attrs, callback) {
  var obj = this, ctor = this.constructor;
  obj.errors = [];
  //console.log("validate: " + obj + " => " + util.inspect(attrs));
  async.every(ctor.validations,
              function (validation, cb) { validation.call(obj, attrs, cb); },
              callback);
}

Validate.prototype = {
};

/*
 * Create a function to validate a particular attribute.
 */
function validateAttr(name, validation) {
  // Handle a pure regular expression.
  if (validation['test']) {
    var regexp = validation;
    validation = function (val, cb) { cb(regexp.test(val)); };
  }
  //console.log("validate: '" + name + "' => " + validation);

  // Call the validation if the named attribute appears in the attrs provided.
  return function (attrs, cb) {
    if (attrs.hasOwnProperty(name)) {
      //console.log("validate: '" + name + "' vs. " + util.inspect(attrs));
      validation.call(this, attrs[name], cb);
    } else {
      cb(true);
    }
  };
}

Validate.included = function(base) {
  //console.warn("Include Validate in " + base.name);

  var validations = base.validations = [];
  if (base.config.validate) {
    //console.log("validate: " + base.name + "#validate = " + base.config.validate);
    validations.push(base.config.validate);
  }

  // Override user's validate with this one...
  mixin.alias(base.prototype, "validate", "validations", validateMethod);

  // Look for attribute-specific validations.
  var attributes = base.attributes;
  for (var name in attributes) {
    var attr = attributes[name];
    if (attr.validate) {
      //console.log("validate: " + base.name + " validate on '" + name + "'");
      validations.push(validateAttr(name, attr.validate));
    }
  }
}

module.exports = Validate;

function setupIndex(name, config, decl) {
  return function () {
    var obj = this;
    console.warn("idol: setup index " + name + " for " + util.inspect(obj));
    debugger;
    obj.
      on('save', function () {
        var val = obj.attributes[name];
        console.warn("idol: save index " + obj.id + "." + name + " = " + util.inspect(val));
      }).
      on('attribute', function (attr, val, prev, multi) {
        if (attr === name) {
          console.warn("idol: update index " + obj.id + "." + name + ": " + util.inspect(prev) + " => " + util.inspect(val));
        }
      });
    true;
  };
}

