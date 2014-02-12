#!/usr/bin/env node
var program = require('commander'),
	torrentHunter = require("../lib/torrentHunter");
program
  .version('0.0.1')
  .option('-t, --torrents', 'Search torrents')
  .option('-s, --sync', 'Sync video libraries')
  .parse(process.argv);

console.log('You ran cineprowl with:');
if (program.torrents) {
	var movies = torrentHunter.search(10);
}
if (program.sync) console.log('  - sync');

