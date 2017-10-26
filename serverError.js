
var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor,
    Exception = UtilBase.Exception;

var inherits = require ('inherits');

var ServerError = ctor (function (message, dtag, oPrev) {
    var meta = {};

    if (dtag)
        meta ['dtag'] = dtag;

    this.constructor.super_.call (this, message, meta, "ServerError",
        oPrev);
});

inherits (ServerError, Exception);

module.exports = ServerError;

ServerError.prototype.getDtag = function () {
    return 'dtag' in this.meta ? this.meta ['dtag'] : undefined;
}

ServerError.prototype.toString = function () {
    return this.message;
}





