var NativeImage = require('native-image');
var Ipc = require('ipc');
var Path = require('fire-path');
var Fs = require('fire-fs');
var Del = require('del');
var Async = require('async');
var Semver = require('semver');

/**
 * Package module for manipulating packages
 * @module Editor.Package
 */
var Package = {};
var _path2package = {};
var _name2packagePath = {};
var _panel2info = {};
var _widget2info = {};

function _build ( packageObj, cb ) {
    if ( packageObj.build ) {
        // check if bin/dev exists
        var binPath = Path.join( packageObj._path, 'bin/dev' );
        if ( Fs.existsSync(binPath) ) {
            var packageJsonPath = Path.join( binPath, 'package.json');
            if (  Fs.existsSync(packageJsonPath)  ) {
                // check if bin/dev/package.json have the same version
                var binPackageObj = JSON.parse(Fs.readFileSync(packageJsonPath));
                if ( packageObj.version === binPackageObj.version ) {
                    if ( cb ) cb ( null, binPath );
                    return;
                }
            }
        }

        Editor.log( 'Building ' + packageObj.name );
        Package.build( packageObj._path, cb );
        return;
    }

    if ( cb ) cb ( null, packageObj._path );
}

/**
 * Load a package at path
 * @method load
 * @param {string} path - An absolute path point to a package folder
 * @param {function} cb - Callback when finish loading
 */
Package.load = function ( path, cb ) {
    if ( _path2package[path] ) {
        if ( cb ) cb ();
        return;
    }

    var packageJsonPath = Path.join( path, 'package.json' );
    var packageObj;
    try {
        packageObj = JSON.parse(Fs.readFileSync(packageJsonPath));
    }
    catch (err) {
        Editor.error( 'Failed to load package.json at %s, message: %s', path, err.message );
        if ( cb ) cb ();
        return;
    }

    // check host, if we don't have the host, skip load it
    for ( var host in packageObj.hosts ) {
        var currentVer = Editor.versions[host];
        if ( !currentVer ) {
            Editor.failed( 'Skip loading %s, host %s not exists.', packageObj.name, host );
            if ( cb ) cb ();
            return;
        }

        var requireVer = packageObj.hosts[host];
        if ( !Semver.satisfies( currentVer, requireVer ) ) {
            Editor.failed( 'Skip loading %s, host %s require ver %s.', packageObj.name, host, requireVer );
            if ( cb ) cb ();
            return;
        }
    }

    //
    packageObj._path = path;
    _build ( packageObj, function ( err, destPath ) {
        packageObj._destPath = destPath;

        // load main.js
        if ( packageObj.main ) {
            var main;
            var mainPath = Path.join( destPath, packageObj.main );
            try {
                main = require(mainPath);
                if ( main && main.load ) {
                    main.load();
                }
            }
            catch (e) {
                Editor.failed( 'Failed to load %s from %s. %s.', packageObj.main, packageObj.name, e.stack );
                if ( cb ) cb ();
                return;
            }

            // register main ipcs
            var ipcListener = new Editor.IpcListener();
            for ( var prop in main ) {
                if ( prop === 'load' || prop === 'unload' )
                    continue;

                if ( typeof main[prop] === 'function' ) {
                    ipcListener.on( prop, main[prop].bind(main) );
                }
            }
            packageObj._ipc = ipcListener;
        }

        // register menu
        if ( packageObj.menus && typeof packageObj.menus === 'object' ) {
            for ( var menuPath in packageObj.menus ) {
                var parentMenuPath = Path.dirname(menuPath);
                if ( parentMenuPath === '.' ) {
                    Editor.error( 'Can not add menu %s at root.', menuPath );
                    continue;
                }

                var menuOpts = packageObj.menus[menuPath];
                var template = Editor.JS.mixin( {
                    label: Path.basename(menuPath),
                }, menuOpts );

                // create NativeImage for icon
                if ( menuOpts.icon ) {
                    var icon = NativeImage.createFromPath( Path.join(destPath, menuOpts.icon) );
                    template.icon = icon;
                }

                Editor.MainMenu.add( parentMenuPath, template );
            }
        }

        // register panel
        if ( packageObj.panels && typeof packageObj.panels === 'object' ) {
            for ( var panelName in packageObj.panels ) {
                var panelID = packageObj.name + '.' + panelName;
                if ( _panel2info[panelID] ) {
                    Editor.error( 'Failed to load panel \'%s\' from \'%s\', already exists.', panelName, packageObj.name );
                    continue;
                }

                // setup default properties
                var panelInfo = packageObj.panels[panelName];
                Editor.JS.addon(panelInfo, {
                    type: 'dockable',
                    title: panelID,
                    popable: true,
                    messages: [],
                    path: destPath,
                });

                //
                _panel2info[panelID] = panelInfo;
            }
        }

        // register widget
        if ( packageObj.widgets && typeof packageObj.widgets === 'object' ) {
            for ( var widgetName in packageObj.widgets ) {
                if ( _widget2info[widgetName] ) {
                    Editor.error( 'Failed to register widget \'%s\' from \'%s\', already exists.', widgetName, packageObj.name );
                    continue;
                }
                var widgetPath = packageObj.widgets[widgetName];
                _widget2info[widgetName] = {
                    path: Path.join( destPath, Path.dirname(widgetPath) ),
                };
            }
        }

        //
        _path2package[path] = packageObj;
        _name2packagePath[packageObj.name] = path;
        Editor.success('%s loaded', packageObj.name);
        Editor.sendToWindows('package:loaded', packageObj.name);

        if ( cb ) cb ();
    });
};

/**
 * Unload a package at path
 * @method unload
 * @param {string} path - An absolute path point to a package folder
 * @param {function} cb - Callback when finish unloading
 */
Package.unload = function ( path, cb ) {
    var packageObj = _path2package[path];
    if ( !packageObj ) {
        if ( cb ) cb ();
        return;
    }

    // unregister panel
    if ( packageObj.panels && typeof packageObj.panels === 'object' ) {
        for ( var panelName in packageObj.panels ) {
            var panelID = packageObj.name + '.' + panelName;
            delete _panel2info[panelID];
        }
    }

    // unregister widget
    if ( packageObj.widgets && typeof packageObj.widgets === 'object' ) {
        for ( var widgetName in packageObj.widgets ) {
            delete _widget2info[widgetName];
        }
    }

    // unregister menu
    if ( packageObj.menus && typeof packageObj.menus === 'object' ) {
        for ( var menuPath in packageObj.menus ) {
            Editor.MainMenu.remove( menuPath );
        }
    }

    // unload main.js
    if ( packageObj.main ) {
        // unregister main ipcs
        packageObj._ipc.clear();

        // unload main
        var cache = require.cache;
        var mainPath = Path.join( packageObj._destPath, packageObj.main );
        var module = cache[mainPath];
        try {
            if ( module ) {
                var main = module.exports;
                if ( main && main.unload ) {
                    main.unload();
                }
            }
        }
        catch (err) {
            Editor.failed( 'Failed to unload %s from %s. %s.', packageObj.main, packageObj.name, err.stack );
        }
        delete cache[mainPath];
    }

    //
    delete _path2package[path];
    delete _name2packagePath[packageObj.name];
    Editor.success('%s unloaded', packageObj.name);
    Editor.sendToWindows('package:unloaded', packageObj.name);

    if ( cb ) cb ();
};

/**
 * Reload a package at path
 * @method reload
 * @param {string} path - An absolute path point to a package folder
 * @param {object} opts - Options
 * @param {Boolean} opts.rebuild - If rebuild the project
 * @param {function} cb - Callback when finish reloading
 */
Package.reload = function ( path, opts, cb ) {
    opts = opts || {};
    var rebuild = (typeof opts.rebuild === 'boolean') ? opts.rebuild : true;

    Async.series([
        function ( next ) {
            var packageObj = _path2package[path];
            if ( !packageObj ) {
                next ();
                return;
            }

            if ( rebuild && packageObj.build ) {
                Editor.log( 'Rebuilding ' + packageObj.name );
                Package.build( path, next );
            }
            else {
                next ();
            }
        },

        function ( next ) {
            Package.unload(path, next);
        },

        function ( next ) {
            Package.load(path, next);
        },
    ], function ( err ) {
        if (cb) cb ( err );
    });
};

/**
 * Find and get panel info via panelID, the panel info is the json object
 * that defined in `panels.{panel-name}` in your package.json
 * @method panelInfo
 * @param {string} panelID
 * @return {object}
 */
Package.panelInfo = function ( panelID ) {
    return _panel2info[panelID];
};

/**
 * Find and get panel info via widgetName, the widget info is the json object
 * that defined in `widgets.{widget-name}` in your package.json
 * @method widgetInfo
 * @param {string} widgetName
 * @return {object}
 */
Package.widgetInfo = function ( widgetName ) {
    return _widget2info[widgetName];
};

/**
 * Find and get package info via path, the package info is the json object of your package.json file
 * @method packageInfo
 * @param {string} path - The path can be any files in this package
 * @return {object}
 */
Package.packageInfo = function ( path ) {
    for ( var p in _path2package ) {
        if ( Path.contains( p, path )  ) {
            return _path2package[p];
        }
    }
    return null;
};

/**
 * Return the path of the package by name
 * @method packagePath
 * @param {string} packageName
 * @return {string}
 */
Package.packagePath = function ( packageName ) {
    return _name2packagePath[packageName];
};

/**
 * Build package at path
 * @method build
 * @param {string} path
 * @param {function} callback
 * @return {string}
 */
Package.build = function ( path, cb ) {
    var BuildPackage = require('./build-package');
    BuildPackage.start({
        path: path,
        minify: false,
        babel: false,
    }, function ( err ) {
        if ( err ) {
            Editor.error('Failed to build package at %s, %s', path, err.message );
        }
        if ( cb ) cb ( err, Path.join(path, 'bin/dev') );
    });
};

// ========================================
// Ipc
// ========================================

Ipc.on('package:query-infos', function ( reply ) {
    var builtinPath = Path.join( Editor.appPath, 'builtin' );
    var results = [];

    for ( var path in _path2package ) {
        results.push({
            path: path,
            builtin: Path.contains( builtinPath, path ),
            enabled: true, // TODO:
            info: _path2package[path],
        });
    }

    reply(results);
});

Ipc.on('package:query-info', function ( reply, name ) {
    var path = _name2packagePath[name];
    path = path ? path : '';

    var info = _path2package[path];
    var builtinPath = Path.join( Editor.appPath, 'builtin' );

    reply({
        path: path,
        builtin: Path.contains( builtinPath, path ),
        enabled: true, // TODO:
        info: info,
    });
});

Ipc.on('package:reload', function ( name ) {
    var path = _name2packagePath[name];
    if ( !path ) {
        Editor.error('Failed to reload package %s, not found', name);
        return;
    }

    Package.reload(path);
});

module.exports = Package;
