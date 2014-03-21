var os = require('os');
var cluster = require('cluster');
var http = require('http');
var url = require('url');

var qr = require('./api/controllers/QrController');

var startServer = function (argument) {
    http.createServer(function (request, response) {
        var urlObj = url.parse(request.url);
        if (urlObj.pathname === '/qr/gen') {
            qr.gen(request, response);
        } else {
            response.writeHead(404, {
                'Content-Type' : 'text/plain'
            });
            response.end();
        }

    }).listen(1337);
};

var environment = process.env.NODE_ENV;
if (environment === 'production') {
    if (cluster.isMaster) {
        var i = 0;
        for (i; i < os.cpus().length; i++) {
            cluster.fork();
        }
    } else {
        console.log('Cluster start! ');
        startServer.call(this);
    }
} else {
    startServer.call(this);
}
