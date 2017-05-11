var Fs = require('fire-fs');
var Path = require('path');
var Del = require('del');
var Chalk = require('chalk');
var Npmconf = require('npmconf');

var gulp = require('gulp');
var gulpSequence = require('gulp-sequence');

var git = require('./utils/libs/git.js');
var pjson = require('./package.json');
var spawn = require('child_process').spawn;

// require tasks
require('./utils/gulp-tasks/electron-tasks');
require('./utils/gulp-tasks/setup-tasks');

// init and update
// =====================================

gulp.task('bootstrap',
    gulpSequence([
        'install-builtin',
        'install-shared-packages'
    ],'update-electron')
);

gulp.task('update',
    gulpSequence(
        'setup-branch',
        'update-editor-framework',
        'update-builtin',
        'remove-builtin-bin',
        'update-shared-packages',
        'update-electron',
        'check-dependencies'
    )
);

gulp.task('pre-install-npm', ['setup-mirror'], function(cb) {
    var mirror = JSON.parse(Fs.readFileSync('local-setting.json')).mirror;
    Npmconf.load(function(_, conf) {
        var registry = Npmconf.defaults.registry;
        if (mirror === 'china') {
            registry = 'http://registry.npm.taobao.org/';
        }
        conf.set('registry', registry, 'user');
        conf.save('user', cb);
    });
});

gulp.task('post-install-npm', function(cb) {
    // resume the default config when being installed
    Npmconf.load(function(_, conf) {
        conf.set('registry', Npmconf.defaults.registry, 'user');
        conf.save('user', cb);
    });
});

// run
// =====================================

gulp.task('run', function(cb) {
    var cmdStr = '';
    var optArr = [];
    if (process.platform === 'win32') {
        cmdStr = 'bin\\electron\\electron.exe';
        optArr = ['.\\', '--debug=3030', '--dev', '--show-devtools'];
    }
    else if (process.platform === 'darwin') {
        cmdStr = 'bin/electron/Electron.app/Contents/MacOS/Electron';
        optArr = ['./', '--debug=3030', '--dev', '--show-devtools'];
    }
    else {
        cmdStr = 'bin/electron/electron';
        optArr = ['./', '--debug=3030', '--dev', '--show-devtools'];
    }
    var child = spawn(cmdStr, optArr, {
        stdio: 'inherit'
    });
    child.on('exit', function() {
        cb();
    });
});

// self
// =====================================

gulp.task('update-editor-framework', function(cb) {
    var Async = require('async');

    Async.series([
        function ( next ) {
            git.exec(['pull', 'https://github.com/fireball-x/editor-framework.git', 'master'], './', next);
        },

        function ( next ) {
            console.log('editor-framework update complete!');
            git.exec(['fetch', '--all'], './', next);
        },

        function ( next ) {
            // NOTE: when we update the main project, we should reload its package.json
            pjson = JSON.parse(Fs.readFileSync('./package.json'));
            next();
        },

    ], function ( err ) {
        if ( err ) throw err;
        cb ();
    });
});

// builtin
// =====================================

gulp.task('install-builtin', function(cb) {
    Fs.ensureDirSync('builtin');

    var Async = require('async');
    Async.eachLimit( pjson.builtins, 5, function ( name, done ) {
        git.clone('https://github.com/fireball-packages/' + name,
                  Path.join('builtin', name),
                  done);
    }, function ( err ) {
        console.log('Builtin packages installation complete!');
        cb();
    });
});

gulp.task('update-builtin', function(cb) {
    var setting = JSON.parse(Fs.readFileSync('local-setting.json'));

    if ( !Fs.isDirSync('builtin') ) {
        console.error(Chalk.red('Builtin folder not initialized, please run "gulp install-builtin" first!'));
        return cb();
    }

    var Async = require('async');
    Async.eachLimit( pjson.builtins, 5, function ( name, done ) {
        if ( !Fs.existsSync(Path.join('builtin', name, '.git')) ) {
            console.error(Chalk.red('Builtin package ' + name + ' not initialized, please run "gulp install-builtin" first!'));
            process.exit(1);
            return;
        }

        var branch = 'master';
        if ( setting.branch.builtins ) {
            branch = setting.branch.builtins.name || 'master';
        }

        git.pull(Path.join('builtin', name),
                 'https://github.com/fireball-packages/' + name,
                 branch,
                 done);
    }, function ( err ) {
        if ( err ) {
            process.exit(1);
            return;
        }

        console.log('Builtin packages update complete!');
        return cb();
    });
});

gulp.task('remove-builtin-bin', function(cb) {
    var bins = pjson.builtins.filter(function(name) {
        var json = JSON.parse(Fs.readFileSync(Path.join('builtin', name, 'package.json')));
        return json.build;
    }).map(function (name) {
        return Path.join('builtin', name, 'bin');
    });

    console.log('Clean built files for ' + bins);
    Del(bins, function(err) {
        if (err) {
            throw err;
        }

        console.log('Builtin Packages Cleaned! Will be rebuilt when Icebolt launches.');
        cb();
    });
});

gulp.task('prune-builtin', function(cb) {
    var results = Fs.readdirSync('builtin').filter(function ( name ) {
        return pjson.builtins.indexOf(name) === -1;
    });

    results = results.map(function ( name ) {
        return Path.join( 'builtin', name );
    });

    Del( results, function ( err ) {
        if (err) {
            throw err;
        }

        results.forEach( function (name) {
            console.log( 'Prune builtin package ' + name );
        });

        cb();
    });
});

// shared-packages
// =====================================

gulp.task('install-shared-packages', function(cb) {
    var Async = require('async');
    Async.eachLimit( pjson.sharedPackages, 5, function ( name, done ) {
        git.clone('https://github.com/fireball-packages/' + name,
                  name,
                  done);
    }, function ( err ) {
        console.log('Shared packages installation complete!');
        cb();
    });
});

gulp.task('update-shared-packages', function(cb) {
    var setting = JSON.parse(Fs.readFileSync('local-setting.json'));

    var Async = require('async');
    Async.eachLimit( pjson.sharedPackages, 5, function ( name, done ) {
        if ( !Fs.existsSync(Path.join(name, '.git')) ) {
            console.error(Chalk.red('Shared package ' + name + ' not initialized, please run "gulp install-shared-packages" first!'));
            process.exit(1);
            return;
        }

        var branch = 'master';
        if ( setting.branch.sharedPackages ) {
            branch = setting.branch.sharedPackages.name || 'master';
        }

        git.pull(name,
                 'https://github.com/fireball-packages/' + name,
                 branch,
                 done);
    }, function ( err ) {
        if ( err ) {
            process.exit(1);
            return;
        }

        console.log('Shared packages update complete!');
        return cb();
    });
});

// native rebuild
// =====================================

function findNativeModulePathRecursive(path) {
    var nativePaths = [];
    if (Fs.existsSync(Path.join(path, 'binding.gyp'))) {
        nativePaths.push(path);
    } else {
        if (Fs.isDirSync(Path.join(path, 'node_modules'))) {
            var subPaths = Fs.readdirSync(Path.join(path, 'node_modules'));
            subPaths.forEach(function(subpath) {
                var subCollect = findNativeModulePathRecursive(Path.join(path, 'node_modules', subpath));
                if (subCollect.length > 0) {
                    nativePaths = nativePaths.concat(subCollect);
                }
            });
        }
    }
    return nativePaths;
}

gulp.task('npm-rebuild', function(cb) {
    var cmdstr;
    var tmpenv = process.env;
    var arch;
    if (process.platform === 'win32') {
        cmdstr = 'node-gyp.cmd';
        tmpenv.HOME = Path.join(tmpenv.HOMEPATH, '.electron-gyp');
        arch = 'ia32';
    } else {
        cmdstr = 'node-gyp';
        tmpenv.HOME = Path.join(tmpenv.HOME, '.electron-gyp');
        var os = require('os');
        arch = os.arch();
    }
    var disturl = 'https://atom.io/download/atom-shell';
    var target = pjson.electronVersion;
    // var arch = process.platform === 'win32' ? 'ia32' : 'x64';
    var nativePaths = findNativeModulePathRecursive('.');
    console.log('rebuilding native modules: \n' + nativePaths);
    var count = nativePaths.length;
    if (count === 0) {
        console.log('no native module found!');
        return cb();
    }
    nativePaths.forEach(function(path) {
        var child = spawn(cmdstr, [
            'rebuild', '--target='+target,
            '--arch='+arch, '--dist-url='+disturl
            ], {
            stdio: 'inherit',
            env: tmpenv,
            cwd: path
        });
        child.on('exit', function() {
            if (--count <= 0) {
                cb();
            }
        });
    });
});

// deps
// =====================================

gulp.task('check-dependencies', function(cb) {
    var checkdeps = require('check-dependencies');
    console.log(Chalk.cyan('====Checking Dependencies===='));
    var count = 2;
    checkdeps({
        packageManager: 'npm',
        verbose: true,
        checkGitUrls: true
    }, function() {
        if (--count<=0) {
            console.log('If you see any version number in ' + Chalk.red('red') + '. Please run ' + Chalk.cyan('"npm install && bower install"') + 'to install missing dependencies');
            cb();
        }
    });
    checkdeps({
        packageManager: 'bower',
        verbose: true,
        checkGitUrls: true
    }, function() {
        if (--count<=0) {
            console.log('If you see any version number in ' + Chalk.red('red') + '. Please run ' + Chalk.cyan('"npm install && bower install"') + 'to install missing dependencies');
            cb();
        }
    });
});
