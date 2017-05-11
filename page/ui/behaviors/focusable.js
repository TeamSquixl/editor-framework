// REF: http://webaim.org/techniques/keyboard/tabindex
EditorUI.focusable = (function () {

    //
    function _removeTabIndexRecursively ( el ) {
        if ( el.focused !== undefined && el._initTabIndex !== undefined ) {
            el._setFocused(false);
            el._removeTabIndex();
        }

        var elementDOM = Polymer.dom(el);
        for ( var i = 0; i < elementDOM.children.length; ++i ) {
            _removeTabIndexRecursively ( elementDOM.children[i] );
        }
    }

    function _initTabIndexRecursively ( el ) {
        if ( el.focused !== undefined && el._initTabIndex !== undefined ) {
            if ( el.disabled === false ) {
                el._initTabIndex();
            }
        }

        var elementDOM = Polymer.dom(el);
        for ( var i = 0; i < elementDOM.children.length; ++i ) {
            _initTabIndexRecursively ( elementDOM.children[i] );
        }
    }


    var focusable = {
        'ui-focusable': true,

        properties: {
            focused: {
                type: Boolean,
                value: false,
                notify: true,
                readOnly: true,
                reflectToAttribute: true,
            },

            disabled: {
                type: Boolean,
                value: false,
                notify: true,
                observer: '_disabledChanged',
                reflectToAttribute: true,
            },

            noNavigate: {
                type: Boolean,
                value: false,
                reflectToAttribute: true,
            },
        },

        _initFocusable: function ( focusEls ) {
            if ( focusEls ) {
                if ( Array.isArray(focusEls) ) {
                    this.focusEls = focusEls;
                }
                else {
                    this.focusEls = [focusEls];
                }
            }
            else {
                this.focusEls = [];
            }

            this._initTabIndex();
            this._losingFocus = false;
        },

        _initTabIndex: function () {
            if ( !this.focusEls )
                return;

            var el, i;

            if ( this.noNavigate || this.disabled ) {
                for ( i = 0; i < this.focusEls.length; ++i ) {
                    el = this.focusEls[i];
                    el.tabIndex = -1;
                }
            }
            else {
                for ( i = 0; i < this.focusEls.length; ++i ) {
                    el = this.focusEls[i];
                    el.tabIndex = EditorUI.getParentTabIndex(this) + 1;
                }
            }
        },

        _removeTabIndex: function () {
            if ( !this.focusEls )
                return;

            for ( var i = 0; i < this.focusEls.length; ++i ) {
                var el = this.focusEls[i];
                el.tabIndex = -1;
            }
        },

        _disabledInHierarchy: function () {
            if ( this.disabled )
                return true;

            var parent = Polymer.dom(this).parentNode;
            while ( parent ) {
                if ( parent.disabled )
                    return true;

                parent = Polymer.dom(parent).parentNode;
            }
            return false;
        },

        _focusedChanged: function () {
            if ( this.disabled ) {
                this._setFocused(false);
            }
        },

        _disabledChanged: function ( disabled, old ) {
            if ( disabled ) {
                this.style.pointerEvents = 'none';
                _removeTabIndexRecursively(this);
            }
            else {
                this.style.pointerEvents = '';
                _initTabIndexRecursively(this);
            }
        },

        // _onFocusIn: function ( event ) {
        //     this._setFocused(true);
        // },

        // _onFocusOut: function ( event ) {
        //     this._setFocused(false);
        // },

        // NOTE: do not overwrite these events, instead listen to 'on-focused-changed'

        _onFocus: function ( event ) {
            // DISABLE
            // this._losingFocus = false;

            this._setFocused(true);
        },

        _onBlur: function ( event ) {
            // DISABLE
            // this._losingFocus = true;
            // this.async(function () {
            //     if ( this._losingFocus ) {
            //         this._setFocused(false);
            //     }
            // }.bind(this),1);

            this._setFocused(false);
        },

        setFocus: function () {
            if ( this._disabledInHierarchy() )
                return;

            if ( this.focusEls.length > 0 ) {
                this.focusEls[0].focus();
            }
            this._setFocused(true);
        },

        setBlur: function () {
            if ( this._disabledInHierarchy() )
                return;

            if ( this.focusEls.length > 0 ) {
                this.focusEls[0].blur();
            }
            this._setFocused(false);
        },
    };
    return focusable;
})();
