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

var path = require('path'),
    fs = require('fs'),
    deployr = require('deployr'),
    shell = require('shelljs'),
    Table = require('cli-table'),
    UnZip = require('decompress-zip'),
    di = require('../../di'),
    date = require('../util/date'),
    conf = di.config,
    green = di.chalk.green,
    yellow = di.chalk.yellow;

// WIN   - http://nicrdepwin7.cloudapp.net:7400
// LINUX - http://nicrdeployrdev.cloudapp.net:7400

var DIR = 'di-jobs';


/**
 * Installs a starter example.
 *
 * @param {String} exName - The example to install.
 * @param {Function} callback - Continuation to pass control when complete.
 */

var job = exports;

/** 
 * Usage for the _di install *_ commands which allow you install and deploy
 * starter examples.
 * 
 * - di install example
 * - di install example <example name>
 */
job.usage = [
    'The `di job` command facilitates working with DeployR managed jobs.',
    '',
    'Example usages:',
    'di job submit <rscript-filename> [--name -n] <job-name>',
    'di job list [--completed -c --incomplete -i -o --open -a --cancelled]',
    'di job result'
];


/**
 * Installs a starter example.
 * ```
 * $ di job submit faithful.R --name test-job
 * ```
 *
 * @param {String} exName - The example to install.
 * @param {Function} callback - Continuation to pass control when complete.
 */
job.submit = function(filepath, callback) {
    var argv = di.argv,
        preload = {},
        RDATA_INPUTS = '.__job__.RData';

    function submit(code, inputs) {
        var request = agent().io('/r/repository/directory/create')
            .data({
                directory: DIR
            })
            .error(function(err) {
                if (err.get('errorCode') === 401) {
                    di.commands.login(function(err) {
                        if (err) {
                            return callback(err);
                        }

                        submit(code, inputs);
                    });
                } else {
                    callback(err);
                }
            })
            .end();

        //
        // Not all jobs require input so we check for the exsistance of .RData 
        //
        if (inputs) {
            var filename = (Date.now() + '.RData');

            preload = {
                preloadobjectname: filename,
                preloadobjectdirectory: DIR,
                preloadobjectauthor: conf.get('username')
            };

            request.io('/r/repository/file/upload')
                .data({
                    filename: filename,
                    directory: DIR,
                    newversion: true,
                    newversionmsg: 'DeployR CLI (job submit inputs) upload.'
                })
                .attach(RDATA_INPUTS)
                .error(callback)
                .end()
                .ensure(function() {
                    fs.unlink(RDATA_INPUTS);
                });
        }

        request.io('/r/job/submit')
            .data(di._.merge({
                code: code,
                name: argv.name || argv.n
            }, preload))
            .error(callback)
            .end(function(res) {
                var job = res.get('job');
                console.log(green.bold('✓ job ' + job.name + ' submitted.'));
            });
    }

    //
    // Read in R Script to be submitted as an code block
    //
    fs.readFile(filepath, 'utf8', function(err, code) {
        if (err) {
            err.message = err.message + '. Make sure this file exists or your ' +
                'R working directory \n' +
                '       is set to the location of \'' + filepath + '\'';
            callback(err);
        }

        // see if inputs exsist
        fs.open(RDATA_INPUTS, 'r', function(err) {
            submit(code, err ? false : true);
        });
    });
};

/**
 * This call lists jobs for the currently authenticated user.
 *
 * OPRIONS
 *
 * -c --completed
 *   1. Completed: 
 *
 * -o --open 
 *   Active job status:
 *   1. Scheduled:
 *   2. Queued:
 *   3. Running: 
 *
 * -a --cancelled 
 *   The job has/is been cancelled:
 *   1. Cancelled: job has been cancelled.
 *   2. Cancelling: job is being cancelled.
 *
 * -i --incomplete   
 *   Incompleted job states:
 *   1. Interrupted: job execution has been interrupted.
 *   2. Aborted: job execution has been aborted.
 *   3. Failed: job execution has resulted in failure.
 *
 * ```
 * $ di job list --cancelled  -a --completed -c --incomplete -i -o --open
 * ``` 
 */
job.list = function(callback) {
    var argv = di.argv,
        filter = (argv.cancelled || argv.a || argv.incomplete || argv.i || argv.completed || argv.c),
        list = function() {
            listJobs({
                    openonly: !filter && (argv.open || argv.o)
                }, list)
                .end(function(res) {
                    var table = new Table({
                        head: ['Job', 'Name', 'Status', 'Submit Time'],
                        colWidths: [10, 20, 15, 41]
                    });

                    (res.get('jobs') || []).forEach(function(j, index) {
                        var include = true;

                        if (filter) {
                            switch (j.status) {
                                case 'Cancelled':
                                case 'Cancelling':
                                    include = (argv.cancelled || argv.c);
                                    break;

                                case 'Interrupted':
                                case 'Aborted':
                                case 'Failed':
                                    include = (argv.incomplete || argv.i);
                                    break;

                                case 'Scheduled':
                                case 'Queued':
                                case 'Running':
                                    include = (argv.open || argv.o);
                                    break;

                                case 'Completed':
                                    include = (argv.completed || argv.c);
                                    break;
                            }
                        }

                        if (include) {
                            table.push([
                                index,
                                j.name,
                                j.status,
                                new Date(j.timeStart)
                            ]);
                        }
                    });

                    console.log(table.toString());
                });
        };

    list();
};

job.usage.list = [
    'The `di job result` lists jobs for the currently authenticated user.',
    '',
    'Example usages:',
    'di job list [--cancelled  -a --completed -c --incomplete -i -o --open]', 
    ['  --dest, -d     optional destination directory           [string]',
     '  --completed -c list only completed jobs                 [string]',
     '  --open -o      list only active jobs                    [string]',
     '  --cancelled -a list only cancelled jobs                 [string]',
     '  --incomplete -i list only Incompleted jobs              [string]' 
    ]
];

/**
 * This call queries the job status. The status property will indicate one of 
 * the following values: 
 *   - Scheduled
 *   - Queued
 *   - Running
 *   - Completed
 *   - Cancelling
 *   - Cancelled
 *   - Interrupted
 *   - Aborted
 *   - Failed
 *
 * ```
 * $ di job status 0
 * ```
 */
job.status = function(id, callback) {
    var argv = di.argv,
        filter = (argv.cancelled || argv.a || argv.incomplete || argv.i || argv.completed || argv.c),
        query = function() {
            listJobs(query)
                .end(function(res) {
                    var job = (res.get('jobs') || [])[id || 0];
                    if (!job) {
                        console.log(yellow('No jobs are currently being managed.'));
                        callback();
                    }

                    return {
                        job: job.job
                    };
                })
                .io('/r/job/query')
                .data({
                    extended: true
                })
                .error(callback)
                .end(function(res) {
                    var job = res.get('job'),
                        table = new Table();

                    table.push({
                        'Job': id
                    }, {
                        'Name': job.name
                    }, {
                        'Status': job.status
                    }, {
                        'Message': job.statusMsg || ''
                    });

                    console.log(table.toString());
                });
        };

    if (id) {
        query();
    } else {
        showUsage(di.commands.job.usage.status);
    }
};

job.usage.status = [
    'The `di job result` queries the job status',
    '',
    'Example usages:',
    'di job status <job-id>', 
    []    
];

job.result = function(id, callback) {
    var argv = di.argv,
        EXPORT = '__deployr_export__.zip',
        DEST = '',
        result = function() {
            listJobs(result)
                .end(function(res) {
                    var job = (res.get('jobs') || [])[id || 0];
                    if (!job) {
                        console.log(yellow('No jobs are currently being managed.'));
                        callback();
                    }

                    DEST = (argv.dest || argv.d) || date.format(job.timeStart);
                    return {
                        project: job.project
                    };
                })
                .io('/r/project/export')
                .error(callback)
                .pipe(fs.createWriteStream(EXPORT))
                .on('close', function() {
                    new UnZip(EXPORT)
                        .on('error', function(err) {
                            shell.rm(EXPORT);
                        })
                        .on('extract', function() {
                            shell.rm(EXPORT);
                            console.log(green.bold('✓ job result written to "' + DEST + '"'));
                        }).extract({
                            path: DEST,
                            strip: 1,
                            filter: function(file) {
                                var ext = path.extname(file.filename),
                                    base = file.filename.replace(/^.*(\\|\/|\:)/, '');

                                // 
                                // move exported zip content into more 
                                // friendly dirs
                                //
                                if (ext === '.rData') {
                                    file.parent = './';
                                    file.path = 'workspace';
                                    file.filename = '/workspace/' + base;
                                } else {
                                    file.parent = './';
                                    file.path = 'files'
                                    file.filename = '/files/' + base;
                                }

                                //
                                // filter out any useless files
                                // 
                                return (ext !== '.txt' && ext !== '.ser' && ext !== '.r');
                            }
                        });
                });
        };

    if (id) {
        result();
    } else {
        showUsage(di.commands.job.usage.result);
    }
};

job.usage.result = [
    'The `di job result` outputs the job results',
    '',
    'Example usages:',
    'di job result <job-id> [--dest -d]', 
    ['  --dest, -d     optional destination directory           [string]']
];

/**
 * ```
 * $ di job flush -a --all 0,1,2,3,4,5
 * ```
 */
job.flush = function(ids, callback) {
    var argv = di.argv,
        jcsv = '',
        all = argv.all || argv.a,
        dropDir = false,
        projects = [],
        flush = function() {
            var request = listJobs(flush)
                .end(function(res) {
                    var jobs = res.get('jobs') || [],
                        miss = false;

                    if (jobs.length === 0) {
                        console.log(yellow('No jobs are currently being managed.'));
                        callback();
                    }

                    ids = (ids || '').split(',');

                    jcsv = jobs.map(function(job) {
                            return job.job;
                        })
                        .filter(function(job, index) {
                            if (!ids[index]) {
                                miss = true;
                            }
                            return (all || di._.contains(ids, index + ''));
                        })
                        .join(',');

                    projects = jobs.filter(function(job) {
                        return di._.contains(ids, job) && job.project;
                    });

                    //
                    // all jobs will be deleated
                    //
                    if (all || !miss) {
                        dropDir = true;
                    }

                    return {
                        job: jcsv
                    };
                });

            request.io('/r/job/delete')
                .error(callback)
                .end(function(res) {
                    if (res.get('error')) {
                        console.log(yellow(res.get('error')));
                    } else {
                        console.log(green.bold('✓ jobs successfully flushed.'));
                    }
                })
                .ensure(function() {
                    if (projects.length > 0) {
                        request.release(projects, true);
                    }

                    //
                    // Only drop the `di-jobs` directory if all jobs are flushed
                    //
                    if (dropDir) {
                        request.io('/r/repository/directory/delete')
                            .data({
                                directory: DIR
                            })
                            .error(callback)
                            .end(function(res) {
                                return {
                                    job: jcsv
                                };
                            });
                    }
                });
        };

    if (ids || all) {
        flush();
    } else {
        showUsage(di.commands.job.usage.flush);
    }
};

job.usage.flush = [
    'The `di job flush` command deletes DeployR managed jobs.',
    '',
    'Example usages:',
    'di job flush <job-id,job-id> [--all -a]', 
    ['  --all, -a      flush all jobs                           [string]']
];

function listJobs(data, cmdCallback) {
    if (arguments.length == 1) {
        cmdCallback = data;
        data = {};
    }

    return agent().io('/r/job/list')
        .data(data)
        .error(function(err) {
            if (err.get('errorCode') === 401) {
                di.commands.login(function(err) {
                    if (err) {
                        return callback(err);
                    }
                    cmdCallback();
                });
            } else {
                callback(err);
            }
        });
}

function agent() {
    return deployr.configure({
        host: conf.get('endpoint'),
        cookies: ['JSESSIONID=' + conf.get('cookie')],
        sticky: true
    });
}

function showUsage(target) {
    var opts = target.pop();

    target.forEach(function(line, index) {
        di.log.help(line);
    });

    di.log.help('');

    // merge global options with target options
    di.showOptions().split('\n').filter(Boolean).forEach(function(line) {
        di.log.help(line);
    });

    if(opts.length > 0) { di.log.help(opts.join('\n')); }
}
