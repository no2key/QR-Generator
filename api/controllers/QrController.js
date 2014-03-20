var querystring = require('querystring');
var url = require('url');

var qr = require('qr-image');
var cache = require('memory-cache');

var redis = require('redis');
var client = redis.createClient();

var getBuffer = function (buffers, length) {
    var buffer;

    switch(buffers.length) {
    case 0:
        buffer = new Buffer(0);
        break;
    case 1:
        buffer = buffers[0];
        break;
    default:
        buffer = new Buffer(length);
        var i;
        var pos;
        var l;
        for (i = 0, pos = 0, l = buffers.length; i < l; i++) {
            var chunk = buffers[i];
            chunk.copy(buffer, pos);
            pos += chunk.length;
        }
        break;
    }

    return buffer;
};

module.exports = {
    gen : function (req, res) {
        var queryObj = querystring.parse(url.parse(req.url).query);
        var getParam = function (param) {
            var shorten = param[0];
            return queryObj[param] || queryObj[shorten];
        };

        var size = getParam('size') || 5;
        var encoding = getParam('encoding') || 'utf-8';
        var content = getParam('content');
        var leven = getParam('leven') || 'M';
        var margin = getParam('margin') || 2;

        var options = {
            type : 'png',
            size : parseInt(size),
            encoding : encoding,
            ec_level : leven,
            margin : parseInt(margin, 10)
        };

        if (content !== undefined) {
            var target = qr.image(content, options);

            var key = content + size + encoding + leven + margin;

            res.writeHead(200, {
                'Content-Type' : 'image/png'
            });

            var c = cache.get(key);

            if (c) {
                res.write(new Buffer(c, 'binary'), 200);

                res.end();
                return;
            }

            client.get(key, function (err, result) {
                cache.put(key, result, 1000 * 60 * 60 * 24);

                if (result) {
                    res.write(new Buffer(result, 'binary'), 200);
                    res.end();
                } else {
                    var buffers = [];
                    var nread = 0;

                    target.pipe(res);

                    target.on('data', function (chunk) {
                        buffers.push(chunk);
                        nread += chunk.length;
                    });

                    target.on('end', function (chunk) {
                        var buffer = getBuffer(buffers, nread);

                        client.set(key, buffer.toString('binary'), function (err, result) {
                            return;
                        });

                        res.write(buffer, 200);
                        res.end();
                    });
                }
            });
        } else {
            res.write(JSON.stringify({
                error : 'Specify content pls. '
            }), 404);
            res.end();
        }
    }
};
