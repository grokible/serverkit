
var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor,
    Opt = UtilBase.Opt,
    Prop = UtilBase.Prop;

var inherits = require ('inherits'),
    Debug = require ('debug'),
    RestService = require ('../restService'),
    ServerError = require ('../serverError'),
    fs = require ('fs-extra');

var validOpt = { max: undefined };

var dtag = 'gga:server:loader';
var debug = Debug (dtag);

var Loader = ctor (function Loader (parentServicesObj) {
    this.meta = {};
    this.parentServicesObj = parentServicesObj;  // parent services object
    this.dirPath = parentServicesObj.getProperty ('servicesDir');
    this.dirName = parentServicesObj.getProperty ('servicesDirname');
    this.koaApp = parentServicesObj.getProperty ('koaApp');

    this.modules = {};
    this.routes = {};
    this.midware = [];
});

inherits (Loader, Object);

module.exports = Loader;

// Loader is not dependent on logger.
Loader.prototype._log = function (msg) {
    debug (msg + "");  // stringify
}

// A module is just a constructor that takes a services ref
Loader.prototype.getModule = function (name) {
    if (name in this.modules)
        return this.modules [name].instance;

    throw ServerError (`Service Module '${ name }' doesn\'t exist`, dtag);
}

Loader.prototype.getRoute = function (path) {
    if (path in this.routes)
        return this.routes [name].instance;

    throw ServerError (`Route with Path '${ path }' doesn\'t exist`);
}

// ctor, deps, file (optional)
Loader.prototype.getModuleMeta = function (name) {
    if (name in this.modules)
        return this.modules [name];

    throw ServerError (`Service Module '${ name }' doesn\'t exist`, dtag);
}

Loader.prototype.moduleExists = function (name) {
    return name in this.modules;
}

Loader.prototype._require = function (path) {
    var module;
    try {
        module = require (path);
    } catch (err) {
        debug (`path = ${ path }`);
        debug (`err = ${ err }`);

        console.log (err);
        
        throw ServerError (`Loading module path='${ path }' failed. ` +
            `${ err }`, dtag, err);
    }

    return module;
}

Loader.prototype.loadService = function (svcSpec) {
    var name = svcSpec.name;
    var type = Prop.required (svcSpec, 'type')
    Prop.check ('type', type == 'service', "type == 'service'");

    var fqn = `${ type }:${ name }`;

    if (this.moduleExists (fqn))
        throw ServerError (`Loading service '${ fqn }': there is ` +
            `already a module with that name loaded`);

    // If a file is provided, load
    var Module;
    var filename;
    if ('file' in svcSpec) {
        filename = svcSpec.file;
        var path = `${ this.dirPath }/${ filename }`;
        // Module is a generic term for a loaded library that meets
        // certain criteria (needs to be a functor which instantiates
        // the service/route/midware, and must have meta)

        Module = this._require (path);
        var meta = Module.meta ();
        var serviceInstance = Module (this.parentServicesObj);
        var props = { file: filename };

        this.addService (meta, serviceInstance, props);

    } else {
        // If no file is provided, check for class, and opt

        var subtype = Prop.required (svcSpec, 'subtype')
        Prop.check (subtype, subtype == 'rest', "subtype == 'rest'");

        var prefix = Prop.required (svcSpec, 'props.prefix');
        var opt = {
            name: fqn,
            prefix: prefix,
        };

        var meta = {
            name: name,
            type: type,
            subtype: subtype,
            deps: [],
        };

        var restServiceInstance = RestService (this.parentServicesObj, opt);

        this.addService (meta, restServiceInstance, props);
    }
}

Loader.prototype.addService = function (meta, serviceInstance, oProps) {
    var rv = this._addModule (meta, serviceInstance, oProps);
    return rv;
}

Loader.prototype._addModule = function (meta, moduleInstance, oProps) {
    var name = meta.name;
    var type = meta.type;
    var deps = Prop.get (meta, 'deps', []);

    var fqn = `${ type }:${ name }`;

    if (this.moduleExists (fqn)) {
        this._log (`Error loading module '${ fqn }': already have ` +
            `a module named '${ fqn }'`);

        return;
    }

    deps.forEach (nm => {
        if ( ! this.moduleExists (nm))
            throw ServerError (`Loading module '${ name }', ` + 
                `type='${ type }' : required dependency '${ nm }' ` +
                `is not yet loaded.`, dtag);
    });

    var fqn = `${ type }:${ name }`;

    var rv = {
        instance: moduleInstance,
        name: name,
        fqn: fqn,
        type: type,
        meta: meta,
    };

    // oProps are non-meta properties (i.e. not dynamic/meta loaded config)
    if (oProps)
        rv ['props'] = oProps;

    if ('subtype' in meta)
        rv ['subtype'] = meta ['subtype'];

    // Can lookup rv for module by name or path
    this.modules [fqn] = rv;

    return rv;
}

// RouterModuleInstance is just a Koa Router (instance) with static meta ()
Loader.prototype.loadRouter = function (filename) {
    // TODO - HARDCODED PATH
    // var filepath = `../../midware/${ filename }`;
    var filepath = `../../../app/midware/${ filename }`;

    var RouterModule = this._require (filepath);

    var meta = RouterModule.meta ();
    var opt = { name: meta.name, prefix: meta.prefix };
    var routerInstance = RouterModule (this.parentServicesObj, opt);

    var rv = this._addModule (meta, routerInstance);

    // TODO - not used 
    this.routes [meta.prefix] = rv;

    // midware => ordered list of middleware
    this.midware.push (rv);
    var routes = routerInstance.routes ();
    this.koaApp.use (routes);
}

Loader.prototype.loadServicesByMeta = function (serviceDescriptors) {
    serviceDescriptors.forEach (svc => {
        this.loadService (svc);
    });
}

Loader.prototype.loadMidwareByMeta = function (midwareDescriptors) {
    midwareDescriptors.forEach (mw => {
        var filename = mw.file;
        var type = mw.type;
        if (type == "midware")
            this.loadMidware (filename);
        else if (type == "router")
            this.loadRouter (filename);
        else
            throw ServerError (`Unknown midware type = ${ type }`, dtag);
    });
}

Loader.prototype.loadMidware = function (midwareFilename) {
    // TODO - HARDCODED PATH:
//    var path = `../../midware/${ midwareFilename }`;
    var path = `../../../app/midware/${ midwareFilename }`;

    var loadedMidwareModule = this._require (path);
    var meta = loadedMidwareModule.meta ();

    var name = Prop.required (meta, 'name');
    var type = Prop.required (meta, 'type');
    var deps = Prop.get (meta, 'deps', []);

    debug (`Loading midware '${ name }'`);

    deps.forEach (nm => {
        if ( ! this.moduleExists (nm))
            throw ServerError (`Loading module '${ name }', ` +
                `type='${ type }' : required dependency '${ nm }' ` +
                `is not yet loaded.`, dtag);
    });

    this.addMidware (name, loadedMidwareModule.provide);
}

Loader.prototype.addMidware = function (name, provideFn) {
    if (this.moduleExists (name))
        throw ServerError (`Error loading midware '${ name }': there is ` +
            `already a midware with that name loaded`);

    this.midware.push ({ name: name, provideFn: provideFn });
    this.koaApp.use (provideFn);
}







