# di

> CLI tool for running useful [DeployR](http://deployr.revolutionanalytics.com) utilities

<img src="/Users/swells/viewstore/8.x/tt/cli2/assets/di.png"/>

## Overview

[di](https://github.com/deployr/deployr-cli) is a [Command Line Tool (CLI)](http://en.wikipedia.org/wiki/Command-line_interface) for running useful 
[DeployR](http://deployr.revolutionanalytics.com) utilities. Although the 
current feature set is minimal, many more CLI commands will be added going 
forward.

## Dependencies

_di_ requires:

- [Node.js](http://nodejs.org/) to be installed.
- A running [DeployR](http://deployr.revolutionanalytics.com/documents/admin/install) server to connect to.

## Installation

_di_ is installed and managed via [npm](http://npmjs.org), the [Node.js](http://nodejs.org/) package manager.

To get started, you will want to install _di's_ command line interface (CLI) 
globally. You may need to use sudo for (OSX, *nix, etc) or for Windows run your 
command shell as Administrator.

One-line install using [npm](http://npmjs.org):

```
npm install -g deployr-cli
```

This will put the `di` command in your system path allowing it to be run from 
any location.

## Usage

`di` is self documenting and the best way to become familiar with the tool is to 
try it out from your command line:

```
di <resource> <action> <param1> <param2> ...
```

### Common Commands

**Main menu:**

```
di
```

**To set the DeployR server endpoint:**

```
di endpoint
```

**To log into DeployR:**

```
di login
```

**To install a pre-built example:**

```
di install example
```

### Additional Commands

```
di whoami
di logout
di about
di config 
di users
di server
```

## Help

All commands have corresponding _help_ text associated with it. To read the help
text for a `di` command, type:

```
di help <command>
```

For example, to display the help text for the `whoami` command:

<img src="/Users/swells/viewstore/8.x/tt/cli2/assets/whoami.png"/>

## .diconf file

All configuration data for your local `di` install is located in the *.diconf* file in your home directory. Directly modifying this file is not really advised. You should be able to make all configuration changes from the _main menu_ UI or via:

```
di config
```

Example:

```
di config set endpoint http://dhost:port   # set the DeployR server endpoint
```

If you need to have multiple configuration files, use --diconf options.

Example:

```
di --diconf /path/to/other/configuration/.diconf
```

##di options

    di [commands] [options]
 
    --version             prints DeployR version and exit
    --diconf [file]       specify file to load configuration from
    --help                prints cli help and exit

# License

Copyright (C) 2010-2014 by Revolution Analytics Inc.

This program is licensed to you under the terms of Version 2.0 of the Apache 
License. This program is distributed WITHOUT ANY EXPRESS OR IMPLIED WARRANTY, 
INCLUDING THOSE OF NON-INFRINGEMENT, MERCHANTABILITY OR FITNESS FOR A PARTICULAR 
PURPOSE. Please refer to the Apache License 2.0 (http://www.apache.org/licenses/LICENSE-2.0) for more details.