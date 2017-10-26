
var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor,
    Opt = UtilBase.Opt,
    RestUtil = UtilBase.RestUtil;

var inherits = require ('inherits'),
    Debug = require ('debug');

var Service = require ('./service'),
    rp = require ('request-promise');

var dtag = 'gga:service';
var debug = Debug (dtag);

var validOpt = {
    prefix: undefined,  // required
    host: 'localhost',
    port: 3000,
    https: false,
}

// TODO - check local paths for collisions (prefix) ?

// remove opts that are only for this level, and pass what remains
// Use validOpt to enumerate those that are pulled/removed.

var RestService = ctor (function RestService (services, opt) {
    var options = Opt (validOpt, opt, true);

    this.prefix = options.get ('prefix', true);
    this.host = options.get ('host');
    this.port = options.get ('port');
    this.isHttps = options.get ('https');   // if not, use http

    var optForLower = options.getIllegal ();
    
    this.constructor.super_.call (this, services, optForLower);
});

inherits (RestService, Service);

module.exports = RestService;

RestService.prototype.url = function (path, oQuery) {
    var wholePath = this.prefix + path;
    var opt = {
        protocol: this.isHttps ? 'https' : 'http',
    };

    if (oQuery)
        opt ['query'] = oQuery;

    if (( this.isHttps && this.port != 443) ||
        ( ! this.isHttps && this.port != 80))
        opt ['port'] = this.port;

    // TODO "noAuth" is also accepted?

    var url = RestUtil.url (this.host, wholePath, opt);
    return url;
}

RestService.prototype.getAuthHeaders = function (userOrAuth) {
    var headers = {};
    if (typeof userOrAuth == 'string')
        headers ['Authorization'] = userOrAuth; // e.g. basic or Bearer
    else {
        var user = userOrAuth;
        headers ['Authorization'] =
            RestUtil.basicAuth (user ['username'], user ['pw']);
    }

    return headers;
}

RestService.prototype.makeOpt = function (path, oQuery, oUserOrAuth,
    oRetResp) {

    var rpOpt = {
        uri: this.url (path, oQuery),
        json: true
    };

    // optUserOrAuth overrides
    var headers = this.headers;
    if (oUserOrAuth)
        headers = this.getAuthHeaders (oUserOrAuth);

    if (headers)
        rpOpt ['headers'] = headers;

    // If this is set, response is returned to the .then ().  This
    // looks like this:  var x = response.headers ['content-type']
    if (oRetResp)
        rpOpt ['resolveWithFullResponse'] = true;

    return rpOpt;
}

RestService.prototype.exec = function (method, path, oBody, oQuery,
    oUserOrAuth, oRetResp) {

    var rpOpt = this.makeOpt (path, oQuery, oUserOrAuth, oRetResp);
    rpOpt ['method'] = method;

    if (oBody)
        rpOpt ['body'] = oBody;

    return rp (rpOpt);
}

RestService.prototype.get = function (path, oQuery, oUserOrAuth, oRetResp) {
    return this.exec ('GET', path, undefined, oQuery, oUserOrAuth, oRetResp);
}

RestService.prototype.post = function (path, body, oQuery, oUserOrAuth,
oRetResp) {
    return this.exec ('POST', path, body, oQuery, oUserOrAuth, oRetResp);
}

RestService.prototype.patch = function (path, body, oQuery, oUserOrAuth,
oRetResp) {
    return this.exec ('PATCH', path, body, oQuery, oUserOrAuth, oRetResp);
}

RestService.prototype.delete = function (path, body, oQuery, oUserOrAuth,
oRetResp) {
    return this.exec ('DELETE', path, body, oQuery, oUserOrAuth, oRetResp);
}

RestService.prototype.postForm = function (path, body, oQuery, oUserOrAuth,
oRetResp) {
    var rpOpt = this.makeOpt (path, oQuery, oUserOrAuth, oRetResp);
    rpOpt ['method'] = 'POST';
    rpOpt ['form'] = body;
    return rp (rpOpt);
}





