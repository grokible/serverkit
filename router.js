
var inherits = require ('inherits');

var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor,
    Opt = UtilBase.Opt;

var Jaybird = require ('jaybird'),
    JbCompiler = Jaybird.Compiler;

var KoaRouter = require ('koa-router');

var validOpt = {
    name: undefined,   // required
    prefix: undefined, // required
    schema: undefined, // optional
    driver: undefined, // optional
};

var Router = ctor (function Router (services, opt) {
    var options = Opt (validOpt, opt);

    this.prefix = options.get ('prefix', true);
    this.name = options.get ('name', true);

    this.services = services;

    this.koaRouter = KoaRouter ({ prefix: this.prefix });

    // Schema is optional 
    this.schema = options.get ('schema');
    if (this.schema) {
        var driver = options.get ('driver');
        if ( ! driver)
            throw Error (`Schema supplied but no driver supplied`);
        this.driver = driver;
        this.schema.collection.router = this;

        var rootDir = this.services.getRootDir ();
        this.compiler = JbCompiler ({ schema: this.schema, driver: driver,
            rootDir: rootDir });
    }
});

inherits (Router, Object);

module.exports = Router;

Router.prototype.getPrefix = function () {
    return this.prefix;
}

Router.prototype.getName = function () {
    return this.name;
}

Router.prototype.getServices = function () {
    return this.services;
}

Router.prototype.getServiceName = function () {
    return `router:${ this.name }`;
}

Router.prototype.getSymbol = function () {
    return `service.route.${ this.name }`;
}

Router.prototype.getRoutes = function () {
    return this.koaRouter.routes ();
}

Router.prototype.getKoaRouter = function () {
    return this.koaRouter;
}

/**
 * If not defined, driver and compiler won't be defined either
 */
Router.prototype.getSchema = function () {
    return this.schema;
}

Router.prototype.getDriver = function () {
    return this.driver;
}

Router.prototype.getCompiler = function () {
    return this.compiler;
}

// obsolete
Router.prototype.routes = function () {
    return this.koaRouter.routes ();
}



Router.meta = function () {
    throw Error ("No meta () function defined");
}

module.exports = Router;


