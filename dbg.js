
var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor,
    Opt = UtilBase.Opt;

var inherits = require ('inherits'),
    Debug = require ('debug');

var validOpt = {
    exception: undefined,    // required
    logDetails: undefined,    // required
};

var Dbg = ctor (function Dbg (opt) {
    this.set (opt);
});

inherits (Dbg, Object);

module.exports = Dbg;

Dbg.prototype.set = function (opt) {
    opt = opt ? opt : {};

    var options = Opt (validOpt, opt);
    this.exception = options.get ('exception');
    this.logDetails = options.get ('logDetails');
}

Dbg.prototype.getException = function () {
    return this.exception;
}

Dbg.prototype.getLogDetails = function () {
    return this.logDetails;
}

Dbg.prototype.getConsoleWriter = function (dtag) {
    return Debug (dtag);
}

