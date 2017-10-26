
var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor,
    Opt = UtilBase.Opt;

var inherits = require ('inherits'),
    Debug = require ('debug'),
    fs = require ('fs-extra'),
    Joi = require ('joi'),
    ConfigFile = require ('./configFile');

var dtag = 'gga:service';
var debug = Debug (dtag);

var validOpt = {
    name: undefined
}

var Service = ctor (function Service (services, opt) {
    var options = Opt (validOpt, opt);

    this.services = services;
    this.name = options.get ('name', true);
});

inherits (Service, Object);

module.exports = Service;

Service.prototype.getName = function () {
    return this.name;
}

Service.prototype.getDebugTag = function () {
    var pre = this.services.getProperty ('dtagPrefix');
    var dtag = `${ pre }:service:${ this.getName () }`;
    return dtag;
}

Service.prototype.getLogger = function (dtag) {
    return this.services.get ('service:logger').getLogger (dtag);
}

Service.prototype.makeValidatorFromJoi = function (joi) {
    return function (value) {
        var rv = Joi.validate (value, joi);
        if (rv.error)
            throw Error (rv.error);

        return rv.value;
    }
}

var _makeJoiUserPw = function () {
    return Joi.object ({
        user: Joi.string ().required (),
        password: Joi.string ().required (),
    });
}

Service.prototype.loadSecurityConfig = function (optValidator) {

    var validSubsystemsOpt = {
        securityDirname: undefined,
        securityDir: undefined,
    };

    var logger = this.getLogger (dtag);

    // Filter out the properties we need from subsystemsCfg using Opt
    var subsystemsCfg = this.services.getConfig ();
    var options = Opt (validSubsystemsOpt, subsystemsCfg, true);

    var securityDir = options.get ('securityDir', true);
    var securityDirname = options.get ('securityDirname', true);
    var name = this.name;

    var filename = `${ name }.service.security`;
    var fn = `${ securityDir }/${ filename }`;

    var secConfig;
    var msg;
    if (fs.existsSync (fn)) {
        msg = `Load '${ name }' security conf '${ filename }'`;
        logger.info (msg);
        secConfig = ConfigFile.readSync (fn);
    } else {
        msg = `Service '${ name }' has no security config file ` +
            `'${ filename }' (OK continuing)`;
        logger.warn (msg);
    }

    // N.B. you can pass null or false and this will skip validation
    // (but you probably shouldn't)

    if (optValidator === undefined)
        optValidator = this.makeValidatorFromJoi (_makeJoiUserPw ());

    // Must be a function that takes value arg and returns value arg or throws
    if (optValidator)
        secConfig = optValidator (secConfig);

    return secConfig;
}

Service.prototype.getServices = function () {
    return this.services;
}

Service.prototype.loadConfig = function (optValidator) {

    var validSubsystemsOpt = {
        configDir: undefined,
    };

    var logger = this.getLogger (dtag);

    // Get the subsystems config object for the securityDir
    var servicesCfg = this.services.getConfig ();
    var options = Opt (validSubsystemsOpt, servicesCfg, true);

    var configDir = options.get ('configDir', true);
    var name = this.name;

    var filename = `${ name }.service.conf`;
    var fn = `${ configDir }/${ filename }`;

    var config;
    var msg;
    if (fs.existsSync (fn)) {
        msg = `Load '${ name }' config '${ filename }'`;
        logger.info (msg);
        config = ConfigFile.readSync (fn);
    } else {
        msg = `Service '${ name }' has no config file '${ filename }' ` +
            `(OK continuing)`;
        logger.warn (msg);
    }

    // Must be a function that takes value arg and returns value arg or throws
    if (optValidator)
        config = optValidator (config);

    return config;
}








