var fs = require("fs");
var imdbService = require("droopy-imdb");
var movieService = require("./movieService");
var path = require("path");
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

var promisify = function(fn, ...args) {

	return new Promise((resolve, reject) => {
		var cb = (err, val) => {
			if (err) reject(err)
			else resolve (val);
		}
		args.push(cb);
		fn.apply(null, args)
	})
};

var getDirectories = function(folder) {
	return promisify(fs.readdir, folder)
			.then(folders => folders.sort());
};

exports.execute = function() {
	var promises = config.folderPaths.map(path => {
		return getDirectories(path)
			.then(folders => findNewMovieFolders(path, folders))
			.then(val => {
				console.log(val);
				return val;
			})
			.then(throttleMovieInserts)
			.catch(err => console.log(err))
	})
}

var throttleMovieInserts = function(newFiles) {
	newFiles.forEach((file, index) => {
		setTimeout(() => processNewFile(f), (index + 1) * 1000);
	})
}

var findNewMovieFolders = function (libraryPath, folders) {
	return Promise.all(folders.map(f => processMovieFolder(libraryPath, f)))
		.then(files => files.filter(f => f !== null))
}

var processNewFile = function (file) {
	searchMovieDb(file)
		.then(setImdbRating)
		.then(insertMovie)
		.then(function (movie) {
			if (!movie) return null;
			var message = "\n\nINSERTED: " + movie.title + "\n\n";
			console.log(message);
		})
};

var processMovieFolder = function (libraryPath, parentFolder) {
	return getMovieFile(libraryPath, parentFolder)
		.then(checkIfExists)
};

var getMovieFile = function(parent, folder) {
	var folderpath = path.normalize(parent + "\\" + folder);

	return promisify(fs.readdir, folderpath)
		.then(filenames => {
			return Promise.all(filenames.map(f => {
				var filepath = path.normalize(`${parent}/${folder}/${f}`);
				return getFileStats(filepath);
			}))
		})
		.then(fileStats => fileStats.filter(f => f !== null))
		.then(fileStats => fileStats.length ? fileStats[0] : null);
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

var getFileStats = function(filepath) {
	var extension = path.extname(filepath);
	var filename = path.basename(filepath).toLowerCase();
	var parentPath = path.dirname(filepath);
	return promisify(fs.stat, filepath).then(stats => {
		if (
			stats.isFile()
			&& config.videoExtensions[extension]
			&& filename.indexOf("sample") === -1
			&& !filename.startsWith("etrg")
		) {
			var size = (stats.size / 1048576).toFixed(2);
			return {
				parentFolder: path.basename(parentPath),
				library: path.dirname(parentPath),
				filename: filename,
				filepath,
				extension,
				size,
				quality: getQuality(size)
			};
		} else return null;
	})
};

var checkIfExists = function (file) {
	if (!file) return null;
	var query = { "file.parentFolder": file.parentFolder };
	return movieService.checkIfExists(query).then(exists => !exists ? file : null)
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
		.then(movie => {
			if (movie) movie.file = file;
			return movie
		});
};

var setImdbRating = function (movie) {
	return imdbService.getRating(movie.imdb_id)
		.then(rating => {
			movie.rating = rating;
			return movie;
		})
};

var insertMovie = function (movie) {
	movie.watched = false;
	return movieService.insert(movie);
};