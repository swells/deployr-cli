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
    di = require('../di');

//
// Update env for Windows
//
if (process.platform == 'win32') {
  process.env.HOME = process.env.USERPROFILE;
}

//
// Setup target file for `.diconf`.
//
try {
  di.config.env().file({
    file: di.argv.diconf || di.argv.j || '.diconf',
    dir: process.env.HOME,
    search: true
  });
} catch (err) {
  console.log('Error parsing ' + di.config.stores.file.file.magenta);
  console.log(err.message);
  console.log('');
  console.log('This is most likely not an error in the DeployR CLI `di`');
  console.log('Please check the .diconf file and try again');
  console.log('');
  process.exit(1);
}

var restricted = ['git'];

//
// Set defaults for `diconfig`.
//
di.config.defaults({
  homepage: 'http://deployr.revolutionanalytics.com/',
  git: {
    //repos: 'https://api.github.com/orgs/deployr/repos'
    //example: 'https://github.com/deployr/{{example}}/archive/master.zip'; 
    repos: 'https://api.github.com/users/swells/repos',
    example: 'https://github.com/swells/{{example}}/archive/master.zip',
    cli: 'http://github.com/deployr-cli'
  }
});

/**
 * Use the `flatiron-cli-config` plugin for `di config *` commands
 */
di.use(require('flatiron-cli-config'), {

  /**
   * Name of the store in `di.config` to use for `config list`. 
   */
  store: 'file',

  /**
   * Set of properties which cannot be deleted using `config delete <key>`
   */
  restricted: restricted,

  /**
   * Set of functions which will execute before named commands: 
   * get, set, list, delete
   */
  before: {
    set: function(key) {   
      if (di._.contains(restricted, key)) {
        di.log.warn('Cannot set reserved key ' + key.yellow);
        return false;
      } else {
        return true;
      }      
    },

    list: function() {
      var username = di.config.get('username'),
          configFile = di.config.stores.file.file,
          display = [
            ' here is the ' + configFile.grey + ' file:',
            'To change a property type:',
            'di config set <key> <value>',
          ];

      display[0] = 'Hello ' + (username ? username.green : '') + display[0];

      display.forEach(function (line) {
        di.log.help(line);
      });

      return true;
    }
  }
});