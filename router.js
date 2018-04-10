
var UtilBase = require ('utilbase'),
    Opt = UtilBase.Opt;

var KoaRouter = require ('koa-router');

var validOpt = {
    name: undefined,   // required
    prefix: undefined, // required
};

class Router {
    constructor (services, opt) {
        var options = Opt (validOpt, opt);

        this.prefix = options.get ('prefix', true);
        this.name = options.get ('name', true);

        this.services = services;
        this.koaRouter = KoaRouter ({ prefix: this.prefix });
    }
}

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

// obsolete
Router.prototype.routes = function () {
    return this.koaRouter.routes ();
}

Router.meta = function () {
    throw Error ("No meta () function defined");
}

module.exports = Router;


