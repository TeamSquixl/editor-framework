/**
 * @module Editor.Utils
 */
var Utils = {};

/**
 * @method padLeft
 * @param {string} text
 * @param {number} width
 * @param {string} ch - the character used to pad
 * @return {string}
 */
Utils.padLeft = function ( text, width, ch ) {
    text = text.toString();
    width -= text.length;
    if ( width > 0 ) {
        return new Array( width + 1 ).join(ch) + text;
    }
    return text;
};

/**
 * @method formatFrame
 * @param {number} frame
 * @param {number} frameRate
 * @return {string}
 */
Utils.formatFrame = function ( frame, frameRate ) {
    var decimals = Math.floor(Math.log10(frameRate))+1;
    var text = '';
    if ( frame < 0 ) {
        text = '-';
        frame = -frame;
    }
    return text +
        Math.floor(frame/frameRate) + ':' +
        Utils.padLeft(frame % frameRate, decimals, '0');
};

/**
 * @method smoothScale
 * @param {number} curScale
 * @param {number} delta
 * @return {number}
 */
Utils.smoothScale = function ( curScale, delta ) {
    var scale = curScale;
    scale = Math.pow( 2, delta * 0.002) * scale;
    return scale;
};

/**
 * Wrap error so that it can be sent between core and page level
 * @method wrapError
 */
Utils.wrapError = function ( err ) {
    return {
        message: err.message,
        stack: err.stack,
    };
};

/**
 */
Utils.arrayCmpFilter = function ( items, func ) {
    var results, item, i, j;

    results = [];
    for ( i = 0; i < items.length; ++i ) {
        item = items[i];
        var add = true;

        for ( j = 0; j < results.length; ++j ) {
            var addedItem = results[j];

            if ( item === addedItem ) {
                // existed
                add = false;
                break;
            }

            var cmp = func( addedItem, item );
            if ( cmp > 0 ) {
                add = false;
                break;
            }
            else if ( cmp < 0 ) {
                results.splice(j, 1);
                --j;
            }
        }

        if ( add ) {
            results.push(item);
        }
    }

    return results;
};

module.exports = Utils;
