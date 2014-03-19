var os = require('os');
var cluster = require('cluster');

var startServer = function (argument) {
    require('sails').lift(require('optimist').argv)
};

var environment = process.env.NODE_ENV;
if (environment === 'production') {
    if (cluster.isMaster) {
        var i = 0;
        for (i; i < os.cpus().length; i++) {
            cluster.fork();
        }
    } else {
        startServer.call(this);
    }
} else {
    startServer.call(this);
}
