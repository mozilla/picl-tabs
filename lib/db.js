/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Storage API for per-device tabs data.
 *
 * This module provides a high-level API for storing tabs data.  You can
 * get, set and delete a JSON blob for each (userid, device) pair, as well
 * as get a list of all devices for each user.
 *
 * The current state of a user's data is identified with an opaque version
 * number.  Each write to that user's data will increase the version number.
 * The data for each device is also tagged with the version number at which
 * it was last modified.  This acts rather like a revision number in subversion
 * and allows a simple form of change-based client query.
 *
 *
 * The API provided is:
 *
 *    getDevices(user, cb):  Gets metadata about the devices for which
 *                           tabs data is stored.  The callback will be
 *                           given an object with the following structure:
 *
 *                             { 'version': <current version>,
 *                               'devices': {
 *                                 <device id>: <last-modified version>,
 *                             }}
 *
 *    getTabs(user, device, cb):  Gets the tab data stored for a particular
 *                                device.  The callback will be given an 
 *                                object with the following structure:
 *
 *                                  { 'version': <last-modified version>,
 *                                    'tabs': <opaque tabs data>
 *                                  }
 *
 *    setTabs(user, device, data, cb):  Sets the tab data stored for a
 *                                      particular device.  The callback
 *                                      will be given an object with the
 *                                      following structure:
 *
 *                                  { 'version': <new version number> }
 *
 *    delTabs(user, device, data, cb):  Deletes the tab data stored for a
 *                                      particular device.  The callback
 *                                      will be given an object with the
 *                                      following structure:
 *
 *                                  { 'version': <new version number> }
 *
 *
 * The implementation is currently based on a simple key-value store.
 * The key 'userid/meta' stores the document corresponding to get_devices(),
 * while the key 'userid/devices/<deviceid>' stores the document containing
 * get_tabs() data for an individual device.
 *
 * There is currently limited concurrency control for writes.  We assume
 * devices only write to their own bucket and hence there is no chance of
 * conflicts.  I'd like to in a future iteration though, because I don't
 * think it will be expensive and it's better to be safe than sorry...
 *
 */

const Hapi = require('hapi');
const kvstore = require('picl-server/lib/kvstore');

/* Data is stored using the abstract 'kvstore' interface from picl-server.
 * We use a single, shared connection to the store, which is established
 * automatically but asynchronously.  Thus, there is a little bit of magic
 * here to ensure the API functions in this module will wait for a connection
 * to be established.  Just wrap any such functions with 'waitKV' like so:
 *
 *    var get_tabs = waitKV(function(user, device, cb) {
 *        // Calls will be delayed until the shared connection is ready.
 *        kv.get('whatever', function(err, res) {
 *            // ...do whatever with the result here...
 *        });
 *    });
 *
 */

var kv = null;
var kvError = null;
var kvWaitlist = [];


function waitKV(func) {
  return function() {
    // If the kv connection is ready, immediately call the function.
    // It can safely use the shared global variable.
    if (kv !== null) {
      func.apply(this, arguments);
    }
    // If the connection errored out, immediately call the callback function
    // to report the error.  Callback is assumed to be the last argument.
    else if (kvError !== null) {
      arguments[arguments.length - 1].call(this, kvError);
    }
    // Otherwise, we have to wait for the database connection.
    // Re-wrap the function so that the above logic will be applied when ready.
    else {
      kvWaitlist.push(waitKV(func));
    }
  };
}


kvstore.connect({}, function(err, conn) {
  if (err) {
    kvError = err;
  } else {
    kv = conn;
  }
  while (kvWaitlist.length) {
    process.nextTick(kvWaitlist.pop());
  }
});


/* Get the meta-data list of devices and their last-modified versions.
 * This data can be read straight out of the store.
 */
module.exports.getDevices = waitKV(function(user, cb) {
  var metaKey = user + '/meta';
  kv.get(metaKey, function(err, res) {
    if (err) return cb(err);
    if (res) return cb(null, res.value);
    return cb(null, null);
  });
});


/* Get the tabs data for a particular device.
 * This data can be read straight out of the store.
 */
module.exports.getTabs = waitKV(function(user, device, cb) {
  var tabsKey = user + '/devices/' + device;
  kv.get(tabsKey, function(err, res) {
    if (err) return cb(err);
    if (res) return cb(null, res.value);
    return cb(null, null);
  });
});


/* Set the tabs data for a particular device.
 *
 * This involves reading the metadata document in order to find the next
 * version id, writing the updated data into the device document, and then
 * writing the new version number into the meta document.
 *
 * It's a little racy, in that you might wind up with new data in the device
 * document without an update in the meta document.  The consequences of
 * being in such a state seem minimal.
 */
module.exports.setTabs = waitKV(function(user, device, tabs, cb) {
  var tabsKey = user + '/devices/' + device;
  writeNewVersion(user, device, function(newVersion, cb) {
    var newData = {
      'version': newVersion,
      'tabs': tabs
    };
    kv.set(tabsKey, newData, cb);
  }, cb);
});


/* Delete the tabs data for a particular device.
 *
 * This involves reading the meta document in order to find the next version
 * number, deleting the required device document, then writing the new
 * version number into the meta document.
 *
 * In order to propagate deletions to other clients, we do *not* remove the
 * device's entry in the meta document.  It serves as a simple tombstone
 * entry.  We should figure out a way to clean these up eventually.
 *
 * It's possible that two different devices will try to create a new data
 * version at the same time.  We use CAS and a retry loop to avoid this.
 */
module.exports.delTabs = waitKV(function(user, device, cb) {
  var tabsKey = user + '/devices/' + device;
  writeNewVersion(user, device, function(newVersion, cb) {
    kv.delete(tabsKey, cb);
  }, cb);
});


/* Common implementation of "write a new version of the data".
 *
 * This function is used by both setTabs and delTabs to implement the
 * common parts of the logic involved in writing to the datastore. It
 * allocates a new version number, invokes some caller-provided logic,
 * then persists the new version number into the meta document.
 *
 * It's possible that two different clients will try to write data at the
 * same time, potentially allocating the same new version number.  We
 * use CAS and a retry loop to avoid this.  It's transparent to the calling
 * function and we make no attempt to undo any of its writes.
 */
function writeNewVersion(user, device, writecb, cb) {

  // Encapsulate the logic into a worker function that we can re-try
  // if we run into any write conflicts.  We could avoid retries by
  // doing locking here, but I think the conflict case should be rare
  // enough for an optimistic approach to win.
  var metaKey = user + '/meta';
  var numRetries = 0;
  var doWriteNewVersion = function() {

    // Grab the meta document to coordinate version number.
    kv.get(metaKey, function(err, metaRes) {
      if (err) return cb(err);

      // Increment the version number.
      // If this is the first ever write, it will be version 1.
      var metaDoc;
      if (!metaRes) {
        metaDoc = {'version': 0, 'devices': {}};
      } else {
        metaDoc = metaRes.value;
      }
      var newVersion = metaDoc.version + 1;

      // Perform the caller-provided write action.
      // This will e.g. write updated device document into the store.
      writecb(newVersion, function(err) {
        if (err) return cb(err);

        // Now update the meta document with the new version number.
        // If we find that it has changed, then some other device has done
        // a concurrent write and re-used our selected version number.
        // We'll have to start again from the top.
        metaDoc.version = newVersion;
        metaDoc.devices[device] = newVersion;
        var casid = metaRes ? metaRes.casid : null;
        kv.cas(metaKey, metaDoc, casid, function(err) {
          if (err) {
            // XXX TODO: we need a defined way to detect cas conflict
            if (err !== 'cas mismatch') return cb(err);
            if (numRetries > 10) return cb('too many conflicts');
            numRetries++;
            process.nextTick(doWriteNewVersion);
          } else {
            // Done!  Return the new version number.
            cb(null, { version: newVersion });
          }
        });
      });
    });
  };
  doWriteNewVersion();
}
