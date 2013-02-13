
var kvstore = require("picl-server/lib/kvstore");

// The kvstore connection is established automatically but asynchronously.
// Any functions called before it has completed will have to wait until the
// connection is established.
//
// The array 'kv_waitlist' is a list of pending function calls, which will
// be executed once the connection is established.  To make sure a function
// can only be called when the global 'kv_conn' variable is valid, wrap it
// with the 'wait_kv' funtion like this:
//
//    var get_data = wait_kv(function(key, cb) {
//      var data = kv.get(key + "-DATA");
//      cb(null, data);
//    });

var kv = null;
var kv_err = null;
var kv_waitlist = [];


kvstore.connect({}, function(err, conn) {
  if (err) {
    kv_err = err;
  } else {
    kv = conn;
  }
  kv_waitlist.forEach(function(fn) {
    process.nextTick(fn);
  });
});


function wait_kv(func) {
  return function() {
    // If the kv connection is ready, immediately call the function.
    // It can safely use the shared global variable.
    if (kv !== null) {
      func.apply(this, arguments);
    }
    // If the connection errored out, immediately call the callback function
    // to report the error.  Callback is assumed to be the last argument.
    else if (kv_err !== null) {
      arguments[arguments.length - 1].call(this, kv_err);
    }
    // Otherwise, we have to wait for the database connection.
    // Re-wrap the function so that the above logic will be applied when ready.
    else {
      kv_waitlist.push(wait_kv(func));
    }
  };
};


module.exports.get_tabs = wait_kv(function(user, device, cb) {
  var key = user + "/" + device;
  kv.get(key, function(err, data) {
    if (err) return cb(err);
    if(data) {
      cb(null, data.value);
    } else {
      cb(null, null);
    }
  });
});


module.exports.set_tabs = wait_kv(function(user, device, new_tabs, cb) {
  var key = user + "/" + device;
  kv.set(key, new_tabs, function(err) {
    cb(err);
  });
});


module.exports.del_tabs = wait_kv(function(user, device, cb) {
  var key = user + "/" + device;
  kv.delete(key, function(err) {
    cb(err);
  });
});
