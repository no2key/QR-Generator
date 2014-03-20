var qr = require('qr-image');

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
        var getParam = function (param) {
            var shorten = param[0];
            return req.query[param] || req.query[shorten] || req.body[param] || req.body[shorten];
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

            res.header('Content-Type', 'image/png');

            client.get(key, function (err, result) {
                if (result) {
                    res.send(new Buffer(result, 'binary'), 200);
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
                    });
                }
            });
        } else {
            res.send({
                error : 'Specify content pls. '
            }, 404);
        }
    }
};
