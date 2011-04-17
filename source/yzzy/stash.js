var yzzy;
if ( yzzy === null || yzzy === undefined ) {
    yzzy = {};
}

( function(){

    var $stash;
    yzzy.stash = $stash = {};

    _.extend( $stash.KeyValueStash = function( $cfg ){
        var self = this;
        if ( ! $cfg ) {
            $cfg = {};
        }
        _.defaults( $cfg, {
            'sortWith': function( key, value ){
                return key;
            }
        } );
        self.cfg = $cfg;
        self._data = {};
        self._bind = {};
        self._index = [];
    }, { 'prototype': {
        'get': function( key ){
            var self = this;
            return self._data[ key ];
        },

        'set': function( key, value ){
            var self = this;
            self._data[ key ] = value;
            var index = _.sortedIndex( self._index, [ key, value ], self.cfg.sortWith );
            self._index.splice( index, 0, [ key, value ] );
            var trigger = self._bind.set;
            if ( trigger ) {
                var event = { index: index };
                if ( index - 1 > -1 ) {
                    event.previous = self._index[ index - 1 ][1];
                }
                if ( index + 1 < self._index.length ) {
                    event.next = self._index[ index + 1 ][1];
                }
                event.key = key;
                event.value = value;
                trigger.apply( self, [ event ] );
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
            self._bind[ name ] = trigger;
        }
    
    } } );

}() );
