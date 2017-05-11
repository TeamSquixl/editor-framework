var EditorUI = (function () {
    var EditorUI = {};

    EditorUI.index = function ( element ) {
        var parentEL = Polymer.dom(element).parentNode;
        var parentDOM = Polymer.dom(parentEL);
        var curChildEL = parentDOM.children.length > 0 ? parentDOM.children[0] : null;

        for ( var i = 0, len = parentDOM.children.length; i < len; ++i ) {
            if ( parentDOM.children[i] === element )
                return i;
        }

        return -1;
    };

    var _findInChildren = function ( element, elementToFind ) {
        var elementDOM = Polymer.dom(element);

        for ( var i = 0; i < elementDOM.children.length; ++i ) {
            var childEL = elementDOM.children[i];
            if ( childEL === elementToFind )
                return true;

            if ( Polymer.dom(childEL).children.length > 0 )
                if ( _findInChildren( childEL, elementToFind ) )
                    return true;
        }
        return false;
    };

    //
    EditorUI.find = function ( elements, elementToFind ) {
        if ( Array.isArray(elements) ||
             elements instanceof NodeList ||
             elements instanceof HTMLCollection )
        {
            for ( var i = 0; i < elements.length; ++i ) {
                var element = elements[i];
                if ( element === elementToFind )
                    return true;

                if ( _findInChildren ( element, elementToFind ) )
                    return true;
            }
            return false;
        }

        // if this is a single element
        if ( elements === elementToFind )
            return true;

        return _findInChildren( elements, elementToFind );
    };

    //
    EditorUI.getParentTabIndex = function ( element ) {
        var parent = Polymer.dom(element).parentNode;
        while ( parent ) {
            if ( parent.tabIndex !== null &&
                 parent.tabIndex !== undefined &&
                 parent.tabIndex !== -1 )
            {
                return parent.tabIndex;
            }

            parent = Polymer.dom(parent).parentNode;
        }
        return 0;
    };

    //
    EditorUI.focusParent = function ( element ) {
        // NOTE: DO NOT use Polymer.dom(element).parentNode
        var parent = element.parentElement;
        while ( parent ) {
            if ( parent.tabIndex !== null &&
                 parent.tabIndex !== undefined &&
                 parent.tabIndex !== -1 ) {
                parent.focus();
                return;
            }
            parent = parent.parentElement;
        }
    };

    //
    EditorUI.getSelfOrAncient = function ( element, parentType ) {
        var parent = element;
        while ( parent ) {
            if ( parent instanceof parentType )
                return parent;

            parent = Polymer.dom(parent).parentNode;
        }
        return 0;
    };

    EditorUI.isSelfOrAncient = function ( element, ancientEL ) {
        var parent = element;
        while ( parent ) {
            if ( parent === ancientEL )
                return true;

            parent = Polymer.dom(parent).parentNode;
        }
        return false;
    };

    //
    EditorUI.getFirstFocusableChild = function ( element ) {
        if ( element.tabIndex !== null &&
             element.tabIndex !== undefined &&
             element.tabIndex !== -1
           )
        {
            return element;
        }

        var el = null;
        // var elementDOM = Polymer.dom(element);
        var elementDOM = element;
        for ( var i = 0; i < elementDOM.children.length; ++i ) {
            el = EditorUI.getFirstFocusableChild(elementDOM.children[i]);
            if ( el !== null )
                return el;
        }

        // var rootDOM = Polymer.dom(element.root);
        // if ( rootDOM ) {
        //     el = EditorUI.getFirstFocusableChild(rootDOM);
        //     if ( el !== null )
        //         return el;
        // }

        return null;
    };

    var _cancelDrag = null;
    EditorUI.startDrag = function ( cursor, event, onMove, onEnd ) {
        EditorUI.addDragGhost(cursor);

        event.stopPropagation();

        var pressx = event.clientX, lastx = event.clientX;
        var pressy = event.clientY, lasty = event.clientY;
        var dx = 0, offsetx = 0;
        var dy = 0, offsety = 0;

        var mousemoveHandle = function(event) {
            event.stopPropagation();

            dx = event.clientX - lastx;
            dy = event.clientY - lasty;
            offsetx = event.clientX - pressx;
            offsety = event.clientY - pressy;

            lastx = event.clientX;
            lasty = event.clientY;

            if ( onMove )
                onMove( event, dx, dy, offsetx, offsety );
        };

        var mouseupHandle = function(event) {
            event.stopPropagation();

            document.removeEventListener('mousemove', mousemoveHandle);
            document.removeEventListener('mouseup', mouseupHandle);

            EditorUI.removeDragGhost();

            dx = event.clientX - lastx;
            dy = event.clientY - lasty;
            offsetx = event.clientX - pressx;
            offsety = event.clientY - pressy;

            _cancelDrag = null;
            if ( onEnd )
                onEnd( event, dx, dy, offsetx, offsety);
        }.bind(this);

        _cancelDrag = function () {
            document.removeEventListener('mousemove', mousemoveHandle);
            document.removeEventListener('mouseup', mouseupHandle);

            EditorUI.removeDragGhost();
        };

        document.addEventListener ( 'mousemove', mousemoveHandle );
        document.addEventListener ( 'mouseup', mouseupHandle );
    };

    EditorUI.cancelDrag = function () {
        if ( _cancelDrag )
            _cancelDrag();
    };

    //
    var _dragGhost = null;
    EditorUI.addDragGhost = function ( cursor ) {
        // add drag-ghost
        if ( _dragGhost === null ) {
            _dragGhost = document.createElement('div');
            _dragGhost.classList.add('drag-ghost');
            _dragGhost.style.position = 'absolute';
            _dragGhost.style.zIndex = '999';
            _dragGhost.style.top = '0';
            _dragGhost.style.right = '0';
            _dragGhost.style.bottom = '0';
            _dragGhost.style.left = '0';
            _dragGhost.oncontextmenu = function() { return false; };
        }
        _dragGhost.style.cursor = cursor;
        document.body.appendChild(_dragGhost);

        return _dragGhost;
    };

    EditorUI.removeDragGhost = function () {
        if ( _dragGhost !== null ) {
            _dragGhost.style.cursor = 'auto';
            if ( _dragGhost.parentElement !== null ) {
                _dragGhost.parentElement.removeChild(_dragGhost);
            }
        }
    };

    //
    var _hitGhost = null;
    EditorUI.addHitGhost = function ( cursor, zindex, onhit ) {
        // add drag-ghost
        if ( _hitGhost === null ) {
            _hitGhost = document.createElement('div');
            _hitGhost.classList.add('hit-ghost');
            _hitGhost.style.position = 'absolute';
            _hitGhost.style.zIndex = zindex;
            _hitGhost.style.top = '0';
            _hitGhost.style.right = '0';
            _hitGhost.style.bottom = '0';
            _hitGhost.style.left = '0';
            // _hitGhost.style.background = 'rgba(0,0,0,0.2)';
            _hitGhost.oncontextmenu = function() { return false; };
        }

        _hitGhost.style.cursor = cursor;
        _hitGhost.addEventListener('mousedown', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if ( onhit )
                onhit();
        });
        document.body.appendChild(_hitGhost);

        return _hitGhost;
    };

    EditorUI.removeHitGhost = function () {
        if ( _hitGhost !== null ) {
            _hitGhost.style.cursor = 'auto';
            if ( _hitGhost.parentElement !== null ) {
                _hitGhost.parentElement.removeChild(_hitGhost);
                _hitGhost.removeEventListener('mousedown');
            }
        }
    };

    //
    var _loadingMask = null;
    EditorUI.addLoadingMask = function ( options, onclick ) {
        // add drag-ghost
        if ( _loadingMask === null ) {
            _loadingMask = document.createElement('div');
            _loadingMask.classList.add('loading-mask');
            _loadingMask.style.position = 'absolute';
            _loadingMask.style.top = '0';
            _loadingMask.style.right = '0';
            _loadingMask.style.bottom = '0';
            _loadingMask.style.left = '0';
            _loadingMask.oncontextmenu = function() { return false; };
        }

        if ( options && typeof options.zindex === 'string' ) {
            _loadingMask.style.zIndex = options.zindex;
        }
        else {
            _loadingMask.style.zIndex = '999';
        }

        if ( options && typeof options.background === 'string' ) {
            _loadingMask.style.backgroundColor = options.background;
        }
        else {
            _loadingMask.style.backgroundColor = 'rgba(0,0,0,0.2)';
        }

        if ( options && typeof options.cursor === 'string' ) {
            _loadingMask.style.cursor = options.cursor;
        }
        else {
            _loadingMask.style.cursor = 'default';
        }

        _loadingMask.addEventListener('mousedown', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if ( onclick )
                onclick();
        });

        document.body.appendChild(_loadingMask);

        return _loadingMask;
    };

    EditorUI.removeLoadingMask = function () {
        if ( _loadingMask !== null ) {
            _loadingMask.style.cursor = 'auto';
            if ( _loadingMask.parentElement !== null ) {
                _loadingMask.parentElement.removeChild(_loadingMask);
                _loadingMask.removeEventListener('mousedown');
            }
        }
    };

    function _createLayouts ( parentEL, infos, importList ) {
        for ( var i = 0; i < infos.length; ++i ) {
            var info = infos[i];

            var el;

            if ( info.type === 'dock' ) {
                el = new EditorUI.Dock();
            }
            else if ( info.type === 'panel' ) {
                el = new EditorUI.Panel();
            }

            if ( !el ) continue;

            if ( info.row !== undefined ) {
                el.row = info.row;
            }
            if ( info.width !== undefined ) {
                el.curWidth = info.width;
            }
            if ( info.height !== undefined ) {
                el.curHeight = info.height;
            }

            if ( info.docks ) {
                _createLayouts ( el, info.docks, importList );
            }
            else if ( info.panels ) {
                for ( var j = 0; j < info.panels.length; ++j ) {
                    importList.push( { dockEL: el, panelID: info.panels[j], active: j === info.active } );
                }
            }

            Polymer.dom(parentEL).appendChild(el);
        }
        parentEL._initResizers();
    }

    EditorUI.createLayout = function ( parentEL, layoutInfo ) {
        var importList = [];

        // if we have root, clear all children in it
        var rootEL = EditorUI.DockUtils.root;
        if ( rootEL ) {
            rootEL.remove();
            EditorUI.DockUtils.root = null;
        }

        rootEL = new EditorUI.Dock();
        rootEL.classList.add('fit');
        rootEL.setAttribute('no-collapse', '');

        if ( layoutInfo ) {
            if ( layoutInfo.row ) rootEL.setAttribute('row', '');
            _createLayouts( rootEL, layoutInfo.docks, importList );
        }

        Polymer.dom(parentEL).appendChild(rootEL);
        EditorUI.DockUtils.root = rootEL;

        return importList;
    };

    /**
     * @method fitSize
     * @param {number} srcWidth
     * @param {number} srcHeight
     * @param {number} destWidth
     * @param {number} destHeight
     * @return {number[]} - [width, height]
     */
    EditorUI.fitSize = function ( srcWidth, srcHeight, destWidth, destHeight ) {
        var width, height;
        if ( srcWidth > destWidth &&
             srcHeight > destHeight )
        {
            width = destWidth;
            height = srcHeight * destWidth/srcWidth;

            if ( height > destHeight ) {
                height = destHeight;
                width = srcWidth * destHeight/srcHeight;
            }
        }
        else if ( srcWidth > destWidth ) {
            width = destWidth;
            height = srcHeight * destWidth/srcWidth;
        }
        else if ( srcHeight > destHeight ) {
            width = srcWidth * destHeight/srcHeight;
            height = destHeight;
        }
        else {
            width = srcWidth;
            height = srcHeight;
        }

        return [width,height];
    };

    var _importCount = 0;
    EditorUI.importing = false;
    EditorUI.import = function ( url, cb ) {
        ++_importCount;
        EditorUI.importing = true;

        Polymer.Base.importHref( url, function ( event ) {
            --_importCount;
            if ( _importCount === 0 ) {
                EditorUI.importing = false;
            }

            if ( cb ) cb ();
        }, function ( err ) {
            --_importCount;
            if ( _importCount === 0 ) {
                EditorUI.importing = false;
            }

            if ( cb ) cb ( err );
        });
    };

    // binding helpers
    EditorUI.bind = function ( el1, value1, el2, value2 ) {
        var camelValue2 = EditorUI.dashToCamelCase(value2);
        el1.addEventListener( value1+'-changed', function ( event ) {
            if ( event.detail.path )
                el2.set( event.detail.path, event.detail.value );
            else
                el2.set( camelValue2, event.detail.value );
        });
        el2.addEventListener( value2+'-changed', function ( event ) {
            if ( event.detail.path )
                el1.set( event.detail.path, event.detail.value );
            else
                el1.set( value1, event.detail.value );
        });
    };

    EditorUI.bindUUID = function ( el1, value1, el2, value2 ) {
        var camelValue2 = EditorUI.dashToCamelCase(value2);
        el1.addEventListener( value1+'-changed', function ( event ) {
            if ( event.detail.path === value1+'.uuid' ) {
                el2.set( camelValue2, event.detail.value );
            }
            else {
                el2.set( camelValue2, event.detail.value.uuid );
            }
        });
        el2.addEventListener(value2+'-changed', function ( event ) {
            el1.set(value1, {
                uuid: event.detail.value
            });
        });
    };

    EditorUI.toHumanText = function ( text ) {
        var result = text.replace(/[-_]([a-z])/g, function(m) {
            return m[1].toUpperCase();
        });

        result = result.replace(/([a-z][A-Z])/g, function (g) {
            return g[0] + ' ' + g[1];
        });

        // remove first white-space
        if ( result.charAt(0) === ' ' ) {
            result.slice(1);
        }

        // capitalize the first letter
        return result.charAt(0).toUpperCase() + result.slice(1);
    };

    EditorUI.dashToCamelCase = function(dash) {
        return dash.replace(/-([a-z])/g, function(m) {
            return m[1].toUpperCase();
        });
    };

    EditorUI.camelToDashCase = function(camel) {
        return camel.replace(/([a-z][A-Z])/g, function (g) {
            return g[0] + '-' + g[1].toLowerCase();
        });
    };

    return EditorUI;
})();
