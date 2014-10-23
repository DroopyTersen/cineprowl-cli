var fs = require("fs"),
	imdbService = new(require("droopy-imdb"))(),
	movieService = new(require("CineProwl-Services")).MovieService(),
	Q = require("q"),
	config = {
		folderPaths: [
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
	};

var movieDbService = new(require("droopy-moviedb"))(config.movieDb.key);


exports.execute = function() {
	//Foreach library folder
	config.folderPaths.forEach(function(libraryPath) {
		//get all the sub folders of that library
		Q.nfcall(fs.readdir, libraryPath)
			.then(function(movieFolders) {
				return processMovieFolders(libraryPath, movieFolders);
			});
	});
};

var processMovieFolders = function(libraryPath, movieFolders) {
	//Process each movie folder in the library
	return Q.all(movieFolders.map(function(movieFolder) {
		return processMovieFolder(libraryPath, movieFolder);
	}));
};

var processMovieFolder = function(libraryPath, parentFolder) {
	return getMovieFile(libraryPath, parentFolder)
		.then(checkIfExists)
		.then(searchMovieDb)
		.then(getImdbRating)
		.then(insertMovie)
		.then(function(movie) {
			if (!movie) return null;
			var message = "\nINSERTED: " + movie.title;
			console.log(message);
			// if(!movie) return null;
			// console.log(message);
		})
		.fail(function() {
			console.log("\n=== ERROR ===");
			console.log(libraryPath + parentFolder);
			console.log(JSON.stringify(arguments) + "\n");
		});
};

var getMovieFile = function(libraryPath, movieFolder) {
	var folderpath = libraryPath + "\\" + movieFolder;
	return Q.nfcall(fs.readdir, folderpath)
		.then(function(files) {
			return Q.all(files.map(function(filename) {
					console.log(movieFolder);
					return getFileStats(libraryPath, movieFolder, filename);
				}))
				.then(function(fileObjs) {
					return fileObjs.filter(function(fileObj) {
						return fileObj !== null;
					});
				})
				.then(function(nonNullFileObjs) {
					return nonNullFileObjs.length ? nonNullFileObjs[0] : null;
				});
		});
};

var getQuality = function(size) {
	if (size > 4000) {
		return "1080p";
	}
	else if (size > 1500) {
		return "720p";
	}
	else {
		return "DVD";
	}
};

var getFileStats = function(path, folder, filename) {
	var filepath = path + "\\" + folder + "/" + filename;
	var dotSplit = filename.split(".");
	var extension = dotSplit.length > 1 ? dotSplit[dotSplit.length - 1] : null;
	if (extension === null) {
		return null;
	}
	return Q.nfcall(fs.stat, filepath)
		.then(function(stats) {
			if (!stats.isFile()) {
				return null;
			}
			else {
				if (config.videoExtensions[extension] && filename.toLowerCase().indexOf("sample") === -1 && filename.toLowerCase().indexOf("etrg") === -1) {
					var size = (stats.size / 1048576).toFixed(2);
					return {
						parentFolder: folder,
						library: path,
						filename: filename,
						filepath: path + "\\" + folder + "\\" + filename,
						extension: extension,
						size: size,
						quality: getQuality(size)
					};
				}
				else {
					return null;
				}
			}
		})
		.fail(function() {
			console.log(filepath);
			console.log(arguments);
		});
};

var checkIfExists = function(file) {
	if (!file) return null;

	return movieService.checkIfExists({
		"file.filename": file.filename,
		"file.parentFolder": file.parentFolder
	}).then(function(exists) {
		return !exists ? file : null;
	});
};

var searchMovieDb = function(file) {
	if (!file) return null;
	console.log(file);
	var search = file.parentFolder
		.replace(/\./g, " ")
		.replace(/(20\d\d|19\d\d)$/, "")
		.trim();

	return movieDbService.searchForOne(search)
		.then(function(movie) {
			movie.file = file;
			return movie;
		});
};

var getImdbRating = function(movie) {
	if (!movie) return null;
	return imdbService.getRating(movie.imdb_id).then(function(rating) {
		movie.rating = rating;
		return movie;
	});
};

var insertMovie = function(movie) {
	if (!movie) return null;
	movie.watched = false;
	return movieService.insert(movie);
};