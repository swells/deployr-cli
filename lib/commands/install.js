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

/**
 * @module install
 * Commands for installing and deploying starter examples.
 */

var path = require('path'),     
    fs = require('fs'), 
    deployr = require('deployr'),
    request = require('request'),
    shell = require('shelljs'),
    Download = require('download'),
    progress = require('download-status'),
    spinner = require('char-spinner'),
    LangType = require('../util/lang-type'),
    di = require('../../index'),
    conf = di.config,
    // --- color aliases ---
    ul = di.chalk.underline,
    dim = di.chalk.dim,
    gray = di.chalk.gray,
    green = di.chalk.green,
    yellow = di.chalk.yellow,
    magenta = di.chalk.magenta;

var install = exports;

install.usage = [
    'The `di install` command installs pre-built DeployR examples locally',
    '',
    'Example usages:',
    'di install example',
    'di install example <example name>'
];

//
// ### function example (exName, callback)
// #### @exName {string} the example to install
// #### @callback {function} Continuation to pass control when complete.
// Installs a starter example.
//
install.example = function(exName, callback) {
    //
    // Allows arbitrary amount of arguments
    //
    if (arguments.length) {
        var args = Array.prototype.slice.call([arguments], 0)[0];
        callback = args[arguments.length - 1];
        exName = args[0] || null;
    }

    this.exName = exName;
    this.callback = callback;
    agent();
    listExamples(exName);
};

install.example.usage = [
    'The `di install` command installs pre-built DeployR examples locally',
    '',
    'Example usages:',
    'di install example',
    'di install example <example name>'
];

function agent() {
    deployr.configure({
        host: conf.get('endpoint'),
        cookies: ['JSESSIONID=' + conf.get('cookie')],
        sticky: true
    });
}

function listExamples(exName) {
    var done = function() {}, //async(),
        interval = spinner(),
        separator = di.prompt.separator,
        jsList = [],
        javaList = [],
        dotNETList = [];
    //var url = 'https://api.github.com/orgs/deployr/repos';
    var url = 'https://api.github.com/users/swells/repos';

    request.get({ url: url, headers: { 'User-Agent': 'Awesome-Octocat-App' } },
        function(err, res, body) {
            clearInterval(interval);

            if (err || res.statusCode != 200) {
                //this.emit('error', err);
                //callback(err);
                return;
            }

            var found = false;
            try {
                JSON.parse(body).forEach(function(repo, i) {
                    var name = repo.name;
                    if (name.indexOf('example') > -1) {
                        found = name === exName ? true : found;
                        switch (LangType.parse(name)) {
                            case LangType.JS:
                                jsList.push({
                                    name: '  ' + name
                                });
                                break;

                            case LangType.JAVA:
                                javaList.push('  ' + name);
                                break;

                            case LangType.DOTNET:
                                dotNETList.push('  ' + name);
                                break;
                        }
                    }
                });


                if (found) {
                    console.log('Installing example ' + ul(exName) + '\n');
                    installExample(exName, done);
                    return;
                }

                var choices = [];

                if (jsList.length > 0) {
                    choices.push(separator('JavaScript Examples '));
                    choices.push(jsList);
                }

                if (javaList.length > 0) {
                    choices.push(separator());
                    choices.push(separator('Java Examples '));
                    choices.push(javaList);
                }

                if (dotNETList.length > 0) {
                    choices.push(separator('.NET Examples '));
                    choices.push(dotNETList);
                }

                choices.push(separator());
                choices.push({
                    name: 'Take me back home!',
                    value: {
                        method: 'home'
                    }
                });

                di.prompt.inquirer([{
                    name: 'example',
                    type: 'list',
                    message: 'What example would you like to install?',
                    choices: di._.flatten(choices)
                }], function(answer) {
                    if (!answer.example.method) {
                        installExample(answer.example.trim(), done);
                    } else {
                        di.home();
                    }
                }.bind(di));

            } catch (err) {
                return di.emit('error', new Error(chalk.bold(
                    'A problem occurred installing example from Github.' +
                    '\nUnable to parse response: not valid JSON.'
                )));
            }
        }); // get
};

function installExample(example) {
    //var url = 'https://github.com/deployr/' + example + '/archive/master.zip'; 
    var url = 'https://github.com/swells/' + example + '/archive/master.zip';

    // @TODO
    example = example + '-master';

    var download = new Download({ extract: true, strip: 1, mode: '755' })
      .get(url)
      .dest(example)
      .use(progress());

    download.run(function (err, files, stream) {
        if (err) {
            throw err;
        }

        console.log(green.bold('✓ download complete.\n'));
        console.log(ul(example));

        var installer;

        switch (LangType.parse(example)) {
            case LangType.JS:
               installer = function(next) {
                  console.log(yellow('\nResolving npm dependencies, this might take a while...\n'));
                  di.spawnCommand('npm', ['install'])
                  .on('error', next)
                  .on('exit', next);
                };
                break;

            case LangType.JAVA:
            case LangType.DOTNET:
               installer = function(next) { next(); }                
               break;
        }

        //_install(example, installer);
        shell.cd(example);
        installer(function () {
            shell.cd('../');
            var fpath = path.resolve(example, 'analytics/config.json');
            fs.exists(fpath, function(exists) {
                if (exists) {
                    deployr.io('/r/user/about')
                        .error(function(e) {
                            var end = !conf.get('endpoint') ?
                                ' First identify your DeployR server endpoint.' : '';
                            console.log(yellow('\nAuthentication required to install.' + end + '\n'));

                            di.commands.login(installation);
                            //di.plugins.cli.executeCommand('login', installation);
                        })
                        .end(function() { installation(); });
                }
            });
        });
    });
       
    function installation() {
        var config = require(path.resolve(example, 'analytics/config.json')),
            repos = config.repository;

        agent();

        console.log(yellow('\nInstalling example analytics dependencies onto DeployR...\n'));

        repos.forEach(function(item, index) {
            var filename = item.file.filename,
                dir = item.file.directory || 'root';

            console.log((index + 1) + '. ' + ul(filename) + ' in directory ' + ul(dir));
        });
        console.log('\n');

        // -- create all directories --    
        var dirs = di._.uniq(repos, 'directory'), 
            last = dirs.length - 1;

        dirs.forEach(function(item, index) {
            deployr.io('/r/repository/directory/create')
                .data({
                    directory: item.file.directory
                })
                .end()
                .ensure(function() {
                    if (index === last) {
                        analytics(repos, config.requirePassword || false);
                    }
                });
        });
    }

    function analytics(repos, requirePassword) {
        var last = repos.length - 1;
        var retry = [];

        repos.forEach(function(item, index) {
            var file = item.file,
                permissions = item.permissions;

            deployr.io('/r/repository/file/upload')
                .data({
                    filename: file.filename,
                    directory: file.directory || 'root',
                    descr: file.descr || 'Uploaded from DeployR cli (di).',
                    restricted: permissions.restricted || null,
                    shared: permissions.shared || true,
                    published: permissions.published || true
                        //newversion: true
                })
                .attach(path.resolve(example, 'analytics', file.filename))
                .error(function(err) {
                    //self.emit('error', err);
                    //callback(err);
                    console.log(err);
                })
                .end(function(res) {
                    var file = res.get('repository').file;

                    console.log(green.bold('✓ upload complete.\n'));
                    console.log(ul(file.filename) +
                        ' uploaded to directory ' +
                        ul(file.directory) +
                        ' for ' + dim(conf.get('username') + '@' + conf.get('endpoint')) +
                        '\n');
                })
                .ensure(function() {
                    if (index === last) {
                        console.log(green.bold('✓ installation complete.\n'));

                        di.prompt.inquirer([{
                            name: 'run',
                            type: 'confirm',
                            message: 'Would you like to run the example:'
                        }], function(result) {
                            if (result.run) {
                                if (requirePassword) {
                                    console.log('\nThis example requires ' + magenta(conf.get('username')) + '\'s password to run.\n');
                                    di.prompt.inquirer([{
                                        name: 'password',
                                        type: 'password',
                                        message: 'Password:',
                                        validate: function(input) {
                                            return input.length > 0 ? true : ' Please enter a valid password';
                                        }
                                    }], function(answer) {
                                        run(answer.password);
                                    });
                                } else {
                                    run();
                                }
                            }
                        });
                    }
                });
        }); // foreach
    }

    function run(pw) {
        var cmd, args = [],
            options = [];

        shell.cd(example);

        switch (LangType.parse(example)) {
            case LangType.JS:
                cmd = 'npm';
                args = ['start'];
                process.env.endpoint = conf.get('endpoint');
                process.env.username = conf.get('username');
                if (pw) { process.env.password = pw; }
                options = { env: process.env };
                break;

            case LangType.JAVA:                
                cmd = (process.platform === 'win32' ? 'gradlew.bat' : './gradlew');
                args = [
                    'run',
                    '-Pendpoint=' + conf.get('endpoint') + '/deployr',
                    '-Pusername=' + conf.get('username'),
                    '-Ppassword=' + pw || ''
                ];
                break;

            case LangType.DOTNET:
                break;
        }

        di.spawnCommand(cmd, args, options)
            .on('error', function(err) {
                //this.emit('error', err);
                callback(err);
            }.bind(di));
    }
};
