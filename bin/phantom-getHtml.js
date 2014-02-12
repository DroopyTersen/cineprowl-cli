var page = require('webpage').create(),
	system = require('system'),
	url = system.args[1];

page.open(url, function(status) {
  var html = page.evaluate(function() {
    return document.querySelector('html').innerHTML;
  });
  console.log(html);
  phantom.exit();
});