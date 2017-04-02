var MovieService = require("cineprowl-services").MovieService;
var movieService = new MovieService("mongodb://droopytersen.us:27017/cineprowl");
module.exports = movieService;
