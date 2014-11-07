var http = require("http");
var movieService = new(require("CineProwl-Services")).MovieService();
var fs = require('fs');
var rangeParser = require('range-parser');
var urlHelper = require('url');
var mime = require('mime');
var pump = require('pump');
var ffmpeg = require("fluent-ffmpeg");
var Q = require("q");

var spawn = require('child_process').spawn;

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
    getFileSize(filepath)
      .then(function(filesize) {
        var range = req.headers.range;
        range = range && rangeParser(filesize, range)[0];
        res.setHeader('Content-Type', mime.lookup("file.webm"));
        res.statusCode = 200;
        res.setHeader("Connection", "keep-alive")
        res.setHeader('Content-Length', range.end - range.start + 1);
        res.setHeader('Content-Duration', range.end - range.start + 1);
        res.setHeader('X-Content-Duration', range.end - range.start + 1);
        res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + filesize);

        if (req.method === 'HEAD') {
          return res.end();
        }
        transcodeChunk(filepath, range, res);
      });
  }
};

var started = {};
var webmOptions = [
  '-i', 'pipe:0', //location of our video file (use absolute, else you'll have a bad time)
  '-ss', '0', //starting time offset
  '-c:v', 'libvpx', //video using vpx (webm) codec
  '-b:v', '300k', //bitrate for the video
  '-cpu-used', '2', //total # of cpus used
  '-threads', '4', //number of threads shared between all cpu-used
  '-deadline', 'realtime', //speeds up transcode time (necessary unless you want frames dropped)
  '-strict', '-2', //ffmpeg complains about using vorbis, and wanted this param
  '-c:a', 'libvorbis', //audio using the vorbis (ogg) codec
  "-f", "webm", //filetype for the pipe
  'pipe:1' //send output to stdout
];
var transcodeChunk = function(file, range, res) {
  started[file] = true;
  var ffmpeg = spawn('ffmpeg', webmOptions);
  fs.createReadStream(file, range).pipe(ffmpeg.stdin);
  ffmpeg.stdout.pipe(res);

  res.on('close', function() {
    console.log("killing transcode");
    ffmpeg.kill();
  });
}

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