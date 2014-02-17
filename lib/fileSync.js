var fs = require("fs"),
	imdbService = new(require("droopy-imdb"))(),
	config = {
		folderPaths: [
			//"C:/Users/Andrew/Movies",
			"\\\\IX4-300D\\Movies\\DvdRips",
			"\\\\IX4-300D\\Movies\\movies1",
			"\\\\IX4-300D\\Movies\\movies2"
		],
		videoExtensions: {
			"mkv": 1,
			"avi": 1,
			"mp4": 1,
			"m2ts": 1,
			"m4v": 1,
			"wmv": 1
		},
		movieDb: {
			key: "9bc8fa1df47f3dde957bbd7f9dd5b48a"
		}
	},
	movieDbService = new(require("droopy-moviedb"))(config.movieDb.key),
	movieService = new(require("../../Services/MovieService"))();


var getFolders = function(path) {
	fs.readdir(path, function(errors, folders) {
		folders.forEach(function(folder, index) {
			setTimeout(function(){
				getFiles(path.toLowerCase(), folder.toLowerCase());
			}, 500 * (index + 1));
		});
	});
};

var getFiles = function(path, folder) {
	var folderpath = path + "/" + folder;
	fs.readdir(folderpath, function(err, items) {
		if (err) {
			console.log(err);
		} else {
			items.forEach(function(item) {
				getFileStats(path, folder, item.toLowerCase());
			});
		}
	});
};

var getFileStats = function(path, folder, filename) {
	fs.stat(path + "/" + folder + "/" + filename, function(err, stats) {
		if (err) {
			console.log(err);
		} else {
			//console.log("Opened " + folder + "/" + filename);
			var dotSplit = filename.split(".");
			var extension = dotSplit.length > 0 ? dotSplit[dotSplit.length - 1] : null;
			//see if its a video file
			if (stats.isFile() && config.videoExtensions[extension] != null && filename.indexOf("sample") === -1 && filename.indexOf("etrg") === -1) {
				var size = (stats.size / 1048576).toFixed(2);
				checkIfMovieExists({
					parentFolder: folder,
					library: path,
					filename: filename,
					filepath: path + "/" + folder + "/" + filename,
					extension: extension,
					size: size,
					quality: getQuality(size)
				});
			}
		}
	});
};

var getQuality = function(size) {
	if (size > 4000) {
		return "1080p";
	} else if (size > 1500) {
		return "720p";
	} else {
		return "DVD";
	}
};

var checkIfMovieExists = function(file) {
	file.filepath = file.filepath.replace(/\//g, "\\");
	movieService.checkIfExists({
		"file.filepath": file.filepath
	}).then(function(exists) {
		if (exists === false) {
			searchByFolderName(file);
		}
	});
};

var searchByFolderName = function(file) {
	var search = file.parentFolder
						.replace(/\./g, " ")
						.replace(/(20\d\d|19\d\d)$/, "")
						.trim();
	movieDbService.searchForOne(search).then(function(movie) {
		movie.casts.cast = movie.casts.cast.sort(function(a, b){
			return a.order <= b.order ? -1 : 1;
		});
		movie.file = file;
		var usReleases = movie.releases.countries.filter(function(country){
			return country.iso_3166_1 === "US";
		});
		movie.mpaa = usReleases.length > 0 ? usReleases[0].certification : "NR";
		getImdbRating(movie);
	}, console.log);
};

var getImdbRating = function(movie) {
	imdbService.getRating(movie.imdb_id).then(function(rating){
		movie.rating = rating;
		movie.watched = false;
		insertMovie(movie);
	});
};

var insertMovie = function(movie, file) {
	movieService.insert(movie).then(function(insertedMovies) {
		console.log("SUCCESS: Inserted " + insertedMovies[0].title);
	}).fail(function(err) {
		console.log("MONGO ERROR");
		console.log(err);
	});
};

module.exports = function() {
	config.folderPaths.forEach(getFolders);
};
