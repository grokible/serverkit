
var UtilBase = require ('utilbase'),
    ctor = UtilBase.Oop.ctor,
    Opt = UtilBase.Opt,
    HttpException = UtilBase.HttpException;

var inherits = require ('inherits'),
    Debug = require ('debug');

var validOpt = { max: undefined };

var Auth = ctor (function Auth (ctx) {
    this.ctx = ctx;
});

inherits (Auth, Object);

module.exports = Auth;

Auth.prototype.getUser = function () {
    return this.ctx.req.user;
}

Auth.prototype.getRoles = function () {
    var user = this.getUser ();
    var authz = user.authorizations;
    return 'roles' in authz ? authz.roles : [];
}

Auth.prototype.checkRoles = function (roles, oDtag) {
    var user = this.getUser ();
    var userRoles = this.getRoles ();
    var ok = true;
    roles.forEach (role => {
        if ( ! userRoles.includes (role))
            ok = false;
    });

    if ( ! ok) {
        var msg = `Authz Error: user '${ user.username }', with roles ` +
            `[${ userRoles }] lacks required role (one of) [${ roles }]`;
        throw HttpException.E403 (msg, oDtag);
    }
}

Auth.provideCheckRole = function (roles, oDtag) {
    return function *(next) {
        var ctx = this;
        var auth = ctx.state.auth;
        auth.checkRoles (roles, oDtag);
        yield next;        
    }
}




