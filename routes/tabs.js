var Hapi = require('hapi');
var db = require('../lib/db.js');

exports.routes = [
  {
    method: 'GET',
    path: '/tabs/{userid}',
    handler: getDevices,
    config: {
      description: 'Get all devices for a specific user',
      response: {
        schema: {
          success: Hapi.Types.Boolean().required(),
          version: Hapi.Types.Number().required(),
          devices: Hapi.Types.Object().required()
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/tabs/{userid}/{device}',
    handler: getTabs,
    config: {
      description: 'Get tabs data for a specific device',
      response: {
        schema: {
          success: Hapi.Types.Boolean().required(),
          version: Hapi.Types.Number().required(),
          // XXX TODO: get this working with Object() type
          tabs: Hapi.Types.String().required()
        }
      }
    }
  },
  {
    method: 'PUT',
    path: '/tabs/{userid}/{device}',
    handler: putTabs,
    config: {
      description: 'Put tabs data for a specific device',
      validate: {
        schema: {
          // XXX TODO: get this working with Object() type
          tabs: Hapi.Types.String().required()
        }
      },
      response: {
        schema: {
          success: Hapi.Types.Boolean().required(),
          version: Hapi.Types.Number().required()
        }
      }
    }
  },
  {
    method: 'DELETE',
    path: '/tabs/{userid}/{device}',
    handler: delTabs,
    config: {
      description: 'Delete tabs data for a specific device',
      response: {
        schema: {
          success: Hapi.Types.Boolean().required(),
          version: Hapi.Types.Number().required()
        }
      }
    }
  }
];


function getDevices(request) {
  // XXX TODO: auth checking!
  var userid = request.params.userid;
  db.getDevices(userid, function(err, res) {
    if (err) return request.reply(Hapi.Error.badRequest(err));
    if (!res) res = { version: 0, devices: {} };
    request.reply({
      success: true,
      version: res.version,
      devices: res.devices
    });
  });
}


function getTabs(request) {
  // XXX TODO: auth checking!
  var userid = request.params.userid;
  var device = request.params.device;
  db.getTabs(userid, device, function(err, res) {
    if (err) return request.reply(Hapi.Error.badRequest(err));
    if (!res) return request.reply(Hapi.Error.notFound());
    request.reply({
      success: true,
      version: res.version,
      tabs: res.tabs
    });
  });
}


function putTabs(request) {
  // XXX TODO: auth checking!
  var userid = request.params.userid;
  var device = request.params.device;
  var tabs = request.payload.tabs;
  db.setTabs(userid, device, tabs, function(err, res) {
    if (err) return request.reply(Hapi.Error.badRequest(err));
    request.reply({
      success: true,
      version: res.version
    });
  });
}


function delTabs(request) {
  // XXX TODO: auth checking!
  var userid = request.params.userid;
  var device = request.params.device;
  db.delTabs(userid, device, function(err, res) {
    if (err) return request.reply(Hapi.Error.badRequest(err));
    request.reply({
      success: true,
      version: res.version
    });
  });
}
