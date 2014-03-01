var fs = require("fs");
var MovieService = require("../services/MovieService");
var movieService = new MovieService();

var folders = [
	"\\\\IX4-300D\\Movies\\DvdRips",
	"\\\\IX4-300D\\Movies\\movies1",
	"\\\\IX4-300D\\Movies\\movies2"
];
var getFolders = function(path) {
	fs.readdir(path, function(err, folders) {
		folders.forEach(function(folder) {
			findMongoMatch(path, folder);
		});
	});
};

var findMongoMatch = function(path, parentFolder) {
	var regex = new RegExp(parentFolder, "i");
	movieService.findOne({
		'file.parentFolder': {
			"$regex": regex,
			"$options": "i"
		}
	}).then(function(movie) {
		fs.readdir(path + "/" + parentFolder, function(err, files) {
			files.forEach(function(file) {
				if (file.toLowerCase() === movie.file.filename) {
					movieService.update(movie.id, {
						"file.parentFolder": parentFolder,
						"file.filename": file
					}).then(function() {
						console.log("Updated %s/%s", parentFolder, file);
					});
				}
			});

		});
	}).fail(function() {
		console.log(parentFolder + " not found");
		console.log(arguments);
	});
};

folders.forEach(getFolders);