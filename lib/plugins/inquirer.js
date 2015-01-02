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

var inquirer = require('inquirer');
var cliInquirer = exports;

cliInquirer.name = 'cli-inquirer';

cliInquirer.attach = function(options) {
    var app = this;
    options = options || {};

    if (!app.plugins.cli) {
    	throw new Error('`cli` plugin is required to use `cli-prompt`');
    } 

    app.prompt.separator = function(msg) {
    	return new inquirer.Separator(msg);
    };

    app.prompt.inquirer = function(choices, cb) {
	    inquirer.prompt(choices, function(answers) {
	    	if (cb) {
	    		cb.call(this, answers);
	    	}
	    });	    
    };       
};