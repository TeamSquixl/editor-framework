var Ipc = require('ipc');
var BrowserWindow = require('browser-window');

/**
 * Redirect panel messages to its registered windows.
 */
var Panel = {};
var _panel2windows = {};
var _panel2argv = {};

Panel.templateUrl = 'editor://static/window.html';

//
Panel.open = function ( panelID, argv ) {
    var panelInfo = Editor.Package.panelInfo(panelID);
    if ( !panelInfo ) {
        Editor.error('Failed to open panel %s, panel info not found.', panelID);
        return;
    }

    _panel2argv[panelID] = argv;

    var editorWin = Panel.findWindow(panelID);
    if ( editorWin ) {
        // if we found the window, send panel:open to it
        Editor.sendToPanel( panelID, 'panel:open', argv );
        editorWin.show();
        editorWin.focus();
        return;
    }

    //
    var windowName = 'editor-window-' + new Date().getTime();
    var options = {
        'use-content-size': true,
        'width': parseInt(panelInfo.width),
        'height': parseInt(panelInfo.height),
        'min-width': parseInt(panelInfo['min-width']),
        'min-height': parseInt(panelInfo['min-height']),
        'max-width': parseInt(panelInfo['max-width']),
        'max-height': parseInt(panelInfo['max-height']),
    };

    // load layout-settings, and find windows by name
    var profile = Editor.loadProfile('layout', 'local' );
    var panels = profile.panels;
    if ( profile.panels && profile.panels[panelID] ) {
        var panelProfile = profile.panels[panelID];
        windowName = panelProfile.window;

        // find window by name
        editorWin = Editor.Window.find(windowName);
        if ( editorWin ) {
            // TODO: ??? how can I dock it???
            return;
        }

        options.x = parseInt(panelProfile.x);
        options.y = parseInt(panelProfile.y);
        options.width = parseInt(panelProfile.width);
        options.height = parseInt(panelProfile.height);
    }

    // create new window
    // DISABLE: currently, I don't want to support page
    // if ( panelInfo.page ) {
    //     url = panelInfo.page;
    // }

    var winType = panelInfo.type || 'dockable';
    switch ( panelInfo.type ) {
    case 'dockable':
        options.resizable = true;
        options['always-on-top'] = false;
        break;

    case 'float':
        options.resizable = true;
        options['always-on-top'] = true;
        break;

    case 'fixed-size':
        options.resizable = false;
        options['always-on-top'] = true;
        // NOTE: fixed-size window always use package.json settings
        options.width = parseInt(panelInfo.width);
        options.height = parseInt(panelInfo.height);
        break;

    case 'quick':
        options.resizable = true;
        options['always-on-top'] = true;
        options['close-when-blur'] = true;
        break;
    }

    if ( isNaN(options.width) ) {
        options.width = 800;
    }
    if ( isNaN(options.height) ) {
        options.height = 600;
    }

    //
    editorWin = new Editor.Window(windowName, options);

    // BUG: https://github.com/atom/atom-shell/issues/1321
    editorWin.nativeWin.setContentSize( options.width, options.height );
    editorWin.nativeWin.setMenuBarVisibility(false);
    editorWin.load(Panel.templateUrl, {
        panelID: panelID
    });
    editorWin.focus();
};

Panel.findWindow = function ( panelID ) {
    return _panel2windows[panelID];
};

Panel.findWindows = function (packageName) {
    var wins = [];

    for ( var p in _panel2windows ) {
        var pair = p.split('@');
        if ( pair.length !== 2 ) {
            continue;
        }

        var name = pair[1];
        if ( name === packageName ) {
            var editorWin = _panel2windows[p];
            if ( wins.indexOf (editorWin) === -1 )
                wins.push(editorWin);
        }
    }

    return wins;
};

Panel.findPanels = function ( packageName ) {
    var panels = [];
    for ( var p in _panel2windows ) {
        var pair = p.split('@');
        if ( pair.length !== 2 ) {
            continue;
        }

        var name = pair[1];
        if ( name === packageName ) {
            panels.push(pair[0]);
        }
    }

    return panels;
};

Panel.dock = function ( panelID, win ) {
    // Editor.info('dock %s', panelID ); // DEBUG

    var editorWin = _panel2windows[panelID];

    // if we found same panel dock in different place
    if ( editorWin && editorWin !== win ) {
        // TODO: should we report error ????
    }

    _panel2windows[panelID] = win;
};

Panel.undock = function ( panelID, win ) {
    // Editor.info('undock %s', panelID ); // DEBUG
    var editorWin = _panel2windows[panelID];
    if ( editorWin === win ) {
        delete _panel2windows[panelID];

        // check if we have other panels in the same window
        // if no panels left, we close the window
        var found = false;
        for ( var id in _panel2windows ) {
            if ( win === _panel2windows[id] ) {
                found = true;
                break;
            }
        }
        if ( !found ) {
            editorWin.close();
        }

        return true;
    }
    return false;
};

// TODO: we need to check if the windows panel only have that panel so that we can close the window
Panel.closeAll = function (packageName) {
    Editor.warn('TODO: @Johnny please implement Panel.closeAll');

    // var wins = Panel.findWindows(packageName);
    // for (var i = 0; i < wins.length; i++) {
    //     var win = wins[i];
    //     win.close();
    // }
    // delete _panel2windows[...];
};

// NOTE: this only invoked in fire-window on-closed event
Panel._onWindowClosed = function ( editorWin ) {
    for ( var id in _panel2windows ) {
        var win = _panel2windows[id];
        if ( win === editorWin ) {
            delete _panel2windows[id];
        }
    }
};

// ========================================
// Ipc
// ========================================

Ipc.on('panel:query-info', function ( reply, panelID ) {
    if ( !panelID ) {
        Editor.error( 'Empty panelID' );
        reply();
        return;
    }

    // get panelInfo
    var panelInfo = Editor.Package.panelInfo(panelID);

    // load profiles
    for ( var type in panelInfo.profiles ) {
        var profile = panelInfo.profiles[type];
        profile = Editor.loadProfile( panelID, type, profile );
        panelInfo.profiles[type] = profile;
    }

    //
    reply(panelInfo);
});

Ipc.on('panel:ready', function ( panelID ) {
    var argv = _panel2argv[panelID];
    Editor.sendToPanel( panelID, 'panel:open', argv );
});

Ipc.on('panel:open', function ( panelID, argv ) {
    Panel.open( panelID, argv );
});

Ipc.on('panel:dock', function ( event, panelID ) {
    var browserWin = BrowserWindow.fromWebContents( event.sender );
    var editorWin = Editor.Window.find(browserWin);
    Panel.dock( panelID, editorWin );
});

Ipc.on('panel:undock', function ( event, panelID ) {
    var browserWin = BrowserWindow.fromWebContents( event.sender );
    var editorWin = Editor.Window.find(browserWin);
    Panel.undock( panelID, editorWin );
});

//
Ipc.on('panel:save-profile', function ( panelID, type, panelProfile ) {
    var profile = Editor.loadProfile( panelID, type );
    if ( profile ) {
        profile.clear();
        Editor.JS.mixin(profile, panelProfile);
        profile.save();
    }
});

module.exports = Panel;
