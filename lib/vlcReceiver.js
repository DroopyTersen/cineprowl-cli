var http = require('http'),
	httpProxy = require('http-proxy'),
	exec = require('child_process').exec,
	urlUtil = require('url');

var vlcReceiver = {
	start: function(options) {
		var proxy = httpProxy.createProxyServer();

		var defaults = {
			exePath: '"C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe"',
			port: 5050
		};

		options.exePath = options.exePath || defaults.exePath;
		options.port = options.port || defaults.port;

		var killVlc = function() {
			try {
				//var cmd = 'tasklist /fi "ImageName eq vlc.exe" /fo csv /nh';
				var cmd = 'taskkill /IM vlc.exe';
				var child = exec(cmd, function(err, stdout, stderr) {
					if (err) {
						console.log(err);
						console.log(stderr);
					}
				});
			} catch (ex) {
				console.log("kill catch");
			}
		};

		var launchVlc = function(filepath) {
			var params = " -f " + " \"" + filepath + "\" --extraintf http",
				exec = require('child_process').exec;

			var child = exec(options.exePath + params, function(err, stdout, stderr) {
				if (err) {
					console.log(err);
					console.log(stderr);
				}
			});
		};

		var respond = function(res, code, response) {
			res.writeHead(code, {
				'Content-Type': 'application/json'
			});
			res.end(JSON.stringify({
				"message": response
			}));
		};

		var server = require('http').createServer(function(req, res) {
			try {
				

				var url = urlUtil.parse(req.url, true);
				if (url.pathname === "/play") {
					console.log(req.url);
					launchVlc(url.query.filepath);
					respond(res, 200, "Launched " + url.query.filepath);
				} else if (url.pathname === "/stop") {
					console.log(req.url);
					killVlc();
					respond(res, 200, "Closed " + url.query.filepath);
				} else {
					proxy.on("error", function() {
						console.log("VLC Endpoint Not Found");
						setTimeout(function(){
							respond(res, 500, "No VLC Endpoint found");
						}, 500);
					});
					proxy.web(req, res, {
						target: 'http://127.0.0.1:8080',
					});
				}
			} catch (ex) {
				console.log(ex);
				respond(res, 500, JSON.stringify(ex));
			}
		});


		console.log("listening on port " + options.port);
		server.listen(options.port);
	}
};

module.exports = vlcReceiver;