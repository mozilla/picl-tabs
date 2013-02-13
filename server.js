
const Hapi = require('hapi');
var config = require('picl-server/lib/config');

// Server settings.  Currently this is only the authentication stuffz.
var settings = {};
var authConfig = require('picl-server/routes/token-auth.js').config;
settings.auth = authConfig;

// Create a server object with a host and port from config.
var port = config.get('bind_to.port');
var host = config.get('bind_to.host');
var server = new Hapi.Server(host, port, settings);

// Load the routes for this product.
var routes = require('./routes');
server.addRoutes(routes);

// Make the server available as the top-level export of this module.
module.exports = server;

// If executed as a script, run an instance of the server.
if (require.main === module) {
  server.start(function() {
    var host = server.settings.host, port = server.settings.port;
    console.log("running on http://" + host + ":" + port);
  });
}
