
var fs = require ('fs');

var ConfigFile = {}
module.exports = ConfigFile;

/**
 * optValidator should take an object and if not valid, throw a helpful
 * error message.  If valid, should return the validated/cleaned config
 * object.
 */
ConfigFile.readSync = function (filename, optValidator) {
    var contents;

    try {
        contents = fs.readFileSync (filename, 'utf-8');
    } catch (e) {
        var msg = `Problem reading json conf file ${ filename } : ${ e }`;
        throw new Error (msg);
    }

    var config;
    try {
        config = JSON.parse (contents);
    } catch (e) {
        var msg = `Problem parsing json conf file ${ filename } : ${ e }`;
        throw new Error (msg);
    }

    if (optValidator) {
        var validConfig;
        try {
            validConfig = optValidator (config);
        } catch (e) {
            var msg = `Invalid conf file ${ filename } : ${ e }`;
            throw new Error (msg);
        }

        return validConfig;
    }

    return config;
}

/**
 * Will look at directories in order for the filename, and then
 * read when it finds it.
 */
ConfigFile.findReadSync = function (filename, dirs, optValidator) {
    var dir = dirs.find (d => {
        var path = `${ d }/${ filename }`;
        return fs.existsSync (path);
    });

    var path = `${ dir }/${ filename }`;

    if ( ! dir) {
        var msg = `Couldn\'t locate conf file ${ filename } at any of the ` +
            `expected directories ${ dirs }`;
        throw new Error (msg);
    }

    return ConfigFile.readSync (path, optValidator);
}
