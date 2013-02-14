var auth = require('picl-server/routes/token-auth.js');
var tabs = require('./tabs.js');

module.exports = [].concat(auth.routes, tabs.routes);
