
var assert = require('assert');
var async = require('async');
var db = require('../lib/db');

describe('picl-tabs db layer', function () {

  it('can store, retrieve and delete per-device data', function (done) {
    var data_in = {'test': 'data'};
    async.waterfall([
      // Set a device's tabs to some test data.
      function(cb) {
        db.set_tabs('test@example.com', 'firefox-1', data_in, cb);
      },
      // Check that we can read the data back out.
      function(cb) {
        db.get_tabs('test@example.com', 'firefox-1', function(err, data_out) {
          if (err) return cb(err);
          assert.equal(data_out, data_in);
          cb();
        });
      },
      // Delete that device's data.
      function(cb) {
        db.del_tabs('test@example.com', 'firefox-1', cb);
      },
      // Check that the data is actually gone.
      function(cb) {
        db.get_tabs('test@example.com', 'firefox-1', function(err, data_out) {
          if (err) return cb(err);
          assert.equal(data_out, null);
          cb();
        });
      }
    ], function(err) {
      assert.equal(err, null);
      done();
    });
  });

});
