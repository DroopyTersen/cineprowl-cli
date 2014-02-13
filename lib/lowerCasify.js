var fs = require("fs"),
var MovieService = require("../../Services/MovieService"),
var movieService = new MovieService();
var folders = [
	"\\\\IX4-300D\\Movies\\DvdRips",
	"\\\\IX4-300D\\Movies\\movies2",
	"\\\\IX4-300D\\Movies\\movies1"
];
var getFolders = function(path) {
	fs.readdir(path, function(err, folders) {
		folders.forEach(function(folder) {
			console.log(JSON.stringify(folder));
		});
	});
}

var findMongoMatch = function(path, parentFolder) {
	var patt = new RegExp(parentFolder, "i");
	movieService.findOne({
		file.parentFolder: patt
	}).then(function(movies) {
		fs.readdir(path + "/" + parentFolder, function(err, files) {
			var filename = "";
			files.forEach(function(file) {
				if (file.toLowerCase() === movie.file.filename) {
					filename = file;
				}
			});
			movieService.update(movie.id, {
				"file.parentFolder": parentFolder,
				"file.fileName": filename
			});
		});
	}).fail(function() {
		console.log(parentFolder + " not found")
	});
};