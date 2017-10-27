
var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor,
    Opt = UtilBase.Opt;

var inherits = require ('inherits'),
    Debug = require ('debug'),
    fs = require ('fs-extra'),
    Loader = require ('./impl/loader'),
    Dbg = require ('./dbg'),
    passport = require ('koa-passport');

var validOpt = {
    appName: undefined,    // required
    port: 3000,            // defaulted
    rootDir: undefined,    // required
    dtagPrefix: undefined, // required
    koaApp: undefined,     // required
    loadMeta: undefined,   // optional
};

var dtag = 'gga:services';
var debug = Debug (dtag);

var _instance;

var Services = ctor (function Services (opt) {
    if (_instance)
        throw Error (`Services already initialized`);

    var options = Opt (validOpt, opt);

    this.cfg = {
        appName: options.get ('appName', true),
        rootDir: options.get ('rootDir', true),
        dtagPrefix: options.get ('dtagPrefix', true),
        configDirname: 'config',
        configDir: undefined,
        servicesDirname: 'services',
        servicesDir: undefined,
        securityDirname: 'security',
        securityDir: undefined,
        koaApp: options.get ('koaApp', true),
    };

    debug (`<root> set to ${ this.cfg.rootDir }`);

    this.koaApp = this.cfg ['koaApp'];

    // Init passport
    this.koaApp.use (passport.initialize ());

    this.cfg.servicesDir =
        `${ this.cfg.rootDir}/app/${ this.cfg.servicesDirname }`;

    this.cfg.configDir = `${ this.cfg.rootDir }/${ this.cfg.configDirname }`;

    this.securityDir = this.cfg.securityDir =
        `${ this.cfg.configDir }/${ this.cfg.securityDirname }`;

    this.services = {};

    this.loader = Loader (this);

    var loadServiceMeta = options.get ('loadMeta.services');
    if (loadServiceMeta)
        this.loader.loadServicesByMeta (loadServiceMeta);

    var loadMidwareMeta = options.get ('loadMeta.midware');
    if (loadMidwareMeta)
        this.loader.loadMidwareByMeta (loadMidwareMeta);

    this.debug = Dbg ();

    _instance = this;
});

inherits (Services, Object);

module.exports = Services;

Services.instance = function () {
    return _instance;
}

Services.prototype.get = function (name) {
    return this.loader.getModule (name);
}

Services.prototype.getKoaApp = function () {
    return this.koaApp;
}

Services.prototype.getSecurityDir = function () {
    return this.securityDir;
}

Services.prototype.getRootDir = function () {
    return this.cfg.rootDir;
}

Services.prototype.getConfig = function () {
    return this.cfg;
}

Services.prototype.getProperty = function (name) {
    if (name in this.cfg)
        return this.cfg [name];

    throw Error (`No services config property named '${ name }'`);
}

Services.prototype.loadServicesByMeta = function (serviceLoadMeta) {
    this.loader.loadServicesByMeta (serviceLoadMeta)
}

Services.prototype.loadMidwareByMeta = function (midwareLoadMeta) {
    this.loader.loadMidwareByMeta (midwareLoadMeta)
}

Services.prototype.loadRouter = function (filename) {
    this.loader.loadRouter (filename);
}

Services.prototype.addService = function (name, loadedModuleCtor) {
    this.loader.addService (name, loadedModuleCtor);
}

// This assumes there is a provide function
Services.prototype.loadMidware = function (midwareFilename) {
    this.loader.loadMidware (midwareFilename);
}

// This assumes there is a provide function
Services.prototype.loadMidwareByMeta = function (midwareLoadMeta) {
    this.loader.loadMidwareByMeta (midwareLoadMeta);
}

Services.prototype.env = function () {
    return process.env.NODE_ENV;
}

Services.prototype.isDev = function () {
    return this.env () == 'dev';
}

Services.prototype.getDebug = function () {
    return this.debug;
}

Services.prototype.getConsoleWriter = function (dtag) {
    return this.debug.getConsoleWriter (dtag);
}

Services.prototype.getPassport = function () {
    return this.passport;
}

