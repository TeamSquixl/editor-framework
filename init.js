/**
 * Editor is a module contains app-wide core editor functionality. You can access properties or methods of Editor module anytime, anywhere in Fireball
 * @module Editor
 * @main
 */
global.Editor = {};

// ---------------------------
// precheck
// ---------------------------

(function () {
    if ( !__app ) {
        console.error( '\'global.__app\' is undefined.');
        process.exit(1);
        return;
    }
    /**
     * The Editor.App is your app.js module. Read more details in
     * [Define your application](https://github.com/fireball-x/editor-framework/blob/master/docs/manual/define-your-app.md).
     * @property App
     * @type object
     */
    Editor.App = __app;
})();

var App = require('app');
/**
 * The current app.js running directory.
 * @property appPath
 * @type string
 */
Editor.appPath = App.getAppPath();

// ---------------------------
// load modules
// ---------------------------

var Path = require('fire-path');
var Fs = require('fire-fs');
var Url = require('fire-url');
var Commander = require('commander');
var Chalk = require('chalk');
var Winston = require('winston');
var Async = require('async');

// this will prevent default atom-shell uncaughtException
process.removeAllListeners('uncaughtException');
process.on('uncaughtException', function(error) {
    if ( Editor && Editor.sendToWindows ) {
        Editor.sendToWindows('console:error', error.stack || error);
    }
    Winston.uncaught( error.stack || error );
});

var _appPackageJson = JSON.parse(Fs.readFileSync(Path.join(Editor.appPath,'package.json')));
var _editorFrameworkPackageJson = JSON.parse(Fs.readFileSync(Path.join(__dirname,'package.json')));

// ---------------------------
// initialize minimal Editor
// ---------------------------

/**
 * The name of your app. It is defined in the `name` field in package.json
 * @property name
 * @type string
 */
Editor.name = App.getName();

/**
 * versions of your app and submodules
 * @property versions
 * @type Object
 */
Editor.versions = {
    'editor-framework': _editorFrameworkPackageJson.version,
};
Editor.versions[Editor.name] = App.getVersion();

/**
 * The absolute path of your main entry file. Usually it is `{your-app}/app.js`.
 * @property mainEntry
 * @type string
 */
Editor.mainEntry = Path.join( Editor.appPath, _appPackageJson.main );

/**
 * The editor framework module path. Usually it is `{your-app}/editor-framework/`
 * @property frameworkPath
 * @type string
 */
Editor.frameworkPath = __dirname;

/**
 * Your application's data path. Usually it is `~/.{your-app-name}`
 * @property appHome
 * @type string
 */
Editor.appHome = Path.join( App.getPath('home'), '.' + Editor.name );

// initialize ~/.{app-name}
Fs.ensureDirSync(Editor.appHome);

// initialize ~/.{app-name}/local/
var settingsPath = Path.join(Editor.appHome, 'local');
if ( !Fs.existsSync(settingsPath) ) {
    Fs.mkdirSync(settingsPath);
}

var EventEmitter = require('events');
Editor.events = new EventEmitter();

// ---------------------------
// initialize logs/
// ---------------------------

// MacOSX: ~/Library/Logs/{app-name}
// Windows: %APPDATA%, some where like 'C:\Users\{your user name}\AppData\Local\...'

// get log path
var _logpath = '';
if ( process.platform === 'darwin' ) {
    _logpath = Path.join(App.getPath('home'), 'Library/Logs/' + Editor.name );
}
else {
    _logpath = Path.join(App.getPath('appData'), Editor.name);
}

Fs.ensureDirSync(_logpath);

var _logfile = Path.join(_logpath, Editor.name + '.log');
if ( Fs.existsSync(_logfile) ) {
    Fs.unlinkSync(_logfile);
}

var winstonLevels = {
    normal   : 0,
    success  : 1,
    failed   : 2,
    info     : 3,
    warn     : 4,
    error    : 5,
    fatal    : 6,
    uncaught : 7,
};
Winston.setLevels(winstonLevels);

Winston.remove(Winston.transports.Console);
Winston.add(Winston.transports.File, {
    level: 'normal',
    filename: _logfile,
    json: false,
});

var chalk_id = Chalk.bgBlue;
var chalk_success = Chalk.green;
var chalk_warn = Chalk.yellow;
var chalk_error = Chalk.red;
var chalk_info = Chalk.cyan;

var levelToFormat = {
    normal: function ( text ) {
        var pid = chalk_id('[' + process.pid + ']') + ' ';
        return pid + text;
    },

    success: function ( text ) {
        var pid = chalk_id('[' + process.pid + ']') + ' ';
        return pid + chalk_success(text);
    },

    failed: function ( text ) {
        var pid = chalk_id('[' + process.pid + ']') + ' ';
        return pid + chalk_error(text);
    },

    info: function ( text ) {
        var pid = chalk_id('[' + process.pid + ']') + ' ';
        return pid + chalk_info(text);
    },

    warn: function ( text ) {
        var pid = chalk_id('[' + process.pid + ']') + ' ';
        return pid + chalk_warn.inverse.bold('Warning:') + ' ' + chalk_warn(text);
    },

    error: function ( text ) {
        var pid = chalk_id('[' + process.pid + ']') + ' ';
        return pid + chalk_error.inverse.bold('Error:') + ' ' + chalk_error(text);
    },

    fatal: function ( text ) {
        var pid = chalk_id('[' + process.pid + ']') + ' ';
        return pid + chalk_error.inverse.bold('Fatal Error:') + ' ' + chalk_error(text);
    },

    uncaught: function ( text ) {
        var pid = chalk_id('[' + process.pid + ']') + ' ';
        return pid + chalk_error.inverse.bold('Uncaught Exception:') + ' ' + chalk_error(text);
    },
};

Winston.add( Winston.transports.Console, {
    level: 'normal',
    formatter: function (options) {
        var pid = chalk_id('[' + process.pid + ']') + ' ';
        var text = '';
        if ( options.message !== undefined ) {
            text += options.message;
        }
        if ( options.meta && Object.keys(options.meta).length ) {
            text += ' ' + JSON.stringify(options.meta);
        }

        // output log by different level
        var formatter = levelToFormat[options.level];
        if ( formatter ) {
            return formatter(text);
        }

        return text;
    }
});

// ---------------------------
// initialize Commander
// ---------------------------

function _parseList(listStr) {
    return listStr.split(',');
}
// NOTE: commander only get things done barely in core level,
//       it doesn't touch the page level, so it should not put into App.on('ready')
Commander
    .version(App.getVersion())
    .option('--dev', 'Run in development environment')
    .option('--dev-mode <mode>', 'Run in specific dev-mode')
    .option('--show-devtools', 'Open devtools automatically when main window loaded')
    .option('--debug <port>', 'Open in browser context debug mode', parseInt )
    .option('--debug-brk <port>', 'Open in browser context debug mode, and break at first.', parseInt)
    .option('--test <path>', 'Run tests in path' )
    .option('--report-failures', 'Send test failures to the main process')
    .option('--report-details', 'Send test details to the main process' )
    ;

// EXAMPLE:

// usage
// Commander
//     .usage('[options] <file ...>')
//     ;

// command
// Commander
//     .command('foobar').action( function () {
//         console.log('foobar!!!');
//         process.exit(1);
//     })
//     ;

if ( Editor.App.initCommander ) {
    Editor.App.initCommander(Commander);
}

// finish Commander initialize
Commander.parse(process.argv);

// apply argv to Editor
Editor.isDev = Commander.dev;
Editor.devMode = Commander.devMode;
Editor.showDevtools = Commander.showDevtools;
Editor.debugPort = Commander.debug;

// ---------------------------
// Define Editor.App APIs
// ---------------------------

var _editorAppIpc;
function _loadEditorApp () {
    var editorApp = Editor.App;

    if ( editorApp.load ) {
        try {
            Editor.App.load();
        }
        catch (err) {
            Editor.failed( 'Failed to load Editor.App, %s.', err.stack );
            return;
        }
    }

    // register ipcs
    var ipcListener = new Editor.IpcListener();
    for ( var prop in editorApp ) {
        if ( prop.indexOf('app:') !== 0 )
            continue;

        if ( typeof editorApp[prop] === 'function' ) {
            ipcListener.on( prop, editorApp[prop].bind(editorApp) );
        }
    }
    _editorAppIpc = ipcListener;
}

function _unloadEditorApp () {
    var editorApp = Editor.App;

    // unregister main ipcs
    _editorAppIpc.clear();
    _editorAppIpc = null;

    // unload main
    var cache = require.cache;
    if ( editorApp.unload ) {
        try {
            editorApp.unload();
        }
        catch (err) {
            Editor.failed( 'Failed to unload Editor.App, %s.', err.stack );
        }
    }

    delete cache[Editor.mainEntry];
    delete global.__app;
}

function _reloadEditorApp () {
    _unloadEditorApp();
    require(Editor.mainEntry);
    Editor.App = __app;
    Editor.App.reload = _reloadEditorApp;
    _loadEditorApp();

    Editor.success('Editor.App reloaded');
}

// ---------------------------
// register App events
// ---------------------------

// DISABLE: http cache only happends afterwhile, not satisefy our demand (which need to happend immediately).
// App.commandLine.appendSwitch('disable-http-cache');
// App.commandLine.appendSwitch('disable-direct-write');

// quit when all windows are closed.
App.on('window-all-closed', function( event ) {
    App.quit();
});

//
App.on('will-finish-launching', function() {
    if ( !Editor.isDev ) {
        var crashReporter = require('crash-reporter');
        crashReporter.start({
            productName: Editor.name,
            companyName: 'Firebox Technology',
            submitUrl: 'https://fireball-x.com/crash-report',
            autoSubmit: false,
        });
    }
});

//
App.on('gpu-process-crashed', function() {
    if ( Editor && Editor.sendToWindows ) {
        Editor.sendToWindows('console:error', 'GPU Process Crashed!');
    }
    Winston.uncaught('GPU Process Crashed!');
});

//
App.on('ready', function() {
    Winston.normal( 'Initializing Protocol' );
    require('./core/protocol-init');

    Winston.normal( 'Initializing Editor' );
    require('./core/editor-init');

    if ( Commander.test ) {
        var Test = require('./core/test-runner');

        if (Commander.test) {
            Test.run(Commander.test, {
                reportFailures: Commander.reportFailures,
                reportDetails: Commander.reportDetails,
            });
        }

        return;
    }

    // apply default main menu
    Editor.MainMenu.apply();

    // register profile path
    Editor.registerProfilePath( 'app', Editor.appHome );
    Editor.registerProfilePath( 'local', Path.join( Editor.appHome, 'local' ) );

    // register package path
    Editor.registerPackagePath( Path.join( Editor.appPath, 'builtin' ) );

    // register default layout
    Editor.registerDefaultLayout( Editor.url('editor-framework://static/layout.json') );

    // before run the app, we start load and watch all packages
    Async.series([
        // init app
        function ( next ) {
            // init user App
            if ( !Editor.App.init ) {
                Winston.error('Can not find function "init" in your App');
                App.terminate();
                return;
            }

            try {
                Editor.App.init(Commander, next);
            } catch ( error ) {
                Winston.error(error.stack || error);
                App.terminate();
                return;
            }
        },

        function ( next ) {
            Winston.normal('Loading packages');
            Editor.loadAllPackages( next );
        },

        function ( next ) {
            Winston.normal('Prepare for watching packages');
            Editor.watchPackages( next );
        },

        function ( next ) {
            Editor.success('Watch ready');

            Winston.success('Initial success!');

            // register user App Ipcs after App.init
            _loadEditorApp();
            Editor.App.reload = _reloadEditorApp;

            // load windows layout after local profile registered
            Editor.Window.loadLayouts();

            // connect to console to sending ipc to it
            Editor.connectToConsole();

            // run user App
            if ( !Editor.App.run ) {
                Winston.error('Can not find function "run" in your App');
                App.terminate();
                return;
            }

            try {
                Editor.App.run();
            } catch ( error ) {
                Winston.error(error.stack || error);
                App.terminate();
                return;
            }
        },
    ], function ( error ) {
        if ( error ) {
            Winston.error(error.stack || error);
            App.terminate();
        }
    });
});
