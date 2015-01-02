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

var deployr = require('deployr');
var common = require('flatiron').common;
var cliServer = exports;

//
// Expose commands and name this plugin
//
cliServer.commands = require('./commands');
cliServer.name = 'cli-server';

//
// ### function attach (options)
// #### @options {Object} Options to use when attaching.
// Attaches the `deployr-cli-server` behavior to the application.
//
cliServer.attach = function(options) {
    var app = this;
    options = options || {};

    if (!app.plugins.cli) {
        throw new Error('`cli` plugin is required to use `deployr-cli-endpoint`');
    } else if (!app.config) {
        throw new Error('`app.config` must be set to use `deployr-cli-endpoint`');
    }

    //
    // Setup state from the application attached to. 
    //
    cliServer.app = app;
    cliServer.after = options.after || {};
    cliServer.before = options.before || {};
    common.templateUsage(app, cliServer.commands);

    //
    // Add the necessary `<app> server *` commands
    //
    app.commands['server'] = app.commands['server'] || {};
    app.commands['server'] = common.mixin(app.commands['server'], cliServer.commands);

    //
    // Setup aliases for `<app> server *` commands.
    //
    app.alias('about', { // $ di about
        resource: 'server',
        command: 'about'
    });

    app.alias('endpoint', { // $ di endpoint
        resource: 'server',
        command: 'endpoint'
    });

    app.home = this.home;

    app.about = function(callback) {
        var endpoint = app.config.get('endpoint') || null,
            info = app.config.get('deployr') || null;

        if (endpoint && !info) {
             deployr.configure({ host: endpoint })
               .io('/r/server/info')
               .error(function(err) { app.showError(err); })
               .end(function(res) { 
                  callback({ endpoint: endpoint, info: res.get('info') });
               });
        } else {
            callback({ endpoint: endpoint, info: info });
        }
    };

    //
    // ### function setEndpoint (callback)
    // #### @callback {function} Continuation to pass control to when complete.
    // Attempts to set the DeployR server endpoint.
    //
    app.setEndpoint = function(callback) {
        var server = {},
            regx = new RegExp('^(http|https)://', 'i'),
            endpoint = app.config.get('endpoint') || null,
            errorMsg = ' Please enter a valid DeployR endpoint.',
            hostMsg = (!endpoint ? ' http(s)://dhost:port' : '');

        app.prompt.inquirer([{
            name: 'endpoint',
            type: 'input',
            default: endpoint,
            message: 'DeployR Server' + app.chalk.dim.yellow(hostMsg) + ':',
            validate: function(input) {
                var done = this.async();
                if (input.length > 0) {
                	// be more forgiving on the entered DeployR 'endpoint'
                    input = input.replace(/\/*$|\/*deployr\/*$/, '');
                    input = regx.test(input) ? input : 'http://' + input;
                    deployr.configure({ host: input })
                        .io('/r/server/info')
                        .error(function(err) {
                            deployr.configure({ host: '' });
                            done(errorMsg);
                        })
                        .end(function(res) {
                        	server = { endpoint: input, info: res.get('info') };
                            done(true);
                        });
                } else {
                    done(errorMsg);
                }
            }
        }], function() {
            callback(server);
        });    
    };
};

//
// ### function detach ()
// Detaches this plugin from the application.
//
cliServer.detach = function() {
    var app = this;

    Object.keys(app.commands['server']).forEach(function(method) {
        if (cliServer.commands[method]) {
            delete app.commands['config'][method];
        }

        cliServer.commands.app = null;
    });
};
