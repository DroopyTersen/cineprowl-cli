var request = require("request"),
	exec = require('child_process').exec,
	Q = require("q"),
	cheerio = require("cheerio"),
	movieService = new(require("CineProwl-Services")).MovieService();

var torrentHunter = function() {
	var movies = [];
	var baseUrl = "http://kickass.to/movies/"
	var processedPages = 0;
	var maxPage = 10;
	var deferred = null;
	var processHtml = function(html) {
		var $ = cheerio.load(html);

		$("tr[id^=torrent_movies_torrents]").each(function() {
			var fullname = $(this).find(".torrentname > a").text();
			var undesired = /CAM|FRENCH/i;

			if (!undesired.test(fullname)) {
				var index = fullname.search(/\(|\[|-|20\d\d|19\d\d/);
				var name = fullname;
				if (index > -1) {
					name = fullname.substring(0, index);
				}
				name = name.trim().replace(/\./g, "");
				var comments = $(this).find(".icomment em").text();
				if (comments > 5) {
					var movie = {
						fullname: fullname,
						name: name,
						comments: comments
					};
					movies.push(movie);
				}
			}
		});
	};

	var group = function(array, prop) {
		var groups = {};
		for (var i = 0; i < array.length; i++) {
			var key = array[i][prop];
			if (groups[key]) {
				groups[key].items.push(array[i]);
			} else {
				groups[key] = {
					items: [array[i]]
				};
			}
		}
		var groupArray = [];
		for (key in groups) {
			if (groups.hasOwnProperty(key)) {
				groupArray.push({
					name: key,
					items: groups[key].items
				});
			}
		}
		return groupArray;
	};

	var callPhantom = function(url) {
		var getHtml = __dirname.replace("lib", "bin") + "/phantom-getHtml.js ";
		var cmd = "phantomjs " + getHtml + url;
		var child = exec(cmd, function(err, stdout, stderr) {
			if (stdout) {
				processHtml(stdout);
				processedPages++;
				if (processedPages === maxPage) {
					deferred.resolve(group(movies, "name"));
				}
			}
		});
	}

	return {
		search: function(maxPages) {
			deferred = Q.defer();
			processedPages = 0;
			maxPage = maxPages || maxPage;
			for (var i = 0; i < maxPage; i++) {
				var url = baseUrl + (i + 1) + "/";
				callPhantom(url);
			}
			return deferred.promise;
		},
		removeOwned: function(movies) {
			deferred = Q.defer();
			var notOwned = [];
			var mongoCalls = 0;
			movies.forEach(function(m) {
				var patt = new RegExp(m.name,"i");
				movieService.checkIfExists( { title: patt }).then(function(exists){
					mongoCalls++;
					if (exists === false) {
						notOwned.push(m);
						if (mongoCalls >= movies.length) {
							notOwned.sort(function(a,b) { return a.name < b.name ? -1 : 1 });
							deferred.resolve(notOwned);
						}
					}
				});
			});
			return deferred.promise;
		}
	}
}

module.exports = torrentHunter();