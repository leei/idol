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

    'with a set of attributes': {
      topic: function(ctor) {
        return ctor.define('Obj', {
          kind: 'object',
          attributes: { a: {}, b: {default: true} }
        });
      },

      'can describe those attributes': function(ctor) {
        assert.deepEqual(ctor.attributes['a'], {});
        assert.deepEqual(ctor.attributes['b'], {default: true});
      },

      'when instantiated': {
        topic: function(ctor) {
          return new ctor({a: 1});
        },

        'sets given attributes': function(obj) {
          assert.equal(obj.a, 1);
        },

        'sets defaults if not given': function(obj) {
          assert.equal(obj.b, true);
        },

        'is not saved': function(obj) {
          assert.isTrue(obj.isNewRecord());
        },

        'and saved': {
          topic: function(obj) {
            obj.save(this.callback);
          },

          'returns success': function(err, obj) {
            //console.log("save success" + (err ? ": " + err : ""));
            assert.isTrue(! err);
            assert.isFalse(obj.isNewRecord());
          },

          'has a numeric ID': function(err, obj) {
            //console.log("save numeric" + (err ? ": " + err : ""));
            assert.isNumber(obj.id);
          },

          'and reloaded': {
            topic: function(obj, _, ctor) {
              //console.log("reload " + ctor.name + ":" + obj.id);
              ctor.load(obj.id, this.callback);
            },

            'has the same id': function(err, loaded) {
              var obj = this.context.topics[1];
              assert.equal(loaded.id, obj.id);
            },

            'has the same attributes': function(err, loaded) {
              var obj = this.context.topics[1];
              assert.deepEqual(obj.attributes, loaded.attributes);
            },

            'and destroyed': {
              topic: function(_, obj, _, ctor) {
                obj.destroy(this.callback);
              },

              'succeeds': function(err, success) {
                assert.isTrue(! err);
                assert.isTrue(success);
              }
            }
          }
        }
      }
    },

    teardown: function() {
      client.flushdb();
    }
  }
});

suite.addBatch({
  'a redis idol object class w/timestamp': {
    topic: function() {
      return Idol.define('Class', {
        backend_type: 'redis', redis: client,
        kind: 'object', timestamp: true });
    },

    'aliases updateAttributes': function(ctor) {
      assert.isFunction(ctor.prototype.updateAttributes_with_timestamp);
    },

    'when saved': {
      topic: function(ctor) {
        new ctor().save(this.callback);
      },

      'has a created_at timestamp': function(err, obj) {
        assert.isTrue(! err);
        assert.isNumber(obj.created_at);
      },

      'has an updated_at timestamp': function(err, obj) {
        assert.isTrue(! err);
        assert.isNumber(obj.updated_at);
      }
    }
  }
});

suite.addBatch({
  'a redis idol object class w/validations': {
    topic: function() {
      var Class = Idol.define('Class', {
        backend_type: 'redis', redis: client,
        kind: 'object',
        attributes: {
          a: { validate: function (val, cb) { cb(val > 0); } }
        },

        validate: function (attrs, cb) {
          this.validated = true;
          cb(true);
        }
      });

      return Class;
    },

    'when saved with a = 2': {
      topic: function(ctor) {
        new ctor({a: 2}).save(this.callback);
      },

      'succeeds': function(err, obj) {
        assert.isTrue(! err);
      },

      'calls validate': function (err, obj) {
        assert.isTrue(obj.validated);
      }
    },

    'when saved with a = -2': {
      topic: function(ctor) {
        new ctor({a: -2}).save(this.callback);
      },

      'fails': function(err, obj) {
        assert.isFalse(! err);
      },

      'calls validate': function (err, obj) {
        assert.isTrue(obj.validated);
      }
    }
  }
});

suite.addBatch({
  'a redis idol object class w/RegExp validation': {
    topic: function() {
      var Class = Idol.define('Class', {
        backend_type: 'redis', redis: client,
        kind: 'object',
        attributes: {
          a: { validate: /^[a-z]+$/i }
        }
      });

      return Class;
    },

    'when saved with a = abcDE': {
      topic: function(ctor) {
        new ctor({a: 'abcDE'}).save(this.callback);
      },

      'succeeds': function(err, obj) {
        assert.isTrue(! err);
      }
    },

    'when saved with a = abc123': {
      topic: function(ctor) {
        new ctor({a: 'abc123'}).save(this.callback);
      },

      'fails': function(err, obj) {
        assert.isFalse(! err);
      }
    }
  }
});

suite.addBatch({
  'a redis list object': {
    topic: function() {
      var List = Idol.define('List', {
        backend_type: 'redis', redis: client, kind: 'list' });
      return new List();
    },

    'answers to a host of redis functions': function(obj) {
      ['lpush', 'lpushx', 'lpop', 'rpush', 'rpushx', 'rpop'].forEach(function (name) {
        assert.isFunction(obj[name]);
      });
    },

    'pushing': {
      topic: function(list) {
        list.push(1, this.callback);
      },

      'is successful': function(err, response) {
        assert.isTrue(! err);
        assert.equal(response, 1);
      },

      'and lengthens': {
        topic: function(_, list) {
          list.length(this.callback);
        },

        'to 1': function(err, len) {
          assert.isTrue(! err);
          assert.equal(len, 1);
        }
      }
    }
  }
});

suite.export(module);
