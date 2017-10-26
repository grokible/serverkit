
var Serverkit = {};

Serverkit.Auth = require ('./auth');
Serverkit.ConfigFile = require ('./configFile');
Serverkit.Connector = require ('./connector');
Serverkit.ConnectorPool = require ('./connectorPool');
Serverkit.Dbg = require ('./dbg');
Serverkit.RestService = require ('./restService');
Serverkit.Router = require ('./router');
Serverkit.Service = require ('./service');
Serverkit.Services = require ('./services');
Serverkit.WrappedLogger = require ('./wrappedLogger');

module.exports = Serverkit;
