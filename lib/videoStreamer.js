var http = require("http");
var movieService = new (require("CineProwl-Services")).MovieService();
var fs = require('fs');
var rangeParser = require('range-parser');
var urlHelper = require('url');
var mime = require('mime');
var pump = require('pump');
var ffmpeg = require("fluent-ffmpeg");
var q = require("q");

var createServer = function() {
	var server = http.createServer();

	server.on('request', function(req, res) {
		var url = urlHelper.parse(req.url);
		var host = req.headers.host || 'localhost';

		if(req.headers.origin) {
			res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
		}
		
		if (url.pathname.indexOf("stream") != -1 ){
			var movieId = url.pathname.replace("/stream/", "");
			movieService.getById(movieId)
			.then(function(movie){
				if (movie) {
					streamMovie(req, res, movie.file.filepath);
				} else {
					res.statusCode = 404;
					res.end("Unable to find movie with id of " + movieId);
				}
			})
			.fail(function(error){
				sendError(res, 404, "Unable to find movie with id of " + movieId)
				
			});
		} else {
			res.end()
		}
	}).on('connection', function(socket) {
		socket.setTimeout(36000000);
	});

	return server;
};

var sendError = function(res, statusCode, message)
{
	res.writeHead(statusCode, {
		'Content-Type': 'application/text'
	});
	res.end(message);
};

var mobilePreset = function(command){
	command
		.format("m4v")
	    .size('320x?')
	    .videoBitrate('300k')
	    .videoCodec('libx264')
	    .audioBitrate('96k')
	    .audioCodec('aac')
	    .audioFrequency(22050)
	    .audioChannels(2);
			
}

var streamMovie = function(req, res, filepath) {
	var range = req.headers.range;
	fs.stat(filepath, function(err, stats){
	    if (err) {
			res.statusCode = 500;
			res.end("Unable to open file:\n" + filepath);
	    	return;
	    }
	    range = range && rangeParser(stats.size, range)[0];
    	res.setHeader('Accept-Ranges', 'bytes');
    	res.setHeader('Content-Type', mime.lookup(filepath));
    
    	if (!range) {
    		res.setHeader('Content-Length', stats.size);
    		if (res.method === 'HEAD') {
    		    return res.end();
    		}
    		ffmpeg(fs.createReadStream(filepath, range))
    			.preset(mobilePreset)
        		.on('error', function(err){
        			console.log("Uh Oh..." + err.message);
					res.statusCode = 500;
					res.end("Uh Oh..." + err.message);
					return;
        		})
        		.pipe(res, {end: true});
    		return;
    	} else {
        	res.statusCode = 206;
        	res.setHeader('Content-Length', range.end - range.start + 1);
        	res.setHeader('Content-Range', 'bytes '+ range.start + '-' + range.end + '/' + stats.size);
        
        	if (req.method === 'HEAD') {
        	    return res.end();
        	}
        	
        	ffmpeg(fs.createReadStream(filepath, range))
        		.preset(mobilePreset)
        		.on('error', function(err){
        			console.log("Uh Oh..." + err.message);
					res.statusCode = 500;
					res.end("Uh Oh..." + err.message);
					return;
        		}).pipe(res, {end: true});
        	//pump(fs.createReadStream(filepath, range), res);
    	}
	});
};

exports.start = function() {
	var port = process.env.PORT || 8081;
	var host = process.env.IP || "localhost";
	var server = createServer();
	server.listen(port, function() {
	  console.log('Video streaming server listening on port ' + port);
	});
};
