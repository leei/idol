var Idol = require("../../idol").Idol;

function RedisObject() {
  console.log("instantiating redis object: " + this.backend);
}

RedisObject.prototype = {
};

module.exports = RedisObject;
