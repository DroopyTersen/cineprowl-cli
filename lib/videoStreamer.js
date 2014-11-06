var http = require("http");
var movieService = new(require("CineProwl-Services")).MovieService();
var fs = require('fs');
var rangeParser = require('range-parser');
var urlHelper = require('url');
var mime = require('mime');
var pump = require('pump');
var ffmpeg = require("fluent-ffmpeg");
var Q = require("q");

var createServer = function() {
  var server = http.createServer();

  server.on('request', function(req, res) {
    //allow crossdomain requests
    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    }
    routeRequest(req, res);
  }).on('connection', function(socket) {
    socket.setTimeout(36000000);
  });

  return server;
};

// /stream/1234?size=mobile&seek=530
// [size = raw], [seek = null]
var routeRequest = function(req, res) {
  var url = urlHelper.parse(req.url, true);
  if (url.pathname.indexOf("stream") != -1) {
    var movieId = url.pathname.replace("/stream/", "");
    var size = url.query.size || "raw";
    movieService.getById(movieId)
      .then(function(movie) {
        if (movie) {
          streamers[size](req, res, movie.file.filepath, url.query.seek);
        }
        else {
          sendError(res, 404, "Unable to find movie with id of " + movieId);
        }
      })
      .fail(function(error) {
        sendError(res, 404, "Unable to find movie with id of " + movieId);
      });
  }
  else {
    res.end();
  }
};

var streamers = {
  raw: function(req, res, filepath) {
    getFileSize(filepath)
      .then(function(filesize) {
        var range = req.headers.range;
        range = range && rangeParser(filesize, range)[0];
        res.setHeader('Content-Type', mime.lookup(filepath));
        
        if (!range) {
          // No range
          res.setHeader('Content-Length', filesize);
          if (res.method === 'HEAD') {
            return res.end();
          }
          pump(fs.createReadStream(filepath), res);
        }
        else {
          //Ranged stream
          res.statusCode = 206;
          res.setHeader('Content-Length', range.end - range.start + 1);
          res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + filesize);
          pump(fs.createReadStream(filepath, range), res);
        }
      })
      .fail(function() {
        sendError(res, 500, "Sorry couldn't stream the movie");
      });
  },
  mobile: function(req, res, filepath, seek) {
    //TODO: take webm ffmpeg code from DW and add here
    return streamers.raw(req, res, filepath);
  }
};

var getFileSize = function(filepath) {
  return Q.nfcall(fs.stat, filepath)
    .then(function(stats) {
      return stats.size;
    });
};

var sendError = function(res, statusCode, message) {
  res.statusCode = statusCode;
  res.end(message);
};

exports.start = function() {
  var port = process.env.PORT || 8081;
  var server = createServer();
  server.listen(port, function() {
    console.log('Video streaming server listening on port ' + port);
  });
};