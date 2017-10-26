'use strict';

var Services = require ('./services'),
    Koa = require ('koa'),
    expect = require ('chai').expect;

var errors = require ('request-promise/errors');

var RestService = require ('./restService');

var app = new Koa ();

// Dummy config
var cfg = {
    appName: 'gga-api-test',
    dtagPrefix: 'gga-test',
    port: 3000,
    rootDir: `${ __dirname }/..`,

    koaApp: app,

    loadMeta: {
        services: []
    },
}

// Initialize Services with MockLogger
Services (cfg);
var services = Services.instance ();

describe ("RestService", function () {

    describe ("ctor", function () {
        it ("defaults", function () {
            var rs = RestService (services, { name: 'myService' });
            expect (rs).to.have.property ('host', 'localhost');
            expect (rs).to.have.property ('port', 443);
            expect (rs).to.have.property ('isHttps', true);
            expect (rs).to.have.property ('prefix', "");

            expect (rs.getName ()).to.be.equal ("myService");
        });

        it ("non-defaults", function () {
            var rs = RestService (services, {
                name: 'myService',
                host: 'www.yahoo.com',
                port: 80,
                https: false,
                prefix: '/myfolder',
            });

            expect (rs).to.have.property ('host', 'www.yahoo.com');
            expect (rs).to.have.property ('port', 80);
            expect (rs).to.have.property ('isHttps', false);
            expect (rs).to.have.property ('prefix', "/myfolder");

            expect (rs.getName ()).to.be.equal ("myService");
        });
    });

    describe ("url", function () {
        it ("defaults", function () {
            var rs = RestService (services, { name: 'myService' });
            var url;

            // Note default https, host default is localhost.  Also note
            // that the port is not shown since it is default (https 443)
            url = rs.url ("/foobar");
            expect (url).to.be.equal ("https://localhost/foobar");

            // Note same defaults as ex above, and that the query options
            // are correctly urlencoded (space = %20)
            url = rs.url ("/foobar", { hi: "there you" });
            expect (url).to.be.equal (
                "https://localhost/foobar?hi=there%20you");
        });

        it ("non-defaults", function () {
            var rs = RestService (services, {
                name: 'myService',
                host: 'www.yahoo.com',
                port: 80,
                https: false,
                prefix: '/myfolder',
            });
            
            var url;
            
            // Note full path composed of prefix and passed uri.  Using
            // http (https = false in defs) and 80, so since 80 is default
            // it's not shown.
            // Since we specify a prefix in the service, we get that
            // prepended to our call

            url = rs.url ("/foobar");
            expect (url).to.be.equal ("http://www.yahoo.com/myfolder/foobar");

            url = rs.url ("/foobar", { hi: 'there you', term: 5 });
            expect (url).to.be.equal (
                "http://www.yahoo.com/myfolder/foobar?hi=there%20you&term=5");
        });
    });

    describe ("get", function () {
        it ("get www.google.com", (done) => {

            var rs = RestService (services, {
                name: 'myService',
                host: 'www.google.com',
                port: 80,
                https: false,
            });
            
            rs.get ("/")
            .then (x => {
                expect (x.length > 1000).to.be.true;
                done ();
            });
        });

        it ("post www.google.com", (done) => {

            var rs = RestService (services, {
                name: 'myService',
                host: 'www.google.com',
                port: 80,
                https: false,
            });
            
            rs.post ("/", { hi: 'there' })
            .then (x => {
                // not expected to succeed, POSTing to www.yahoo.com
                expect (false).to.be.true;
                done ();
            })
            .catch (exc => {
                done ();
            })
        });
    });

});
