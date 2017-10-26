
var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor;

var inherits = require ('inherits'),
    Debug = require ('debug'),
    fs = require ('fs-extra'),
    Bunyan = require ('bunyan');

/**
 * Wraps a real Bunyan logger and adds a call to the Debug library.
 * Thus all statements going to real logs will show on the console, as
 * is the case with the Debug library.  The logging statements duplicated
 * to console will also have the dtag value in the json
 */
var WrappedLogger = ctor (function Logger (realLogger, optDebugTag) {
    this.realLogger = realLogger;
    this.dtag = optDebugTag;

    // N.B. this.debug will be undefined if there is no dtag
    this.debug = optDebugTag ? Debug (optDebugTag) : undefined;
});

inherits (WrappedLogger, Object);

module.exports = WrappedLogger;

/**
 * A wrapper function that makes a call to Debug and then makes the logging
 * call.  This allows logging statements to show up on console (ala Debug
 * module).  However, you can still use Debug for things that shouldn't
 * go to the logs.  Best of both worlds.
 *
 * Logging call will also add the 'requestId' (X-Request-Id) if
 * the first argument is Koa Context (ctx) (this is detected by the special
 * 'ggaCtxMeta' property we add to the context, which has the requestId in it.
 * The Context object is simply used for the requestId and then removed from
 * the arguments.
 * 
 * If the first argument is an object, the properties from this object (meta),
 * the properties from this object are copied and moved into the json
 * logger entry written out.  The dtag (if any) and the requestId are
 * merged into this object and take precedence (they overwrite on collision).
 * Preventing collisions is simple, just wrap any objects that should not
 * be merged with another object, as only the top-level properties are merged.
 *
 * The following description does not take into account the optional
 * Context object (i.e. it is ignored for these purposes).
 * 
 * If first arg to Bunyan logger is meta object, then this meta will
 * be combined with meta stored with WrappedLogger (dtag, requestId).
 * Here are some examples:
 * 
 *   // debug writes "hi there", "msg" property with value "hi there"
 *   //   added to standard log entry
 *   logger.info ("hi there")
 *
 *   // debug writes obj to console, logger emits standard entry and
 *   //   includes property 'a'
 *   logger.info ({ a : 'test'})
 *   
 *   // same as above, and adds a "msg" property with value "hi there"
 *   //   added to standard log entry
 *   logger.info ({ a : 'test'}, "hi there")
 *
 *   // same as above, but passes Koa Context 'this' (ctx) as first arg
 *   //   which adds 'requestId' (X-Request-Id) to log entry
 *   logger.info (this, { a : 'test'}, "hi there")
 */
var _isKoaCtx = function (x) {
    return typeof x === 'object' && 'state' in x && 'req' in x &&
        'res' in x && 'cookies' in x;
}

var makeLogWrapFunc = function (levelName) {
var _levelName = levelName;
return function () {
    // If first argument is object, the second argument is the message.
    // Use the message argument (if any) to pass to Debug

    // First argument is meta
    var hasMeta = false;
    var len = arguments.length;
    var debugMsg = "";

    // duplicate arguments
    var args = [];
    for (var i = 0 ; i < len ; ++i) 
        args.push (arguments [i]);

    // Detect if first argument is ctx 'this', and get requestId.
    // N.B. Not a great test here.  Do a few more things.
    var requestId;
    if (len >= 1) {
        var arg0 = args [0];
        if (_isKoaCtx (arg0)) {
            requestId = arg0.state.requestId;
            // Remove ctx from args
            args.shift ();
            len = len - 1;
        }
    }

    // Make debugMsg
    if (len >= 1) {
        if (typeof args [0] === 'object' && typeof args [0] !== Error)
            hasMeta = true;

        // If hasMeta, use this to make debugMsg
        if (hasMeta) {
            debugMsg = args [0];
            if (len == 2)  // meta + msg => merge
                debugMsg ['msg'] = args [1];
        } else {
            debugMsg = args [0];  // message only, first arg goes to debugMsg
        }
    }

    // this.debug () only exists if there is a dtag associated with logger
    if (this.debug)
        this.debug (debugMsg);

    // Prepare meta for logger (dtag and requestId)
    var meta = this.dtag ? { dtag: this.dtag } : {};
    if (requestId)
        meta ['requestId'] = requestId;

    if (hasMeta) {
        var x = Object.assign ({}, args [0]);   // copy arg0 to avoid change
        args [0] = Object.assign (x, meta);     // merge arg0 copy and meta
    } else
        args.unshift (meta);  // no meta, shift ours on

    // Call logger with args
    var fn = this.realLogger [_levelName];
    fn.apply (this.realLogger, args);
}
}

WrappedLogger.prototype.trace = makeLogWrapFunc ('trace');
WrappedLogger.prototype.debug = makeLogWrapFunc ('debug');
WrappedLogger.prototype.info = makeLogWrapFunc ('info');
WrappedLogger.prototype.warn = makeLogWrapFunc ('warn');
WrappedLogger.prototype.error = makeLogWrapFunc ('error');
WrappedLogger.prototype.fatal = makeLogWrapFunc ('fatal');
