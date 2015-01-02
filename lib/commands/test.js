'use strict';

/*
 * test.js: Commands for testing
 *
 * (C) 2014, DeployR
 */

var fs       = require('fs'),
    path     = require('path'),
    di       = require('../../index'),
    spawn    = require('child_process').spawn,
    defined  = require('defined'),
    faucet   = require('faucet'),
    chokidar = require('chokidar');

module.exports = function (filename, callback) {
  var argv = di.argv,
      dir  = argv._[1];

  var tap = faucet({
  	width: defined(argv.w, argv.width, process.stdout.isTTY
  		? process.stdout.columns - 5 : 0)
  });

  function test() {
  	tap = faucet({
  		width: defined(argv.w, argv.width, process.stdout.isTTY
  			? process.stdout.columns - 5 : 0)
  	});

  	var args = ['-e', "require(testthat) ; test_dir('" + dir + "', reporter = 'tap')"]; 

  	//console.log('\n');
    console.log('');
  	spawn('R', args).stdout.pipe(tap).pipe(process.stdout);
  }

  if (argv.autotest) {
  	var watcher = chokidar.watch(dir, {ignored: /[\/\\]\./, persistent: true});
  	watcher.on('change', function(path, stats) { test(); });

  	if (argv.watch) {
  		watcher.add(argv.watch);
  	}
  }	

  // -- run tests --
  console.log('Running R unit tests'.underline.yellow);
  test();
};


module.exports.usage = [
  'Run R tests... USAGE: test directory [--autotest] [--watch] directory',
  '',
  '--autotest, provides automatic execution of specs after each change',
  '--watch, when used with --autotest, paths after --watch will be watched for. '
];