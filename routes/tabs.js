var Hapi = require('hapi');
var config = require('picl-server/lib/config.js');
var db = require('../lib/db.js');

exports.routes = [
  {
    method: 'GET',
    path: '/tabs/{userid}/{device}',
    handler: get_tabs,
    config: {
      description: 'Get tabs data for a specific device',
      response: {
        schema: {
          success: Hapi.Types.Boolean().required(),
          // XXX TODO: get this working with Object() type
          tabs: Hapi.Types.String().required()
        }
      }
    }
  },
  {
    method: 'PUT',
    path: '/tabs/{userid}/{device}',
    handler: put_tabs,
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
          success: Hapi.Types.Boolean().required()
        }
      }
    }
  },
  {
    method: 'DELETE',
    path: '/tabs/{userid}/{device}',
    handler: delete_tabs,
    config: {
      description: 'Delete tabs data for a specific device',
      response: {
        schema: {
          success: Hapi.Types.Boolean().required()
        }
      }
    }
  }
];


function get_tabs(request) {
  // XXX TODO: auth checking!
  var params = request.params;
  db.get_tabs(params.userid, params.device, function(err, data) {
    if (err) {
      request.reply(Hapi.Error.badRequest(err));
    } else if (!data) {
      request.reply(Hapi.Error.notFound());
    } else {
      request.reply({success: true, tabs: data});
    }
  });
};


function put_tabs(request) {
  // XXX TODO: auth checking!
  var params = request.params, payload = request.payload;
  db.set_tabs(params.userid, params.device, payload.tabs, function(err) {
    if (err) {
      request.reply(Hapi.Error.badRequest(err));
    } else {
      request.reply({success: true});
    }
  });
};


function delete_tabs(request) {
  // XXX TODO: auth checking!
  var params = request.params;
  db.del_tabs(params.userid, params.device, function(err) {
    if (err) {
      request.reply(Hapi.Error.badRequest(err));
    } else {
      request.reply({success: true});
    }
  });
};
