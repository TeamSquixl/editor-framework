# Editor Framework

[Documentation](https://github.com/fireball-x/editor-framework/tree/master/docs) |
[Downloads](http://github.com/fireball-x/editor-framework/releases/) |
[Install](https://github.com/fireball-x/editor-framework#install) |
[Features](https://github.com/fireball-x/editor-framework#features)

[![Dependency Status](https://david-dm.org/fireball-x/editor-framework.svg)](https://david-dm.org/fireball-x/editor-framework)
[![devDependency Status](https://david-dm.org/fireball-x/editor-framework/dev-status.svg)](https://david-dm.org/fireball-x/editor-framework#info=devDependencies)

Editor Framework gives you power to easily write professional multi-panel desktop software in HTML5 and io.js.

The framework is based on top of [Electron](http://github.com/atom/electron) and [Polymer](http://github.com/polymer/polymer).
It is designed conforming to Electron’s [main and renderer process architecture](https://github.com/atom/electron/blob/master/docs/tutorial/quick-start.md).
To make multiple windows communicate easily, Editor Framework extends [Electron’s IPC message API](https://github.com/atom/electron/blob/master/docs/api/ipc-renderer.md), making it easier to send and receive callbacks between the main and renderer processes.

It is designed for full extensibility. In the core level (main process), we achieve this by introducing a package management module and several registration APIs. The user can load or unload packages on the fly without closing or restarting the app. In the page level (renderer process), we use HTML5 Web Component standards and include the Polymer solution by default. The user can extend the widgets and panels, then refresh the page to apply the changes.

![screen shot](https://cloud.githubusercontent.com/assets/174891/8265547/dd7c8412-172f-11e5-90cc-b12a91a5c73c.png)

## Prerequisite

- Install [node.js v0.12+](https://nodejs.org/) or [io.js v2.0+](https://iojs.org/en/index.html)
- Install [gulp](https://github.com/gulpjs/gulp) command line tool
- Install [bower](http://bower.io/) command line tool

```bash
npm install -g bower gulp
```

For **Windows** user, you need the following environment set up to be able to build nodejs native modules:

- [node-gyp](https://github.com/TooTallNate/node-gyp)
- [Visual Studio Community 2013](http://www.visualstudio.com/products/visual-studio-community-vs)
- [Python 2.7](http://www.python.org/download/releases/2.7/) - make sure you can run `python --verson` in your command line tool. Read [this](https://docs.python.org/2/using/windows.html#excursus-setting-environment-variables) for setting up path correctly.

## Install

In cloned project folder, run the following command to setup dev environment:

```bash
# Initialize gulp task dependencies
# npm is a builtin CLI when you install Node.js
npm install
```

### Install With NPM

You can also install Editor Framework into your app as a npm package:

```bash
# Again, npm script will take care of other dependencies
npm install fireball-x/editor-framework
```

**NOTE:** after npm dependencies are installed, we will run `node-gyp rebuild` against all native modules in editor-framework path. Please make sure `node-gyp` works in your command line environment. To learn more about native module building and setting up a `node-gyp` working environment, please check out:

- [node-gyp](https://github.com/TooTallNate/node-gyp)
- [Build native module for electron](https://github.com/atom/electron/blob/master/docs/tutorial/using-native-node-modules.md)
- [native-module for beginner](https://github.com/Elzair/native-module)

### Choose Electron Download Mirror

Download Electron can take time, especially when you're on the wrong side of wall. We use [electron-prebuilt](https://github.com/mafintosh/electron-prebuilt) for Electron binary download. You can choose if you want to use the china mirror during `gulp update-electron` task.

The first time you run this task (this task is included in `npm install` process), you'll be asked if you want to use China mirror for Electron downloading. A json file `mirror-setting.json` will be created to record your choice, like this:

```js
// local-setting.json
{
    "mirror": "china" // this value can be 'china' or 'global'
                      // depending on your answer
}
```

You can change this file anytime to choose mirror for Electron downloading again.

## Run Editor-Framework Demo

```bash
gulp run
```

In the demo you will see builtin packages and other example packages from `Developer` and `Examples` menu.

## Builtin Packages

The `gulp install-builtin` will install these builtin packages (this operation is covered in the npm install script):

 - Developer Tools
   - [console](https://github.com/fireball-packages/console)
   - [ipc-debugger](https://github.com/fireball-packages/ipc-debugger)
   - [package-manager](https://github.com/fireball-packages/package-manager)
   - [tester](https://github.com/fireball-packages/tester)
 - Widgets
   - [ui-kit](https://github.com/fireball-packages/ui-kit)
   - [pixi-grid](https://github.com/fireball-packages/pixi-grid)

## Update

To get the latest fireball build:

```bash
# Update editor-framework from github repo,
# also update builtin packages and electron binary
# this command will also check dependencies
# and report outdated or missing dependencies
gulp update

# If you want to update all dependencies
# this command will bootstrap and update the whole project and takes long
npm install

# or if you just want to quickly install a missing package:
# please use the semver reported at the end of `gulp update` dependency check
npm install some-npm-package@x.x.x

# If you only want to update bower dependencies
bower install
```

## Develop

### Test Environment

 - Mocha
 - Chai
 - Sinon

**Note:** We need to install Mocha, Chai in both core and page; that’s why we put them in both Bower and npm dependencies. The core-level tests only run during the development phase, and will not go into the final product. The page-level test environment has integrated with the [tester](https://github.com/fireball-x/tester) package and every developer can use it to test your panels.

To test the editor-framework itself, just run:

```bash
npm test
```

### Generate Documentation

To generate the document, just run:

```bash
npm run api
```

It will generate the API document in `./apidocs`, you can browse it by open `./apidocs/index.html`.

## Features

 - Package Management
   - Dynamically load and unload packages
   - Can use any web language (Less, Sass, CoffeeScript, TypeScript, …) for your package; editor-framework will build it first before loading the package.
   - Watch package changes and reload or notify changes immediately
   - Manage your packages in [package manager](https://github.com/fireball-packages/package-manager)
 - Panel Management
   - Freely docks panel anywhere in multiple windows
   - Dynamically load user define panels from package
   - Easily register and respond to ipc messages for your panel
   - Easily register shortcuts (hotkeys) for your panel
   - Save and load layout in json
   - Save and load panel profiles
 - Menu Extends
   - Dynamically add and remove menu item
   - Dynamically change menu item state (enabled, checked, visible, …)
   - Load user menu from packages
 - Commands (under development)
   - Register and customize commands for your App
   - A powerful command window (CmdP) for searching and executing your commands
 - Profiles
   - Allow user to register different types of profile to their need (global, local, project, …)
   - Load and save profiles through unified API
 - Logs
   - Use Winston for low level logs
   - Log to file
   - Integrate with [console](https://github.com/fireball-packages/console) for display and query your logs
 - Global Selection
   - Selection cached and synced among windows
   - User can register his own selection type
   - Automatically filtering selections
 - Global Undo and Redo (under development)
 - Enhance the native Dialog (under development)
   - Remember dialog last edit position
 - Enhance IPC Programming Experience
   - Add more ipc methods to help sending and recieving ipc messages in different level
   - Allow sending ipc message to specific panel
   - Allow sending ipc message to specific window
   - Allow sending ipc request and waiting for the reply in callback function
   - Integrate with [ipc-debugger](https://github.com/fireball-packages/ipc-debugger) to help you writing better ipc code
 - An Auto-Test Workflow
   - Detect your package changes and automatically run tests under it in [tester](https://github.com/fireball-packages/tester)
   - Integrate [Mocha](mochajs.org), [Chai](http://chaijs.com/) and [Sinon](sinonjs.org) to our test framework
   - A ghost-tester to simulate UI events and behaviours for testing
   - Automatically recreate your test target (widgets, panels) after each test case

## License (MIT)

Copyright (c) 2015 Fireball Game Engine

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
