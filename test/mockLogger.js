
var inherits = require ('inherits');

var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor;

/**
 * A fake logger for mocking in tests.
 * To use: 
 */
var MockLogger = ctor (function MockLogger (optDebugTag) {
    // TODO - optDebugTag ignored
});

inherits (MockLogger, Object);

module.exports = MockLogger;

var makeLogWrapFunc = function (levelName) {
var _levelName = levelName;
return function () {
    // Do nothing currently
}
}

MockLogger.prototype.trace = makeLogWrapFunc ('trace');
MockLogger.prototype.debug = makeLogWrapFunc ('debug');
MockLogger.prototype.info = makeLogWrapFunc ('info');
MockLogger.prototype.warn = makeLogWrapFunc ('warn');
MockLogger.prototype.error = makeLogWrapFunc ('error');
MockLogger.prototype.fatal = makeLogWrapFunc ('fatal');
