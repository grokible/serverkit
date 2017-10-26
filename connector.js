
var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor;

var inherits = require ('inherits');

var Connector = ctor (function Connector (pool, dbw) {
    this.pool = pool;
    this.dbw = dbw;
    
    this.stats = { state: 'open', created: + new Date () };
});

inherits (Connector, Object);
module.exports = Connector;

Connector.prototype.pool = function () {
    return this.pool;
}

Connector.prototype.getDb = function () {
    this.dbw.inUse = true;
    this.dbw.stats ['usedCount'] += 1;
    this.dbw.stats ['lastUsed'] = + new Date ();
    
    return this.dbw.getDb ();
}

// Returns promise
Connector.prototype.release = function () {
    return this.pool.release (this);
}


