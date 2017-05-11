var Ipc = require('ipc');
var BrowserWindow = require('browser-window');
var Menu = require('menu');
var Path = require('fire-path');
var Fs = require('fire-fs');

function getDefaultMainMenu () {
    return [
        // Help
        {
           label: 'Help',
           id: 'help',
           submenu: [
           ]
        },

        // Fireball
        {
            label: 'Editor Framework',
            position: 'before=help',
            submenu: [
                {
                    label: 'Hide',
                    accelerator: 'CmdOrCtrl+H',
                    selector: 'hide:'
                },
                {
                    label: 'Hide Others',
                    accelerator: 'CmdOrCtrl+Shift+H',
                    selector: 'hideOtherApplications:'
                },
                {
                    label: 'Show All',
                    selector: 'unhideAllApplications:'
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: function () {
                        Editor.Window.saveWindowStates();
                        Editor.quit();
                    }
                },
            ]
        },

        // Edit
        {
            label: 'Edit',
            submenu: [
                {
                   label: 'Undo',
                   accelerator: 'CmdOrCtrl+Z',
                   selector: 'undo:'
                },
                {
                   label: 'Redo',
                   accelerator: 'Shift+CmdOrCtrl+Z',
                   selector: 'redo:'
                },
                { type: 'separator' },
                {
                   label: 'Cut',
                   accelerator: 'CmdOrCtrl+X',
                   selector: 'cut:'
                },
                {
                   label: 'Copy',
                   accelerator: 'CmdOrCtrl+C',
                   selector: 'copy:'
                },
                {
                   label: 'Paste',
                   accelerator: 'CmdOrCtrl+V',
                   selector: 'paste:'
                },
                {
                   label: 'Select All',
                   accelerator: 'CmdOrCtrl+A',
                   selector: 'selectAll:'
                },
            ]
        },

        // Window
        {
            label: 'Window',
            id: 'window',
            submenu: Editor.isDarwin ?
            [
                {
                    label: 'Minimize',
                    accelerator: 'CmdOrCtrl+M',
                    selector: 'performMiniaturize:',
                },
                {
                    label: 'Close',
                    accelerator: 'CmdOrCtrl+W',
                    selector: 'performClose:',
                },
                { type: 'separator' },
                {
                    label: 'Bring All to Front',
                    selector: 'arrangeInFront:'
                },
            ] :
            [
                {
                    label: "Close",
                    accelerator: 'CmdOrCtrl+W',
                    click: function () {
                        Editor.Window.saveWindowStates();
                        Editor.quit();
                    },
                }
            ]
        },

        // Panel
        {
            label: 'Panel',
            id: 'panel',
            submenu: [
            ]
        },

        // Layout
        {
            label: 'Layout',
            id: 'layout',
            submenu: [
                {
                    label: 'Debuggers',
                    click: function () {
                        var layoutInfo = JSON.parse(Fs.readFileSync(Editor.url('editor-framework://static/layout.json') ));
                        Editor.sendToMainWindow( 'editor:reset-layout', layoutInfo);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Empty',
                    click: function () {
                        Editor.sendToMainWindow( 'editor:reset-layout', null);
                    }
                },
            ]
        },

        // Developer
        {
            label: 'Developer',
            id: 'developer',
            submenu: [
                {
                    label: 'Command Palette',
                    accelerator: 'CmdOrCtrl+:',
                    click: function() {
                        Editor.mainWindow.focus();
                        Editor.sendToMainWindow('cmdp:show');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: function() {
                        // DISABLE: Editor.clearLog();
                        BrowserWindow.getFocusedWindow().reload();
                    }
                },
                {
                    label: 'Reload Ignoring Cache',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: function() {
                        // DISABLE: Editor.clearLog();
                        BrowserWindow.getFocusedWindow().reloadIgnoringCache();
                    }
                },
                {
                    label: 'Reload Editor.App',
                    click: function() {
                        Editor.App.reload();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Inspect Element',
                    accelerator: 'CmdOrCtrl+Shift+C',
                    click: function() {
                        var nativeWin = BrowserWindow.getFocusedWindow();
                        var editorWin = Editor.Window.find(nativeWin);
                        if ( editorWin ) {
                            editorWin.sendToPage( 'window:inspect' );
                        }
                    }
                },
                {
                    label: 'Developer Tools',
                    accelerator: 'CmdOrCtrl+Alt+I',
                    click: function() { BrowserWindow.getFocusedWindow().openDevTools(); }
                },
                {
                    label: 'Debug Core',
                    type: 'checkbox',
                    checked: false,
                    click: function() {
                        Editor.Debugger.toggle();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Run Tests (editor-framework)',
                    accelerator: 'CmdOrCtrl+Alt+T',
                    click: function() {
                        var testRunner = Editor.require('editor-framework://core/test-runner');
                        testRunner.liveRun( Editor.url('editor-framework://test/') );
                    }
                },
                {
                    label: 'Human Tests',
                    submenu: [
                        { type: 'separator' },
                        {
                            label: 'Throw an Uncaught Exception',
                            click: function() {
                                throw new Error('editor-framework Unknown Error');
                            }
                        },
                        {
                            label: 'send2panel \'foo:bar\' foobar.panel',
                            click: function() {
                                Editor.sendToPanel( "foobar.panel", "foo:bar" );
                            }
                        },
                    ],
                },
                { type: 'separator' },
            ]
        },
    ];
}

Editor._defaultMainMenu = getDefaultMainMenu;
var _mainMenu = new Editor.Menu( Editor._defaultMainMenu() );

/**
 * The main menu module for manipulating main menu items
 * @module Editor.MainMenu
 */
var MainMenu = {};

/**
 * Apply main menu changes
 * @method apply
 */
MainMenu.apply = function () {
    Menu.setApplicationMenu(_mainMenu.nativeMenu);
};

/**
 * Reset main menu to its default template
 * @method reset
 */
MainMenu.reset = function () {
    _mainMenu.reset( Editor._defaultMainMenu() );
    MainMenu.apply();
};

/**
 * Build a template into menu item and add it to path
 * @method add
 * @param {string} path - A menu path
 * @param {object[]|object} template
 */
MainMenu.add = function ( path, template ) {
    if ( _mainMenu.add( path, template ) ) {
        MainMenu.apply();
    }
};

/**
 * Remove menu item at path.
 * @method remove
 * @param {string} path - A menu path
 */
MainMenu.remove = function ( path ) {
    if ( _mainMenu.remove( path ) ) {
        MainMenu.apply();
    }
};

/**
 * Set menu options at path.
 * @method set
 * @param {string} path - A menu path
 * @param {object} [options]
 * @param {NativeImage} [options.icon] - A [NativeImage](https://github.com/atom/electron/blob/master/docs/api/native-image.md)
 * @param {Boolean} [options.enabled]
 * @param {Boolean} [options.visible]
 * @param {Boolean} [options.checked] - NOTE: You must set your menu-item type to 'checkbox' to make it work
 */
MainMenu.set = function ( path, options ) {
    if ( _mainMenu.set( path, options ) ) {
        MainMenu.apply();
    }
};

// ipc
Ipc.on('main-menu:reset', function () {
    MainMenu.reset();
});

Ipc.on('main-menu:add', function ( path, template ) {
    MainMenu.add( path, template );
});

Ipc.on('main-menu:remove', function ( path ) {
    MainMenu.remove( path );
});

Ipc.on('main-menu:set', function ( path, options ) {
    MainMenu.set( path, options );
});

module.exports = MainMenu;
