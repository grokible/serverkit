
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

ServerKit.Test = {};
ServerKit.Test.MockLogger = require ('./test/mockLogger');

ServerKit.Impl = {};
ServerKit.Impl.Loader = require ('./impl/loader');

module.exports = Serverkit;
