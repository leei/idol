var vows = require('vows'), assert = require('assert');
var sys = require('sys');
var redis = require('redis');

var Idol = require("../lib/idol.js").Idol;

//var client = redis.createClient();
//client.select(6);
//sys.log("Default redis = " + sys.inspect(client));
//client.flushdb();

var suite = vows.describe('idol');

var basic_tests = {
  'knows its class name': function (klass) {
    assert.equal(klass.name, 'Class');
  },

  'inherits from Idol': function (klass) {
    assert.includes(klass.includes, Idol);
  },

  'is an idol constructor': function (klass) {
    assert.isTrue(klass.isIdolConstructor());
  },

  'cannot be initialized': function(klass) {
    assert.throws(function () { new klass() }, "cannot be initialized");
  }
};

suite.addBatch((function(topics) {
  var batch = {};
  for (var how in topics) {
    var tests = {};
    // Copy all basic tests.
    for (var test in basic_tests) {
      tests[test] = basic_tests[test];
    }
    // Add all new tests
    for (test in topics[how]) {
      tests[test] = topics[how][test];
    }
    // Define the batch
    batch['a basic idol class defined by ' + how] = tests;
  }
  return batch;
})({
  name: {
    topic: function() { return Idol.define('Class'); }
  },
  constructor: {
    topic: function() {
      function Class() { this.called = true; }
      return Idol.define(Class);
    }
  }
}));

suite.export(module);
