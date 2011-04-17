var yzzy;
if ( yzzy === null || yzzy === undefined ) {
    yzzy = {};
}

_.extend( yzzy, {
    'log': function(){
        if ( 'console' in window ) {
            return window.console.log.apply( window.console, arguments );
        }
    }
} );

_.extend( yzzy.Collection = function( $cfg ){
    var self = this;
    self._data = {};
    self._bound = {};
    if ( ! $cfg ) {
        $cfg = {};
    }
    _.defaults( $cfg, {
        'sorter': function( key, value ){
            return key;
        }
    } );
    self._cfg = $cfg;
    self._index = [];
}, { 'prototype': {
    'get': function( key ){
        var self = this;
        return self._data[ key ];
    },

    'set': function( key, value ){
        var self = this;
        self._data[ key ] = value;
        var index = _.sortedIndex( self._index, [ key, value ], self._cfg.sorter );
        self._index.splice( index, 0, [ key, value ] );
        var trigger = self._bound.set;
        if ( trigger ) {
            var context = { index: index };
            if ( index - 1 > -1 ) {
                context.previous = self._index[ index - 1 ][1];
            }
            if ( index + 1 < self._index.length ) {
                context.next = self._index[ index + 1 ][1];
            }
            trigger.apply( self, [ key, value, context ] );
        }
    },

    'all': function(){
        var self = this;
        return _.map( self._index, function( value ){
            return value[ 1 ];
        } );
    },

    'bind': function( name, trigger ){
        var self = this;
        self._bound[ name ] = trigger;
    }
} } );

if ( ! 'console' in window ) {
    yzzy.log = function(){};
}
