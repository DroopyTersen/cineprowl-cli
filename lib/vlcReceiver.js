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
			}
			catch(ex) {
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

		var server = require('http').createServer(function(req, res) {
			try {
				var url = urlUtil.parse(req.url, true);
				if (url.pathname === "/play") {
					launchVlc(url.query.filepath);
				} else if (url.pathname === "/stop") {
					killVlc();
				} else {
					proxy.on("error", function() {
						console.log("FOUND PROXY ERROR");
						try {
							res.writeHead(400, {'Content-Type': 'text/plain'});
							res.end("No VLC Endpoint Found");
						} catch (ex) {
							console.log(ex);
						}
					});
					proxy.web(req, res, {
						target: 'http://127.0.0.1:8080',
					});
				}
				console.log(req.url);
			} catch (ex) {
				console.log(ex);
			}
		});


		console.log("listening on port " + options.port);

		server.listen(options.port);		
	}
};

module.exports = vlcReceiver;