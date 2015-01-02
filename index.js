/*!
 * Copyright (C) 2010-2014 by Revolution Analytics Inc.
 *
 * This program is licensed to you under the terms of Version 2.0 of the
 * Apache License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * Apache License 2.0 (http://www.apache.org/licenses/LICENSE-2.0) for more
 * details.
 */

'use strict';

/*
 * di.js: Top-level include for the di module.
 *
 */

var path = require('path'),
    util = require('util'),
    flatiron = require('flatiron'),
    chalk = require('chalk'),
    opn = require('opn');

var di = module.exports = flatiron.app;

//
// Setup `di` to use `pkginfo` to expose version
//
require('pkginfo')(module, 'name', 'version');

//
// Configure di to use `flatiron.plugins.cli`
//
di.use(flatiron.plugins.cli, {
    version: true,
    usage: require('./lib/usage'),
    source: path.join(__dirname, 'lib', 'commands'),
    argv: {
        version: {
            alias: 'v',
            description: 'prints DeployR version and exit',
            string: true
        },
        diconf: {
            alias: 'j',
            description: 'specify file to load configuration from',
            string: true
        },
        help: {
            alias: 'h',
            description: 'prints cli help and exit',
            string: true
        }
    }
});

di.use(require('./lib/plugins/inquirer'));

require('./lib/config');
require('./lib/alias');
require('./lib/commands');
di.chalk = require('chalk');
di._ = require('lodash');
di.brand = require('./lib/util/brand');
di.spawnCommand = require('./lib/util/spawn-command');

//
// Setup other di settings.
//
di.started = false;
di.displayExit = true;

di.noop = function() {};

//
// ### function start (command, callback)
// #### @command {string} Command to execute once started
// #### @callback {function} Continuation to pass control to when complete.
// Starts the di CLI and runs the specified command.
//
di.start = function(callback) {
    //
    // whoami command should not output anything but username
    //
    if (di.argv._[0] === 'whoami') {
        di.displayExit = false;
        console.log(di.config.get('username') || '');
        return;
    }

    di.init(function(err) {
        //di.welcome();

        if (err) {
            di.showError(di.argv._.join(' '), err);
            return callback(err);
        }

        // intercept `--help, -h` help options
        di.argv._ = di.argv.help ? ['help'] : di.argv._;

        // `di` with no command or options routes to `home`
        if (!di.argv._[0]) {
            di.home();
        } else {
            return di.exec(di.argv._, callback);
        }
    });
};

//
// ### function exec (command, callback)
// #### @command {string} Command to execute
// #### @callback {function} Continuation to pass control to when complete.
// Runs the specified command in the di CLI.
//
di.exec = function(command, callback) {
    function execCommand(err) {

        if (err) {
            return callback(err);
        }

        di.displayExit = false;
        di.router.dispatch('on', command.join(' '), di.log, function(err, shallow) {

            if (err) {
                console.log('shallow:: ' + shallow)
                di.showError(command.join(' '), err, shallow);
                return callback(err);
            }

            callback();
        });
    }

    return !di.started ? di.setup(execCommand) : execCommand();
};

//
// ### function setup (callback)
// #### @callback {function} Continuation to pass control to when complete.
// Sets up the instances of the Resource clients for di.
// there is no io here, yet this function is ASYNC.
//
di.setup = function(callback) {

    if (di.started === true) {
        return callback();
    }

    di.started = true;

    // Hack - override the 'jitsu' refrence in $di help config list
    di.commands.config.list.usage = [
        'Lists all configuration values currently',
        'set in the .diconf file',
        '',
        'di config list'
    ];

    callback();
};

//
// ### function showError (command, err, shallow, skip)
// #### @command {string} Command which has errored.
// #### @err {Error} Error received for the command.
// #### @shallow {boolean} Value indicating if a deep stack should be displayed
// Displays the `err` to the user for the `command` supplied.
//
di.showError = function(command, err, shallow) {
    di.log.error('Error running command ' + command.magenta);

    if (err.stack && !shallow) {
        err.stack.split('\n').forEach(function(trace) {
            di.log.error(trace);
        });
    } else {
        di.log.error(err);
    }
};

di.goto = function(command, callback) {
    callback = callback || function() {};
    di.plugins.cli.executeCommand(command, callback);
};

//
// Display the home `di` screen, with the intial set of options.
//
// - options - (optional)
//           - message (string) - String to print before prompt.
//           - refresh (bool) - Spawn a new `di` command.
di.home = function(options) {
    var done = function() {}; //async();
    var separator = di.prompt.separator;
    var endpoint = di.config.get('endpoint');
    var name = di.config.get('username');
    var defaultChoices = [{
        name: 'Settings',
        value: {
            method: 'settings'
        }
    }, {
        name: 'Install an example',
        value: {
            method: 'goto',
            args: ['install', 'example']
        }
    }, {
        name: 'Find some help',
        value: {
            method: 'findHelp'
        }
    }, {
        name: 'Get me out of here!',
        value: {
            method: 'noop'
        }
    }];

    name = (name && endpoint ? ' ' + name + '@' + endpoint.replace(/^https?:\/\//, '') : '');
    //this.insight.track('di', 'home');    

    di.prompt.inquirer([{
        name: 'whatNext',
        type: 'list',
        message: 'Welcome to DeployR CLI' + chalk.magenta(name) + '!',
        choices: this._.flatten([
            separator('Choices'),
            separator(),
            defaultChoices,
            separator()
        ])
    }], function(answer) {
        this[answer.whatNext.method](answer.whatNext.args, done);
    }.bind(this));
};

// Prompts user with a few helpful resources, then opens it in their browser.
di.findHelp = function() {
    // this.insight.track('di', 'help');
    di.prompt.inquirer([{
        name: 'whereTo',
        type: 'list',
        message: 'Here are a few helpful resources.\n' +
            '\nI will open the link you select in your browser for you',
        choices: [{
            name: 'Take me to the documentation',
            value: 'http://deployr.revolutionanalytics.com/'
        }, {
            name: 'View Frequently Asked Questions',
            value: 'http://deployr.revolutionanalytics.com/faq'
        }, {
            name: 'File an issue on GitHub',
            value: 'http://github.com/deployr'
        }, {
            name: 'Take me back home!',
            value: {
                method: 'home'
            }
        }]
    }], function(answer) {
        //this.insight.track('di', 'help', answer);

        if (this._.isFunction(this[answer.whereTo.method])) {
            this[answer.whereTo.method](answer.whereTo.args);
        } else {
            opn(answer.whereTo);
        }
    }.bind(this));
};

// Prompts user with setting options.
di.settings = function() {
    var separator = di.prompt.separator,
        choices = [{
            name: 'DeployR endpoint',
            value: {
                method: 'goto',
                args: ['endpoint']
            }
        }, {
          name: 'About server',
            value: {
                method: 'goto',
                args: ['about']
            }
        }, {
            name: 'Take me back home!',
            value: {
                method: 'home'
            }
        }];

    di.prompt.inquirer([{
        name: 'general',
        type: 'list',
        message: 'General settings',
        choices: this._.flatten([
            separator('Choices'),
            separator(),
            choices,
            separator()
        ])
    }], function(answer) {
        this[answer.general.method](answer.general.args, function() {
          di.home();
        });
    }.bind(di));
};


di.exit = function() {
    if (di.displayExit) {
        //this.insight.track('di', 'exit');
        var url = 'https://github.com/deployr/deployr#team';
        var newLine = '\n';

        console.log(
            di.brand +
            newLine +
            'Good Bye!' +
            newLine +
            newLine +
            'The DeployR Team' + chalk.dim.yellow(' ♥  ' + url)
        );
    }
};

process.once('exit', di.exit.bind(this));
