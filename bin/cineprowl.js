#!/usr/bin/env node
var program = require('commander'),
	torrentHunter = require("../lib/torrentHunter"),
	fileSync = require("../lib/fileSync"),
	exec = require('child_process').exec,
	movieService = new(require("../../Web/dataaccess/mongo/MovieService"))();

program
  .version('0.0.1')
  .option('-t, --torrents [pageCount]', 'Search torrents')
  .option('-s, --sync', 'Sync video libraries')
  .option('-m, --mongo [action]', 'Start or stop mongo server')
  .option('-w, --web', 'Start the web server')
  .parse(process.argv);

if (program.torrents) {
	console.log('Searching Torrents...');
	torrentHunter.search(20).then(torrentHunter.removeOwned).then(function (notOwned) {
		notOwned.forEach(function(m){
			console.log("\n%s", m.name);
			m.items.forEach(function(torrent) {
				console.log("\t%s  - %s comments", torrent.fullname, torrent.comments);
			});
		});
		process.exit();
	});
}

if (program.filesync) {
	fileSync();
}

if(program.mongo) {
	if (program.mongo === "kill") {
		var cmd = 'taskkill /F /IM mongod.exe';
		console.log(cmd);
		var child = exec(cmd, function(err, stdout, stderr) {
			if (err) {
				console.log(err);
				console.log(stderr);
			}
		});
	} else {
		var cmd = 'C:\\Mongo\\Mongod.exe --dbpath C:\\Mongo\\data\\db';
		console.log(cmd);
		console.log("Started Mongo Server...")
		var child = exec(cmd, function(err, stdout, stderr) {
			if (err) {
				console.log("Killed Mongo.");
			} 
		});		
	}
}
if(program.web) {
	if (program.web === "kill") {
		var cmd = 'taskkill /F /IM mongod.exe';
		console.log(cmd);
		var child = exec(cmd, function(err, stdout, stderr) {
			if (err) {
				console.log(err);
				console.log(stderr);
			}
		});
	} else {
		var appPath = __dirname.replace(/cli\\bin/i, "web\\app.js")
		var cmd = 'node ' + appPath;
		console.log(cmd);
		console.log("Started CineProwl Web Server...")
		var child = exec(cmd, function(err, stdout, stderr) {
			if (err) {
				console.log("Killed CineProwl Web Server.");
				console.log(err);
				console.log(stderr);
			} 
		});		
	}
}