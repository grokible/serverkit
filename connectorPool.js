
var Connector = require ('./connector');

var dtag = 'gga:cpool';

var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor,
    Opt = UtilBase.Opt;

var inherits = require ('inherits'),
    Debug = require ('debug');

var debug = Debug (dtag);

var C_DEFAULT_MIN_LENGTH = 2;

var DbWrapper = ctor (function DbWrapper (db) {
    this.db = db;
    this.inUse = false;   // Is this assigned to a connector (not in queue)
    this.state = 'open';  // open, closed, error (failed to close)

    this.stats = {
        created: + new Date (),  // time created - if queue low
        usedCount: 0,            // number of times assigned to a connector
        usedTime: 0,             // cumulative millis assigned to a connector
        lastUsed: undefined,     // last assigned timestamp
        lastUsedMillis: undefined,     // last millis acquire to release
    };
});

inherits (DbWrapper, Object);

DbWrapper.prototype.getDb = function () {
    return this.db;
}

/**
 * ConnectorPool - creates a pool that manages db connections.
 * In a test of pooling where we always reuse connections versus never
 * reusing (maxlen=0, minlen=0), with a 3.5KB data load from local mongo
 * on a mac powerbook:
 *
 *     1. Never reuse:  74ms avg, 13 calls per sec
 *     2. Always reuse: 27ms avg, 38 calls per sec
 *
 * So 3x advantage.
 * The pool has a minlen and maxlen and other controls for lifetime
 * of db objects.  There are also stats for the pool, db objects and
 * individual connectors.  These are for performance and leak detection
 * and prevention.
 */
var validOpt = {
    minlen: C_DEFAULT_MIN_LENGTH,  // optional
    maxlen: undefined,             // REQUIRED
    logger: undefined,             // REQUIRED
    countToLive: 0,                // optional => must be an int, 0 => disable

    createDbFn: undefined,         // REQUIRED.  Must return Promise (db)
    destroyDbFn: undefined,        // REQUIRED.  Must return Promise ()
                                   //   and close.db
};

var ConnectorPool = ctor (function ConnectorPool (opt) {
    this.options = Opt (validOpt, opt);

    var minlen = this.options.get ('minlen');
    var maxlen = this.options.get ('maxlen', true);  // required

    debug (`Pool created minlen=${ minlen } maxlen=${ maxlen }`);

    var maxlen = this.options.check ('maxlen', minlen <= maxlen,
        `minlen=${ minlen } <= maxlen=${ maxlen }`);

    var logger = this.options.get ('logger', true);  // required

    this.createDbFn = this.options.get ('createDbFn', true);  // required
    this.destroyDbFn = this.options.get ('destroyDbFn', true);  // required


    this.connections = [];

    this.stats = {
        dbCreated: 0,        // total db created
        dbDestroyed: 0,      // current count db - if unkn counts +1
        connCreated: 0,      // total Connectors created
        connDestroyed: 0,    // current Connector count (created - released)
        totalUsedMillis: 0,  // total dbw.usedTime
        created: + new Date (),

        maxUsedMillis: 0,    // "used" => PoolConnector lifetime
        maxUsedCount: 0,

        // computed on getStats
        ageInMillis: undefined,
        avgUsedMillis: undefined,  // avg time from acquire to release
        queueLength: undefined,    // holds idle dbws

        dbActive: undefined,       // dbCreated - (dbDestroyed + queueLength)
                                   //   [check against idea of how many are
                                   //    active for leak detection]
                                   // If all calls are done (e.g. at program's
                                   //   end, dbActive should be zero).
    };
});

inherits (ConnectorPool, Object);

module.exports = ConnectorPool;

ConnectorPool.prototype.getStats = function () {
    var now = + new Date ();
    this.stats.ageInMillis = now - this.stats.created;

    this.stats.avgUsedMillis = this.stats.totalUsedMillis /
        this.stats.ageInMillis;

    this.stats.queueLength = this.connections.length;

    this.stats.dbActive = this.stats.dbCreated - (this.stats.dbDestroyed +
        this.stats.queueLength);                                             

    return this.stats;
}

ConnectorPool.prototype.acquire = function () {
    var minlen = this.options.get ('minlen');
    var len = this.connections.length;

    // If too low, create a new db connection and insert into the queue
    // and take the next off the queue.

    var that = { db: undefined, dbw: undefined };

    var pr = new Promise ((resolve, reject) => {
        resolve (null);
    })
    .then (() => {
        if (len == 0 || len <= minlen)
            that.db = this.createDbFn ();

        return that.db;
    })
    .then (db => {
        if (db) {
            this.stats.dbCreated++;

            // Push new one on end to use later, use old one from top
            this.connections.push (DbWrapper (db));
        }

        that.dbw = this.connections.shift ();
        return that.dbw;
    })
    .then (dbw => {
        var mc = Connector (this, dbw);

        dbw.stats.usedCount++;
        this.stats.maxUsedCount =
            Math.max (dbw.stats.usedCount, this.stats.maxUsedCount);

        this.stats.connCreated++;
        return mc;
    })
    .catch (e => {
        this.options.get ('logger').error (`Error: mpool.acquire : ${ e }`);

        // We don't attempt to destroy the things leaking as we don't know
        // if that will cause other problems.  We just report it.

        if (that.dbw !== undefined)
            this.options.get ('logger').error (`Error: DBW LEAK in acquire`);

        if (that.db !== undefined)
            this.options.get ('logger').error (`Error: DB LEAK in acquire`);

        return null;
    })

    return pr;
}

ConnectorPool.prototype.release = function (connector) {
    var dbw = connector.dbw;

    if ( ! dbw) {
        debug (`Possible bug? Connector just released was prev released!`);
        return false;
    }

    connector.dbw = null;
    dbw.inUse = false;

    var db = dbw.getDb ();

    var maxlen = this.options.get ('maxlen');
    var len = this.connections.length;

    // Update usedMillis stats
    var usedMillis = + new Date () - dbw.stats.lastUsed;
    dbw.stats.lastUsedMillis = usedMillis;
    dbw.stats.usedTime += usedMillis;

    this.stats.maxUsedMillis =
        Math.max (dbw.stats.usedTime, this.stats.maxUsedMillis);

    this.stats.totalUsedMillis += usedMillis;

    var countToLive = this.options.get ('countToLive');
    var expired = false;
    if (countToLive > 0 && dbw.stats.usedCount >= countToLive)
        expired = true;

    this.stats.connDestroyed++;


    // If there is room on the queue, add the db, otherwise reap it.
    if (len < maxlen && ! expired) {
        this.connections.push (dbw);
        return Promise.resolve (true);
    } else {
        var pr = Promise.resolve (1)
        .then (() => {
            return this.destroyDbFn (db);
        })
        .then (() => {

            // N.B. if db.close fails, the db MAY still exist or MAY be
            // closed.  It is impossible to know.  So we have a conservative
            // count (it is assumed alive).

            this.stats.dbDestroyed++;
            dbw.stats.state = 'closed';

            debug (`Successfully closed a db`);
            
            return true;
        })
        .catch (e => {
            dbw.stats ['state'] = 'error:close';

            this.options.get ('logger').error (`Error: mpool.release ` +
                `error on close : ${ e }`);

            return false;
        });

        return pr;
    }

    return pr;
}

