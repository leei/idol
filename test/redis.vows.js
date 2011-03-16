var vows = require('vows'), assert = require('assert');
var sys = require('sys');
var redis = require('redis');

var client = redis.createClient();
client.select(6);
client.flushdb();

var Idol = require("../lib/idol").Idol;

var suite = vows.describe('idol redis');

suite.addBatch({
  'a redis idol class': {
    topic: function() {
      return Idol.define('Class', { backend_type: 'redis', redis: client });
    },

    'is an idol constructor': function(ctor) {
      assert.isTrue(ctor.isIdolConstructor());
    },

    'is not instantiable': function(ctor) {
      assert.throws(function () { new ctor(); }, "Class has no kind.");
    },

    'with object kind': {
      topic: function(ctor) {
        return ctor.define('Obj', { kind: 'object' });
      },

      'is instantiable': function(ctor) {
        assert.doesNotThrow(function () { new ctor(); }, "Class has no kind.");
      }
    },

    teardown: function() {
      client.flushdb();
    }
  }
});

suite.export(module);
