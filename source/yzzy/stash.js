var yzzy;
if ( yzzy === null || yzzy === undefined ) {
    yzzy = {};
}

( function(){

    var $stash;
    yzzy.stash = $stash = {};

    // TODO 'add' trigger on non-existing keyed value
    
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
        self._bind = {
            setByKey: {},
            addByKey: {}
        };
        self._index = [];
    }, { 'prototype': {
        'get': function( key ){
            var self = this;
            return self._data[ key ];
        },

        'set': function( key, value ){
            var self = this;
            self._data[ key ] = value;
            var overwrite = key in self._data;
            var index = _.sortedIndex( self._index, [ key, value ], self.cfg.sortWith );
            self._index.splice( index, 0, [ key, value ] );
            var setTrigger = self._bind.setByKey[ key ] || self._bind.set;
            var addTrigger = self._bind.addByKey[ key ] || self._bind.add;
            if ( setTrigger || addTrigger ) {
                var event = { index: index };
                if ( index - 1 > -1 ) {
                    event.previous = self._index[ index - 1 ][1];
                }
                if ( index + 1 < self._index.length ) {
                    event.next = self._index[ index + 1 ][1];
                }
                event.key = key;
                event.value = value;
                event.overwrite = overwrite;
                if ( setTrigger ) {
                    setTrigger.apply( self, [ event ] );
                }
                if ( ! overwrite && addTrigger ) {
                    addTrigger.apply( self, [ event ] );
                }
            }
        },

        'all': function(){
            var self = this;
            return _.map( self._index, function( value ){
                return value[ 1 ];
            } );
        },

        'bind': function(){
            var self = this;
            var name = arguments[ 0 ];
            if ( _.isFunction( arguments[ 1 ] ) ) {
                self._bind[ name ] = arguments[ 1 ];
            }
            else {
                _.each( arguments[ 1 ], function( value, key ){
                    self._bind.setByKey[ key ] = value;
                } );
            }
        }
    
    } } );

}() );
