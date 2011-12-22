var mixin = require("mixin");

/**
 * This mixin will ensure that timestamps are updated whenever an Object of
 * this type is created or updated.
 */
function Timestamp() {
  this.once("new id", function(new_id) {
    this.created_at = Date.now();
    //console.log("add created_at: " + this.created_at);
  });
}

function timestampUpdate(attrs, callback) {
  if (! attrs.updated_at) {
    attrs.updated_at = this.attributes.updated_at = Date.now();
    //console.log("add updated_at: " + attrs.updated_at);
  }
  this.updateAttributes_without_timestamp(attrs, callback);
}

Timestamp.included = function(base) {
  //console.log(base.name + ": including Timestamp");
  base.defineAttribute("created_at", { write_once: true });
  base.defineAttribute("updated_at");

  mixin.alias(base.prototype, "updateAttributes", "timestamp", timestampUpdate);
}

module.exports = Timestamp;