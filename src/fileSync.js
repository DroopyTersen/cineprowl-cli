var fs = require("fs");
var imdbService = require("droopy-imdb");
var movieService = require("./movieService");
var Q = require("q");

var config = {
	folderPaths: [
		// "\\\\IX4-300D\\Movies\\DvdRips",
		// "\\\\IX4-300D\\Movies\\movies1",
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


exports.execute = function () {
	//Foreach library folder
	config.folderPaths.forEach(function (libraryPath) {
		//get all the sub folders of that library
		Q.nfcall(fs.readdir, libraryPath)
			.then(function(movieFolders) {
                movieFolders = movieFolders.sort();
				return processMovieFolders(libraryPath, movieFolders);
			}).catch(err => console.log(err));
	});

	console.log("Checking for new files...");

	//Need to hit MovieDB synchrounously to avoid thresholds (30 calls in 10 seconds);
	setTimeout(function(){
        console.log("New folders: " + newFolders.join(", "));
		newFolders.forEach(function(file, index){
			setTimeout(function(){
				processNewFile(file);
			}, (index + 1) * 1500);
		});
	}, 20000);
};

var newFolders = [];

var processMovieFolders = function (libraryPath, movieFolders) {
	//Process each movie folder in the library
	return Q.all(movieFolders.map(function (movieFolder) {
		return processMovieFolder(libraryPath, movieFolder);
	}));
};

var processNewFile = function (file) {
	console.log("\n" + file.parentFolder);
	searchMovieDb(file)
		.then(getImdbRating)
		.then(insertMovie)
		.then(function (movie) {
			if (!movie) return null;
			var message = "\n\nINSERTED: " + movie.title + "\n\n";
			console.log(message);
		})
		.fail(function (error) {
			console.log("\n\n=== ERROR ===");
			console.log(error + "\n");
		});
};

var processMovieFolder = function (libraryPath, parentFolder) {
	return getMovieFile(libraryPath, parentFolder)
		.then(checkIfExists)
		.then(function (file) {
			if (file) {
                console.log(file)
				newFolders.push(file);
			}
		})
		.fail(function () {
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

var getQuality = function (size) {
	if (size > 4000) {
		return "1080p";
	} else if (size > 1500) {
		return "720p";
	} else {
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
				if (config.videoExtensions[extension] && 
                filename.toLowerCase().indexOf("sample") === -1 
                && filename.toLowerCase().indexOf("etrg") !== 0) {
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
				} else {
					return null;
				}
			}
		})
		.fail(function () {
			console.log("Failed to get file status for " + filepath);
			console.log(arguments);
		});
};

var checkIfExists = function (file) {
	if (!file) return null;

	return movieService.checkIfExists({
		"file.filename": file.filename,
		"file.parentFolder": file.parentFolder
	}).then(function (exists) {
		return !exists ? file : null;
	}, function () {
		console.log("Couldn't check " + file.parentFolder)
	});
};

var searchMovieDb = function (file) {
	if (!file) return null;
	var year = null;
	var search = file.parentFolder;
	var yearIndex = search.search(/(20\d\d|19\d\d)/);
	if (yearIndex > -1) {
		year = search.substr(yearIndex, 4);
		search = search.substr(0, yearIndex);
	}

	search = search.replace(/\./g, " ")
		.replace(/[^A-Za-z0-9]/g, ' ')
		.trim();

	console.log("Searching: " + search);
	return movieDbService.searchForOne(search)
		.then(function (movie) {
			if (movie) {
				movie.file = file;
			}
			return movie;
		}, function () {
			console.log("Couldn't find " + search)
		});
};

var getImdbRating = function (movie) {
	if (!movie) return null;
	return imdbService.getRating(movie.imdb_id).then(function (rating) {
		movie.rating = rating;
		return movie;
	});
};

var insertMovie = function (movie) {
	if (!movie) return null;
	movie.watched = false;
	return movieService.insert(movie);
};