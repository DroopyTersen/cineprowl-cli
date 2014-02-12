var request = require("request"),
	cheerio = require("cheerio");



var torrentHunter = function() {
	var movies = [];
	var baseUrl = "http://kickass.to/movies/"

	var processHtml = function(err, response, body) {
		var $ = cheerio.load(body);
		console.log(body);
		$("tr[id^=torrent_movies_torrents]").each(function(){
			var fullname = $(this).find(".torrentname > a").text();
			var undesired = /CAM|FRENCH/i;

			if (!undesired.test(fullname)) {
				var index = fullname.search(/\(|\[|-|20\d\d|19\d\d/);
				var name = fullname;
				if (index > -1) {
					name = fullname.substring(0, index);
				}
				name = name.trim();
				var comments = $(this).find(".icomment em").text();
				if (comments > 5) {
					var movie = { fullname: fullname, name: name, comments: comments};
					movies.push(movie);
					console.log(movie);
				}
			}
		});
	};

	return {
		search: function(maxPages) {
			for (var i = 0; i < maxPages; i++) {
				request(baseUrl + i + "/", processHtml);
			}			
		}
	}	
}

Array.prototype.distinct = function(prop){
   var uniques = {}, uniqueArray = [];
   for(var i = 0, l = this.length; i < l; ++i){
   		var value = this[i][prop].toLowerCase();
      if (!uniques[value]) {
      	uniqueArray.push(this[i]);
      	uniques[value] = 1;
      }
   }
   return uniqueArray;
}

module.exports = torrentHunter();