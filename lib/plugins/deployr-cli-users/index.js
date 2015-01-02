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
 * deployr-cli-users.js: Top-level include for the `deployr-cli-users` module.
 *
 */

var deployr = require('deployr');
var common = require('flatiron').common;
var async = common.async;
var cliUsers = exports;

//
// Expose commands and name this plugin
//
cliUsers.commands = require('./commands');
cliUsers.name = 'cli-users';

//
// ### function attach (options)
// #### @options {Object} Options to use when attaching.
// Attaches the `flatiron-cli-users` behavior to the application.
//
cliUsers.attach = function(options) {
    var app = this;
    options = options || {};

    if (!app.plugins.cli) {
        throw new Error('`cli` plugin is required to use `deployr-cli-users`');
    } else if (!app.config) {
        throw new Error('`app.config` must be set to use `deployr-cli-users`');
    }

    //
    // Setup state from the application attached to. 
    //
    app.skipAuth = false;
    cliUsers.app = app;
    cliUsers.after = options.after || {};
    cliUsers.before = options.before || {};
    common.templateUsage(app, cliUsers.commands);
    
    //
    // Add the necessary `<app> users *` commands
    //
    app.commands['users'] = app.commands['users'] || {};
    app.commands['users'] = common.mixin(app.commands['users'], cliUsers.commands);

    //
    // Setup aliases for `<app> users *` commands.
    //
    app.alias('login', {
        resource: 'users',
        command: 'login'
    });
    app.alias('logout', {
        resource: 'users',
        command: 'logout'
    });    
    app.alias('whoami', {
        resource: 'users',
        command: 'whoami'
    });

    //
    // ### function auth (callback)
    // #### @callback {function} Continuation to pass control to when complete.
    // Attempts to authenicate the user identified in `app.config.get('username'|'password')`
    //
    app.auth = function(callback, c) {
        var response, username;

        // assert there is a DeployR endpoint
        if (!app.config.get('endpoint')) {            
            app.commands.endpoint(function(n) {
                app.auth(callback);
            });
            return;
        }

        app.prompt.inquirer([{
            name: 'username',
            type: 'input',
            message: 'Username:',
            default: app.config.get('username') || null,
            validate: function(input) {
                username = input;
                return input.length > 0 ? true : ' Please enter a valid username';
            }
        }, {
            name: 'password',
            type: 'password',
            message: 'Password:',
            validate: function(input) {
                var done = this.async();

                deployr.configure({ host: app.config.get('endpoint') })
                  .io('/r/user/login')
                    .data({
                        username: username,
                        password: input
                    })
                    .error(function(err) {
                        done('Permission denied, please try again.');
                    })
                    .end(function(res) {
                        response = res;
                        done(true);
                    });
            }
        }], function() {
            callback(response);
        }.bind(this));
    };

    app.unauth = function(callback) {
        deployr.configure({
            host: app.config.get('endpoint'),
            cookies: ['JSESSIONID=' + app.config.get('cookie')],
            sticky: true
        })
        .io('/r/user/logout')
        .end()
        .ensure(function() { callback(); });            
    };

};

//
// ### function detach ()
// Detaches this plugin from the application.
//
cliUsers.detach = function() {
    var app = this;

    Object.keys(app.commands['users']).forEach(function(method) {
        if (cliUsers.commands[method]) {
            delete app.commands['config'][method];
        }

        cliUsers.commands.app = null;
    });
};
