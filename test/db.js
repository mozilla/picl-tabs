
var assert = require('assert');
var async = require('async');
var db = require('../lib/db');

describe('picl-tabs db layer', function () {

  it('can store, retrieve and delete per-device data', function (done) {
    var dataIn = {'test': 'data'};
    async.waterfall([
      // Set a device's tabs to some test data.
      function(cb) {
        db.setTabs('test@example.com', 'firefox-1', dataIn, cb);
      },
      // Check that we can read the data back out.
      function(res, cb) {
        db.getTabs('test@example.com', 'firefox-1', function(err, dataOut) {
          if (err) return cb(err);
          assert.deepEqual(dataOut.tabs, dataIn);
          cb(null);
        });
      },
      // Delete that device's data.
      function(cb) {
        db.delTabs('test@example.com', 'firefox-1', cb);
      },
      // Check that the data is actually gone.
      function(res, cb) {
        db.getTabs('test@example.com', 'firefox-1', function(err, dataOut) {
          if (err) return cb(err);
          assert.equal(dataOut, null);
          cb(null);
        });
      }
    ], function(err) {
      assert.equal(err, null);
      done();
    });
  });

  it('can list all devices along with last-modified version', function (done) {
    var dataIn = {'test': 'data'};
    var version = null;
    async.waterfall([
      // Set two devices' tabs to some test data.
      function(cb) {
        db.setTabs('test@example.com', 'firefox-1', dataIn, cb);
      },
      function(res, cb) {
        db.setTabs('test@example.com', 'firefox-2', dataIn, cb);
      },
      // Check that we can read the list of devices back out.
      function(res, cb) {
        db.getDevices('test@example.com', function(err, meta) {
          if (err) return cb(err);
          assert.deepEqual(Object.keys(meta.devices),
                           ['firefox-1', 'firefox-2']);
          version = meta.version;
          cb(null);
        });
      },
      // Update tabs for one of the devices.
      function(cb) {
        db.setTabs('test@example.com', 'firefox-1', dataIn, cb);
      },
      function(res, cb) {
        assert.ok(res.version);
        db.getDevices('test@example.com', function(err, meta) {
          if (err) return cb(err);
          assert.deepEqual(Object.keys(meta.devices),
                           ['firefox-1', 'firefox-2']);
          assert.ok(meta.version > version);
          assert.ok(meta.devices['firefox-1'] > version);
          assert.ok(meta.devices['firefox-2'] <= version);
          cb(null);
        });
      },
      // Cleanup by deleting the data for both devices.
      function(cb) {
        db.delTabs('test@example.com', 'firefox-1', function(err, res) {
          if (err) return cb(err);
          assert.ok(res.version);
          db.delTabs('test@example.com', 'firefox-1', function(err, res) {
            assert.ok(res.version);
            cb(null);
          });
        });
      }
    ], function(err) {
      assert.equal(err, null);
      done();
    });
  });

});
