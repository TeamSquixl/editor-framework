(function () {

var Ipc = require('ipc');

var _nextSessionId = 1000;
var _replyCallbacks = {};

var _channel2replyInfo = {};

require('../share/ipc-init');

// Messages

Ipc.on('editor:sendreq2core:reply', function replyCallback (args, sessionId) {
    'use strict';
    var key = '' + sessionId;
    var cb = _replyCallbacks[key];
    if (cb) {
        cb.apply(null, args);
        delete _replyCallbacks[key];
    }
});

Ipc.on('editor:send2panel', function () {
    Editor.Panel.dispatch.apply(Editor.Panel,arguments);
});

Ipc.on('editor:sendreq2page', function (request, args, sessionId) {
    var called = false;
    function replyCallback () {
        if ( !called ) {
            called = true;
            Ipc.send( 'editor:sendreq2page:reply', [].slice.call(arguments), sessionId );
        }
        else {
            Editor.error('The callback which reply to "%s" can only be called once!', request);
        }
    }

    args.unshift(request, replyCallback);
    if ( !Ipc.emit.apply(Ipc, args) ) {
        Editor.error('The listener of request "%s" is not yet registered!', request);
    }
});

// Communication Patterns

/**
 * Send message to core-level synchronized and return a result which is responded from core-level
 * @method sendToCoreSync
 * @param {string} message - the message to send
 * @param {...*} [arg] - whatever arguments the message needs
 * @return results
 */
Editor.sendToCoreSync = function ( message ) {
    'use strict';
    if ( typeof message !== 'string' ) {
        Editor.error('The message must be provided');
        return;
    }

    var args = [].slice.call( arguments );
    return Ipc.sendSync.apply( Ipc, [message].concat(args) );
};

/**
 * Send message to editor-core, which is so called as main app, or atom shell's browser side.
 * @method sendToCore
 * @param {string} message - the message to send
 * @param {...*} [arg] - whatever arguments the message needs
 */
Editor.sendToCore = function ( message ) {
    'use strict';
    if ( typeof message !== 'string' ) {
        Editor.error('The message must be provided');
        return;
    }

    var args = [].slice.call( arguments );
    Ipc.send.apply( Ipc, ['editor:send2core'].concat( args ) );
};

/**
 * Broadcast message to all pages.
 * The page is so called as atom shell's web side. Each application window is an independent page and has its own JavaScript context.
 * @method sendToWindows
 * @param {string} message - the message to send
 * @param {...*} [arg] - whatever arguments the message needs
 * @param {object} [options] - you can indicate the options such as Editor.selfExcluded
 */
Editor.sendToWindows = function ( message ) {
    'use strict';
    if ( typeof message !== 'string' ) {
        Editor.error('The message must be provided');
        return;
    }

    var args = [].slice.call( arguments );
    Ipc.send.apply( Ipc, ['editor:send2wins'].concat( args ) );
};

/**
 * Broadcast message to main page.
 * The page is so called as atom shell's web side. Each application window is an independent page and has its own JavaScript context.
 * @method sendToMainWindow
 * @param {string} message - the message to send
 * @param {...*} [arg] - whatever arguments the message needs
 */
Editor.sendToMainWindow = function ( message ) {
    'use strict';
    if ( typeof message !== 'string' ) {
        Editor.error('The message must be provided');
        return;
    }

    var args = [].slice.call( arguments );
    Ipc.send.apply( Ipc, ['editor:send2mainwin'].concat( args ) );
};

/**
 * Broadcast message to all pages and editor-core
 * @method sendToAll
 * @param {string} message - the message to send
 * @param {...*} [arg] - whatever arguments the message needs
 * @param {object} [options] - you can indicate the options such as Editor.selfExcluded
 */
Editor.sendToAll = function ( message ) {
    'use strict';
    if ( typeof message !== 'string' ) {
        Editor.error('The message must be provided');
        return;
    }

    var args = [].slice.call( arguments );
    Ipc.send.apply( Ipc, ['editor:send2all'].concat( args ) );
};

/**
 * Send message to specific panel
 * @method sendToPanel
 * @param {string} panelID - the panel id
 * @param {string} message - the message to send
 * @param {...*} [arg] - whatever arguments the message needs
 */
Editor.sendToPanel = function ( panelID, message ) {
    'use strict';
    if ( typeof message !== 'string' ) {
        Editor.error('The message must be provided');
        return;
    }

    var args = [].slice.call( arguments );
    Ipc.send.apply( Ipc, ['editor:send2panel'].concat( args ) );
};

/**
 * Send `args...` to core via `channel` in asynchronous message, and waiting for the `core-level`
 * to reply the message through `callback`.
 * @method sendRequestToCore
 * @param {string} channel - the request message channel
 * @param {...*} [arg] - whatever arguments the request needs
 * @param {function} reply - the callback used to handle replied arguments
 * @return {number} - session id, can be used in Editor.cancelRequestToCore
 */
Editor.sendRequestToCore = function (request) {
    'use strict';
    if (typeof request !== 'string') {
        Editor.error('The request must be of type string');
        return null;
    }

    var args = [].slice.call(arguments, 1);
    if ( args.length < 1 ) {
        Editor.error('Invalid arguments, reply function not found!');
        return null;
    }

    var reply = args[args.length - 1];
    if (typeof reply !== 'function') {
        Editor.error('Invalid arguments, reply function not found!');
        return null;
    }

    args.pop();

    var sessionId = _nextSessionId++;
    var key = '' + sessionId;
    _replyCallbacks[key] = reply;

    Ipc.send('editor:sendreq2core', request, args, sessionId);
    return sessionId;
};

/**
 * Cancel request sent to core by sessionId
 * @method cancelRequestToCore
 */
Editor.cancelRequestToCore = function (sessionId) {
    'use strict';
    var key = '' + sessionId;
    var cb = _replyCallbacks[key];
    if ( cb ) {
        delete _replyCallbacks[key];
    }
};

/**
 * Send `args...` to core via `channel` in asynchronous message, and waiting for reply
 * to reply the message through `callback`.
 * @method waitForReply
 * @param {string} channel - the request message channel
 * @param {...*} [arg] - whatever arguments the request needs
 * @param {function} reply - the callback used to handle replied arguments
 * @param {number} [timeout] - timeout for the reply, if timeout = -1, it will never get expired
 * @return {number} - session id, can be used in Editor.cancelRequestToCore
 */
Editor.waitForReply = function (request) {
    'use strict';
    if (typeof request !== 'string') {
        Editor.error('The request must be of type string');
        return null;
    }

    // arguments check
    var args = [].slice.call(arguments, 1);
    var reply, timeout;

    if ( args.length < 1 ) {
        Editor.error('Invalid arguments, reply function not found!');
        return null;
    }

    var lastArg = args[args.length - 1];
    if (typeof lastArg === 'number') {
        if ( args.length < 2 ) {
            Editor.error('Invalid arguments, reply function not found!');
            return null;
        }

        timeout = lastArg;
        args.pop();

        lastArg = args[args.length - 1];
        if (typeof lastArg !== 'function') {
            Editor.error('Invalid arguments, reply function not found!');
            return null;
        }

        reply = lastArg;
        args.pop();
    }
    else {
        if (typeof lastArg !== 'function') {
            Editor.error('Invalid arguments, reply function not found!');
            return null;
        }

        reply = lastArg;
        timeout = 50;
        args.pop();
    }

    var info = _channel2replyInfo[request];
    if ( !info ) {
        info = {
            nextSessionId: 1000,
            callbacks: {},
        };
        _channel2replyInfo[request] = info;
        Ipc.on( request+':reply', function ( sessionId ) {
            var key = '' + sessionId;
            var cb = info.callbacks[key];
            if (cb) {
                var args = [].slice.call(arguments, 1);
                cb.apply(null, args);
                delete info.callbacks[key];
            }
        });
    }

    //
    var sessionId = info.nextSessionId++;
    var key = '' + sessionId;
    info.callbacks[key] = reply;

    if ( timeout !== -1 ) {
        setTimeout(function () {
            delete info.callbacks[key];
        },timeout);
    }

    args.unshift(sessionId);
    args.unshift(request);
    Ipc.send.apply( Ipc, ['editor:send2all'].concat( args ) );

    return sessionId;
};

/**
 * Cancel wait for reply by channel and sessionId
 * @method cancelWaitForReply
 */
Editor.cancelWaitForReply = function (channel, sessionId) {
    'use strict';
    var info = _channel2replyInfo[channel];
    if ( info ) {
        var key = '' + sessionId;
        if ( info.callbacks[key] ) {
            delete info.callbacks[key];
        }
    }
};

})();
