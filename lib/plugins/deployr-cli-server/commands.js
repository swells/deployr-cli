/*!
 * Copyright (C) 2010-2015 by Revolution Analytics Inc.
 *
 * This program is licensed to you under the terms of Version 2.0 of the
 * Apache License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * Apache License 2.0 (http://www.apache.org/licenses/LICENSE-2.0) for more 
 * details.
 */

'use strict';

var cliServer = require('./index'),
    common = require('flatiron').common,
    async = common.async;

exports.usage = [
    '`<app> server *` commands allow you to work with existing user accounts',
    '',
    '<app> server endpoint',
    '<app> server about',
    '',
    'You will be prompted for additional user information',
    'as required.'
];


//
// ### function login (username, callback)
// #### @username {string} Optional. Will automatically populate the username
// field with a default value.
// #### @password {string} Optional. Will automatically populate the password
// field with a default value.
// #### @callback {function} Continuation to pass control to when complete.
// Attempts to login the user with the prompted credentials. Makes three
// prompt attempts and then offers to reset the password.
//
exports.endpoint = function() {
    var app = cliServer.app,
        args = common.args(arguments),
        callback = args.callback,
        server = {};

    if (cliServer.before.setup) {
        cliServer.before.setup({
            endpoint: app.config.get('endpoint')
        });
    }

    //
    // Endpoint workflow including async hooks
    //
    async.series([
            //
            // Before endpoint hook
            //
            function before(next) {
                if (cliServer.before.endpoint) {
                    cliServer.before.endpoint({
                        endpoint: app.config.get('endpoint')
                    }, next);
                } else {
                    next();
                }
            },

            //
            // Set the endpoint
            //
            function set(next) {
                app.setEndpoint(function(res) { // success
                    server = res; // server's meta-data
                    app.config.save(function(err) {
                        return err ? next(err) : next();
                    });
                });
            },

            //
            // After endpoint hook
            //
            function after(next) {
                if (cliServer.after.endpoint) {
                    cliServer.after.endpoint(server, next);
                } else {
                    next();
                }
            }
        ],

        //
        // Workflow end
        //
        function(err, result) {
            return err ? callback(err) : callback();
        });
};

//
// Usage for `<app> endpoint`
//
exports.endpoint.usage = [
    'Allows the user to set the DeployR server endpoint',
    '',
    '<app> endpoint'
];

exports.about = function() {
    var app = cliServer.app,
        args = common.args(arguments),
        callback = args.callback,
        server = {};
    //
    // Endpoint workflow including async hooks
    //
    async.series([
            //
            // Find information 'about' the DeployR server
            //
            function about(next) {
                app.about(function(res, err) { // success
                    if (err) { callback(err); }

                    server = res; // server's meta-data
                    app.config.save(function(err) {
                        return err ? next(err) : next();
                    });
                });
            },

            //
            // After about hook
            //
            function after(next) {
                if (cliServer.after.about) {
                    cliServer.after.about(server, next);
                } else {
                    next();
                }
            }
        ],

        //
        // Workflow end
        //
        function(err, result) {
            return err ? callback(err) : callback();
        });
};

//
// Usage for `<app> about`
//
exports.about.usage = [ 
    'Displays DeployR server information based on the set server `endpoint`',
    '',
    '<app> about'
];