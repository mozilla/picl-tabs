var assert = require('assert');
var config = require('picl-server/lib/config');
var helpers = require('picl-server/test/helpers');

var server = require('../../server');

var makeRequest = helpers.makeRequest.bind(server);

var TEST_AUDIENCE = config.get('public_url');
var TEST_EMAIL;
var TEST_ASSERTION;
var TEST_TOKEN = 'foobar';
var TEST_DEVICE_1 = 'firefox-1';
var TEST_DEVICE_2 = 'firefox-2';


describe('set up account', function() {
  it('can get user email and assertion', function(done) {
    helpers.getUser(TEST_AUDIENCE, function(err, user) {

      TEST_EMAIL = user.email;
      TEST_ASSERTION = user.assertion;

      assert.ok(TEST_EMAIL);
      assert.ok(TEST_ASSERTION);

      done();
    });
  });

  it('creates a new account', function(done) {
    makeRequest('PUT', '/update_token', {
      payload: { assertion: TEST_ASSERTION, token: TEST_TOKEN, oldTokens: [ 'not', 'used' ] }
    }, function(res) {
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.result, { success: true, email: TEST_EMAIL });
      done();
    });
  });
});


describe('tab storage api', function() {
 
  var makeURL = function(userid, device) {
    var components = ['', 'tabs'];
    if (userid) components.push(encodeURIComponent(userid));
    if (device) components.push(encodeURIComponent(device));
    return components.join('/');
  };

  it('should store a tab data record', function(done) {
    makeRequest('PUT', makeURL(TEST_EMAIL, TEST_DEVICE_1), {
      payload: { tabs: 'MY AWESOME TABS' },
      headers: { Authorization: TEST_TOKEN }
    }, function(res) {
      assert.equal(res.statusCode, 200);
      assert.ok(res.result.success);
      done();
    });
  });

  it('should retrieve a previously-stored record', function(done) {
    makeRequest('GET', makeURL(TEST_EMAIL, TEST_DEVICE_1), {
      headers: { Authorization: TEST_TOKEN }
    }, function(res) {
      assert.equal(res.statusCode, 200);
      assert.ok(res.result.success);
      assert.equal(res.result.tabs, 'MY AWESOME TABS');
      done();
    });
  });

  it('should fail on bad Authorization header', function(done) {
    makeRequest('GET', makeURL(TEST_EMAIL, TEST_DEVICE_1), {
      headers: { Authorization: 'bad' }
    }, function(res) {
      assert.equal(res.statusCode, 401);
      done();
    });
  });

  it('should store data for multiple devices', function(done) {
    makeRequest('PUT', makeURL(TEST_EMAIL, TEST_DEVICE_2), {
      payload: { tabs: 'MY AMAZING TABS' },
      headers: { Authorization: TEST_TOKEN }
    }, function(res) {
      assert.equal(res.statusCode, 200);
      assert.ok(res.result.success);
      done();
    });
  });

  it('without clobbering each other\'s data', function(done) {
    makeRequest('GET', makeURL(TEST_EMAIL, TEST_DEVICE_1), {
      headers: { Authorization: TEST_TOKEN }
    }, function(res) {
      assert.equal(res.statusCode, 200);
      assert.ok(res.result.success);
      assert.equal(res.result.tabs, 'MY AWESOME TABS');
      makeRequest('GET', makeURL(TEST_EMAIL, TEST_DEVICE_2), {
        headers: { Authorization: TEST_TOKEN }
      }, function(res) {
        assert.equal(res.statusCode, 200);
        assert.ok(res.result.success);
        assert.equal(res.result.tabs, 'MY AMAZING TABS');
        done();
      });
    });
  });

  it('should list all devices that have data stored', function(done) {
    makeRequest('GET', makeURL(TEST_EMAIL), {
      headers: { Authorization: TEST_TOKEN }
    }, function(res) {
      assert.equal(res.statusCode, 200);
      assert.ok(res.result.success);
      assert.ok(res.result.version);
      var devices = res.result.devices;
      assert.deepEqual(Object.keys(devices), [TEST_DEVICE_1, TEST_DEVICE_2]);
      assert.ok(devices[TEST_DEVICE_1] < devices[TEST_DEVICE_2]);
      done();
    });
  });
});
