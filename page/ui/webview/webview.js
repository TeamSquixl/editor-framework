(function () {

var Ipc = require('ipc');

EditorUI.WebView = Polymer({
    is: 'editor-webview',

    behaviors: [EditorUI.droppable],

    listeners: {
        'drop-area-enter': '_onDropAreaEnter',
        'drop-area-leave': '_onDropAreaLeave',
        'drop-area-accept': '_onDropAreaAccept',
    },

    properties: {
        src: {
            type: String,
            value: 'empty.html',
        },
    },

    ready: function () {
        this._initDroppable( this.$.dropArea );

        Ipc.on( 'editor:dragstart', function () {
            this.$.dropArea.hidden = false;
        }.bind(this));

        Ipc.on( 'editor:dragend', function () {
            this.$.dropArea.hidden = true;
        }.bind(this));
    },

    reload: function () {
        this.$.loader.hidden = false;
        this.$.view.reloadIgnoringCache();
    },

    openDevTools: function () {
        this.$.view.openDevTools();
    },

    _onViewDidFinishLoad: function ( event ) {
        this.$.loader.hidden = true;
    },

    _onDropAreaEnter: function ( event ) {
        event.stopPropagation();
    },

    _onDropAreaLeave: function ( event ) {
        event.stopPropagation();
    },

    _onDropAreaAccept: function ( event ) {
        event.stopPropagation();

        // event.detail.dragItems.forEach( function ( uuid ) {
        //     // TODO
        //     Editor.log( 'drop ' + uuid );
        // }.bind(this));
    },
});

})();
