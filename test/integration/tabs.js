var assert = require('assert');
var config = require('picl-server/lib/config');
var helpers = require('picl-server/test/helpers');

var server = require('../../server');

var makeRequest = helpers.makeRequest.bind(server);

var TEST_AUDIENCE = config.get('public_url');
var TEST_EMAIL;
var TEST_ASSERTION;
var TEST_TOKEN = 'foobar';


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
  it('should store a tab data record', function(done) {
    makeRequest('PUT', '/tabs/USERID_NEEDS_CHECKING/firefox-1', {
      payload: { tabs: 'MY AWESOME TABS' },
      headers: { Authorization: TEST_TOKEN }
    }, function(res) {
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.result, { success: true });
      done();
    });
  });

  it('should retrieve a previously-stored record', function(done) {
    makeRequest('GET', '/tabs/USERID_NEEDS_CHECKING/firefox-1', {
      headers: { Authorization: TEST_TOKEN }
    }, function(res) {
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.result, { success: true, tabs: 'MY AWESOME TABS'});
      done();
    });
  });

  it('should fail on bad Authorization header', function(done) {
    makeRequest('GET', '/tabs/USERID_NEEDS_CHECKING/firefox-1', {
      headers: { Authorization: 'bad' }
    }, function(res) {
      assert.equal(res.statusCode, 401);
      done();
    });
  });
});

