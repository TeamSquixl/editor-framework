var Ipc = require('ipc');
var Util = require('util');
var Fs = require('fire-fs');
var Path = require('fire-path');
var Winston = require('winston');
var Globby = require('globby');
var Chokidar = require('chokidar');
var Async = require('async');
var App = require('app');

// ==========================
// console log API
// ==========================

var _consoleConnected = false;
var _logs = [];

/**
 * @module Editor
 */

/**
 * Log the normal message and show on the console.
 * The method will send ipc message `console:log` to all windows.
 * @method log
 * @param {...*} [args] - whatever arguments the message needs
 */
Editor.log = function () {
    var text = Util.format.apply(Util, arguments);

    if ( _consoleConnected )
        _logs.push({ type: 'log', message: text });

    Winston.normal(text);
    Editor.sendToWindows('console:log',text);
};

/**
 * Log the success message and show on the console
 * The method will send ipc message `console:success` to all windows.
 * @method success
 * @param {...*} [args] - whatever arguments the message needs
 */
Editor.success = function () {
    var text = Util.format.apply(Util, arguments);

    if ( _consoleConnected )
        _logs.push({ type: 'success', message: text });

    Winston.success(text);
    Editor.sendToWindows('console:success',text);
};

/**
 * Log the failed message and show on the console
 * The method will send ipc message `console:failed` to all windows.
 * @method failed
 * @param {...*} [args] - whatever arguments the message needs
 */
Editor.failed = function () {
    var text = Util.format.apply(Util, arguments);

    if ( _consoleConnected )
        _logs.push({ type: 'failed', message: text });

    Winston.failed(text);
    Editor.sendToWindows('console:failed',text);
};

/**
 * Log the info message and show on the console
 * The method will send ipc message `console:info` to all windows.
 * @method info
 * @param {...*} [args] - whatever arguments the message needs
 */
Editor.info = function () {
    var text = Util.format.apply(Util, arguments);

    if ( _consoleConnected )
        _logs.push({ type: 'info', message: text });

    Winston.info(text);
    Editor.sendToWindows('console:info',text);
};

/**
 * Log the warnning message and show on the console,
 * it also shows the call stack start from the function call it.
 * The method will send ipc message `console:warn` to all windows.
 * @method warn
 * @param {...*} [args] - whatever arguments the message needs
 */
Editor.warn = function () {
    var text = Util.format.apply(Util, arguments);

    var e = new Error('dummy');
    var lines = e.stack.split('\n');
    text = text + '\n' + lines.splice(2).join('\n');

    if ( _consoleConnected )
        _logs.push({ type: 'warn', message: text });

    Winston.warn(text);
    Editor.sendToWindows('console:warn',text);
};

/**
 * Log the error message and show on the console,
 * it also shows the call stack start from the function call it.
 * The method will sends ipc message `console:error` to all windows.
 * @method error
 * @param {...*} [args] - whatever arguments the message needs
 */
Editor.error = function () {
    var text = Util.format.apply(Util, arguments);

    var e = new Error('dummy');
    var lines = e.stack.split('\n');
    text = text + '\n' + lines.splice(2).join('\n');

    if ( _consoleConnected )
        _logs.push({ type: 'error', message: text });

    Winston.error(text);
    Editor.sendToWindows('console:error',text);
};

/**
 * Log the fatal message and show on the console,
 * the app will quit immediately after that.
 * @method fatal
 * @param {...*} [args] - whatever arguments the message needs
 */
Editor.fatal = function () {
    var text = Util.format.apply(Util, arguments);

    var e = new Error('dummy');
    var lines = e.stack.split('\n');
    text = text + '\n' + lines.splice(2).join('\n');

    if ( _consoleConnected )
        _logs.push({ type: 'fatal', message: text });

    Winston.fatal(text);
    // NOTE: fatal error will close app immediately, no need for ipc.
};

/**
 * Connect to console panel. Once the console connected, all logs will kept in `core-level` and display
 * on the console panel in `page-level`.
 * @method connectToConsole
 */
Editor.connectToConsole = function () {
    _consoleConnected = true;
};

/**
 * Clear the logs
 * @method clearLog
 */
Editor.clearLog = function () {
    _logs = [];
};

Ipc.on ( 'console:log', function () { Editor.log.apply(Editor,arguments); } );
Ipc.on ( 'console:success', function () { Editor.success.apply(Editor,arguments); } );
Ipc.on ( 'console:failed', function () { Editor.failed.apply(Editor,arguments); } );
Ipc.on ( 'console:info', function () { Editor.info.apply(Editor,arguments); } );
Ipc.on ( 'console:warn', function () { Editor.warn.apply(Editor,arguments); } );
Ipc.on ( 'console:error', function () { Editor.error.apply(Editor,arguments); } );
Ipc.on ( 'console:clear', function () { Editor.clearLog(); } );
Ipc.on ( 'console:query', function ( reply ) {
    reply(_logs);
});

// ==========================
// pre-require modules
// ==========================

require('../share/platform') ;
Editor.JS = require('../share/js-utils') ;
Editor.Utils = require('../share/editor-utils');
require('../share/math');
require('./ipc-init');
Editor.Selection = require('../share/selection');
Editor.KeyCode = require('../share/keycode');

// ==========================
// profiles API
// ==========================

var _path2profiles = {};
function _saveProfile ( path, profile ) {
    var json = JSON.stringify(profile, null, 2);
    Fs.writeFileSync(path, json, 'utf8');
}

/**
 * Load profile via `name` and `type`, if no profile found, it will use the `defaultProfile` and save it to the disk.
 * You must register your profile path with `type` via {@link Editor.registerProfilePath} before you
 * can use it. The Editor Framework will search a profile under your register path with the `name`.
 * @method loadProfile
 * @param {string} name - The name of the profile.
 * @param {string} type - The type of the profile, make sure you register the type via {@link Editor.registerProfilePath}.
 * @param {object} defaultProfile - The default profile to use if the profile is not found.
 * @return {object} A profile object with two additional function:
 *  - save: save the profile.
 *  - clear: clear all properties in the profile.
 * @see Editor.registerProfilePath
 * @example
 * ```js
 * // register a project profile
 * Editor.registerProfilePath( 'project', '~/foo/bar');
 *
 * // load the profile at ~/foo/bar/foobar.json
 * var foobarProfile = Editor.loadProfile( 'foobar', 'project', {
 *   foo: 'foo',
 *   bar: 'bar',
 * });
 *
 * // change and save your profile
 * foobarProfile.foo = 'hello foo';
 * foobarProfile.save();
 * ```
 */
Editor.loadProfile = function ( name, type, defaultProfile ) {
    var path = Editor._type2profilepath[type];
    if ( !path ) {
        Editor.error( 'Failed to load profile by type %s, please register it first.', type );
        return null;
    }
    path = Path.join(path, name+'.json');

    var profile = _path2profiles[path];
    if ( profile ) {
        return profile;
    }

    var profileProto = {
        save: function () {
            _saveProfile( path, this );
        },
        clear: function () {
            for ( var p in this ) {
                if ( p !== 'save' && p !== 'clear' ) {
                    delete this[p];
                }
            }
        },
    };

    profile = defaultProfile || {};

    if ( !Fs.existsSync(path) ) {
        Fs.writeFileSync(path, JSON.stringify(profile, null, 2));
    }
    else {
        try {
            profile = JSON.parse(Fs.readFileSync(path));

            var p;
            if ( defaultProfile ) {
                for ( p in profile ) {
                    if ( defaultProfile[p] === undefined )
                        delete profile[p];
                }
                for ( p in defaultProfile ) {
                    if ( profile[p] === undefined ||
                         typeof(profile[p]) !== typeof(defaultProfile[p]) )
                    {
                        profile[p] = defaultProfile[p];
                    }
                }
                // save again
                Fs.writeFileSync(path, JSON.stringify(profile, null, 2));
            }
        }
        catch ( err ) {
            if ( err ) {
                Editor.warn( 'Failed to load profile %s, error message: %s', name, err.message );
                profile = {};
            }
        }
    }

    profile = Editor.JS.mixin( profile, profileProto );
    _path2profiles[path] = profile;

    return profile;
};

// ==========================
// misc API
// ==========================

var _packageWatcher;

/**
 * Quit the App
 * @method quit
 */
Editor.quit = function () {
    if ( _packageWatcher ) {
        _packageWatcher.close();
    }

    var winlist = Editor.Window.windows;
    for ( var i = 0; i < winlist.length; ++i ) {
        winlist[i].close();
    }

    Editor.events.emit('quit');

    App.quit();
};

Editor.loadPackagesAt = function ( path, cb ) {
    var idx = Editor._packagePathList.indexOf(path);
    if ( idx === -1 ) {
        Editor.warn( 'The package path %s is not registerred', path );
        return;
    }

    var paths = Globby.sync( path + '/*/package.json' );

    Async.eachSeries( paths, function ( path, done ) {
        path = Path.normalize(path);
        var packagePath = Path.dirname(path);
        Editor.Package.load( packagePath, function ( err ) {
            if ( err ) {
                Editor.failed('Failed to load package at %s', packagePath );
            }
            done();
        });
    }, function () {
        if ( cb ) cb ();
    });
};

/**
 * Search and load all packages from the path you registerred
 * {{#crossLink "Editor.registerPackagePath"}}{{/crossLink}}
 * @method loadAllPackages
 */
Editor.loadAllPackages = function ( cb ) {
    var i, src = [];
    for ( i = 0; i < Editor._packagePathList.length; ++i ) {
        src.push( Editor._packagePathList[i] + '/*/package.json' );
    }

    var paths = Globby.sync( src );

    Async.eachSeries( paths, function ( path, done ) {
        path = Path.normalize(path);
        var packagePath = Path.dirname(path);
        Editor.Package.load( packagePath, function ( err ) {
            if ( err ) {
                Editor.failed('Failed to load package at %s', packagePath );
            }
            done();
        });
    }, function () {
        if ( cb ) cb ();
    });
};

/**
 * Require module through url path
 * @method require
 * @param {string} url
 */
Editor.require = function ( url ) {
    return require( Editor.url(url) );
};

/**
 * Spawn child process that start from console
 * @method execSpawn
 * @param {string} command
 * @param {object} options
 */
Editor.execSpawn = function ( command, options ) {
    var file, args;
    options = options || {};

    if (process.platform === 'win32') {
        file = 'cmd.exe';
        args = ['/s', '/c', '"' + command + '"'];
        options.windowsVerbatimArguments = true;
    } else {
        file = '/bin/sh';
        args = ['-c', command];
        options.windowsVerbatimArguments = false;
    }

    var spawn = require('child_process').spawn;
    return spawn(file, args, options);
};

function _reloadPackages ( reloadInfos, cb ) {
    Async.each( reloadInfos, function ( info, done ) {
        var packageInfo = Editor.Package.packageInfo(info.path);
        if ( !packageInfo ) {
            done();
            return;
        }

        Async.series([
            function ( next ) {
                if ( !packageInfo.build ) {
                    next();
                    return;
                }

                Editor.log( 'Rebuilding ' + packageInfo.name );
                Editor.Package.build( packageInfo._path, next );
            },

            function ( next ) {
                var testerWin = Editor.Panel.findWindow('tester.panel');

                // reload test
                if ( info.reloadTest ) {
                    if ( testerWin ) {
                        testerWin.sendToPage('tester:run-tests', packageInfo.name);
                    }
                    next();
                    return;
                }

                // reload page
                if ( info.reloadPage ) {
                    for ( var panelName in packageInfo.panels ) {
                        var panelID = packageInfo.name + '.' + panelName;
                        Editor.sendToWindows( 'panel:out-of-date', panelID );
                    }

                    if ( testerWin ) {
                        testerWin.sendToPage('tester:run-tests', packageInfo.name);
                    }
                    next();
                    return;
                }

                // reload core
                if ( info.reloadCore ) {
                    Editor.Package.reload(packageInfo._path, {
                        rebuild: false
                    });
                    next();
                    return;
                }

                next();
            },
        ], function ( err ) {
            if ( err ) {
                Editor.error( 'Failed to reload package %s: %s', packageInfo.name, err.message );
            }

            done();
        });
    }, function ( err ) {
        if ( cb ) cb ();
    });
}

/**
 * Watch packages
 * @method watchPackages
 */
var _watchDebounceID = null;
var _packageReloadInfo = [];
Editor.watchPackages = function ( cb ) {
    //
    if ( Editor._packagePathList.length === 0 ) {
        if ( cb ) cb ();
        return;
    }

    var src = [];
    for ( i = 0; i < Editor._packagePathList.length; ++i ) {
        var packagePath = Editor._packagePathList[i];
        if ( Fs.existsSync(packagePath) ) {
            src.push( packagePath );
        }
    }
    _packageWatcher = Chokidar.watch(src, {
        ignored: [/[\/\\]\./, /[\/\\]bin/, /[\/\\]test[\/\\]fixtures/, /[\/\\]test[\/\\]playground/],
        ignoreInitial: true,
        persistent: true,
    });

    _packageWatcher
    .on('add', function(path) {
        _packageWatcher.add(path);
    })
    .on('addDir', function(path) {
        _packageWatcher.add(path);
    })
    .on('unlink', function(path) {
        _packageWatcher.unwatch(path);
    })
    .on('unlinkDir', function(path) {
        _packageWatcher.unwatch(path);
    })
    .on('change', function (path) {
        // NOTE: this is not 100% safe, because 50ms debounce still can have multiple
        //       same packages building together, to avoid this, try to use Async.queue

        var packageInfo = Editor.Package.packageInfo(path);
        if ( !packageInfo ) {
            return;
        }

        //
        var reloadInfo;
        for ( var i = 0; i < _packageReloadInfo.length; ++i ) {
            if ( _packageReloadInfo[i].path === packageInfo._path ) {
                reloadInfo = _packageReloadInfo[i];
                break;
            }
        }

        if ( !reloadInfo ) {
            reloadInfo = {
                path: packageInfo._path,
                reloadTest: false,
                reloadPage: false,
                reloadCore: false,
            };
            _packageReloadInfo.push(reloadInfo);
        }

        // reload test
        if ( Path.contains(Path.join(packageInfo._path, 'test') , path) ) {
            reloadInfo.reloadTest = true;
        }
        // reload page
        else if ( Path.contains(Path.join(packageInfo._path, 'page') , path) ||
                  Path.contains(Path.join(packageInfo._path, 'panel') , path) ||
                  Path.contains(Path.join(packageInfo._path, 'widget') , path) ) {
            reloadInfo.reloadPage = true;
        }
        // reload core
        else {
            reloadInfo.reloadCore = true;
        }

        // debounce write for 50ms
        if ( _watchDebounceID ) {
            clearTimeout(_watchDebounceID);
            _watchDebounceID = null;
        }
        _watchDebounceID = setTimeout(function () {
            _reloadPackages(_packageReloadInfo);
            _packageReloadInfo = [];
            _watchDebounceID = null;
        }, 50);
    })
    .on('error', function (error) {
        Editor.error('Package Watcher Error: %s', error.message);
    })
    .on('ready', function() {
        if ( cb ) cb ();
    })
    // .on('raw', function(event, path, details) { Editor.log('Raw event info:', event, path, details); })
    ;
};

// ==========================
// extends
// ==========================

Editor._type2profilepath = {};
Editor._packagePathList = [];
Editor._defaultLayout = '';

/**
 * Register profile type with the path you provide.
 * {{#crossLink "Editor.loadProfile"}}{{/crossLink}}
 * @method registerProfilePath
 * @param {string} type - The type of the profile you want to register.
 * @param {string} path - The path for the register type.
 */
Editor.registerProfilePath = function ( type, path ) {
    Editor._type2profilepath[type] = path;
};

/**
 * Register a path, when loading packages, it will search the path you registerred.
 * {{#crossLink "Editor.loadPackages"}}{{/crossLink}}
 * @method registerPackagePath
 * @param {string} path - A absolute path for searching your packages.
 */
Editor.registerPackagePath = function ( path ) {
    Editor._packagePathList.push(path);
};

/**
 * Unregister a package path
 */
Editor.unregisterPackagePath = function ( path ) {
    var idx = Editor._packagePathList.indexOf(path);
    if ( idx !== -1 ) {
        Editor._packagePathList.splice(idx,1);
    }
};

/**
 * Register a path, when loading packages, it will search the path you registerred.
 * {{#crossLink "Editor.loadPackages"}}{{/crossLink}}
 * @method registerDefaultLayout
 * @param {string} path - A absolute path for searching your packages.
 */
Editor.registerDefaultLayout = function ( path ) {
    Editor._defaultLayout = path;
};

/**
 * register default main menu template function
 * @method
 * @param {function} tmplFn
 */
Editor.registerDefaultMainMenu = function ( tmplFn ) {
    Editor._defaultMainMenu = tmplFn;
};

// ==========================
// load modules
// ==========================

Editor.Menu = require('./editor-menu');
Editor.Window = require('./editor-window');
Editor.Panel = require('./editor-panel');
Editor.Package = require('./editor-package');
Editor.Debugger = require('./debugger');

Editor.MainMenu = require('./main-menu');
