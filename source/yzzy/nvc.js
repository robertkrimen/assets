var yzzy;
if ( yzzy === null || yzzy === undefined ) {
    yzzy = {};
}

( function(){
    var $ = jQuery;
    var $log = yzzy.log;

    var $nvc;
    yzzy.nvc = function(){
        var suiteObject = new $nvc.Suite();
        var suite = function(){
            return suiteObject.dispatch.apply( suiteObject, arguments );
        };
        $.each( $nvc.Suite.prototype, function( name, value ){
            suite[ name ] = function(){
                return suiteObject[ name ].apply( suiteObject, arguments );
            };
        } );
        return suite;
    };
    $nvc = yzzy.nvc;

    $nvc.Suite = function(){
        this.operation = {};
        this._suite = {};
    };
    $nvc.Suite.prototype = {

        'declare': function(){
            var self = this;
            if ( arguments.length < 2 ) {
                throw new Error( '.declare: Invalid/missing arguments (' + arguments + ')' ); 
            }
            var $arguments = Array.prototype.slice.call( arguments );
            var name = $arguments.shift();
            var nvc = self.build.apply( self, $arguments );
            self._suite[ name ] = nvc;
            return nvc;
        },

        'fetch': function( name ){
            var self = this;
            // TODO Check for missin <name>
            return self._suite[ name ];
        },

        'dispatch': function( name ){
            var self = this;
            var nvc = self.fetch( name );
            if ( 1 < arguments.length ) {
                return nvc( arguments[ 1 ] );
            }
            return nvc;
        },

        'nvc': function( name, value ){
            var self = this;
            return self.fetch( name )( value );
        },

        'defined': function( value, cfg ){
            if ( value === null || value === undefined ) {
                return false;
            }
            if ( ! cfg ) {
                return true;
            }
            if ( typeof value === 'string' ) {
                if ( cfg.nilEmpty || cfg.nilBlank ) {
                    return value.length ? true : false;
                }
            }
            else if ( $.isArray( value ) ) {
                if ( cfg.nilEmpty ) {
                    return value.length ? true : false;
                }
            }
            else if ( $.isPlainObject( value ) ) {
                if ( cfg.nilEmpty ) {
                    return $.isEmptyObject( value ) ? true : false;
                }
            }
            return true;
        },

        'dflt': function( value, cfg ){
            if ( this.defined( value, cfg ) ) {
                return value;
            }
            if ( $.isFunction( cfg[ 'default' ] ) ) {
                return cfg[ 'default' ].call( {} );
            }
            else if ( 'default' in cfg ) {
                return cfg[ 'default' ];
            }
            throw new Error( '*** .dflt: Invalid default (' + cfg[ 'default' ] + ')' );
        },

        'build': function(){
            var self = this;

            var input = Array.prototype.slice.call( arguments );
            var cfg; 
            if ( $.isPlainObject( input[ 0 ] ) ) {
                cfg = input.shift();
            }

            input.reverse();
            var arguments_ = null;
            var sequence = []; 
            $.each( input, function( index, value ){
                if ( typeof value === 'string' ) {
                    if ( arguments_ === null  ){
                        arguments_ = [];
                    }
                    sequence.unshift( { operation: value, arguments_: arguments_ } );
                    arguments_ = null;
                }
                else if ( $.isFunction( value ) ) {
                    sequence.unshift( { operation: value } );
                }
                else {
                    if ( $.isArray( value ) ) {
                        arguments_ = value;
                    }
                    else {
                        arguments_ = [ value ];
                    }
                }
            } );

            var nvc = new $nvc.NVC( cfg );
            $.each( sequence, function(){
                if ( this.arguments_ ) {
                    self.applyOperation( nvc, this.operation, this.arguments_ );
                }
                else {
                    nvc.push( this.operation );
                }
            } );

            return nvc._functionized();
        },

        'applyOperation': function( nvc, name, arguments_ ){
            var self = this;

            if ( arguments_ ) {
                arguments_ = arguments_.slice();
            }
            else {
                arguments_ = [];
            }

            var operation = self.operation[ name ];
            if ( ! operation ) {
                operation = $nvc.defaultOperation[ name ];
            }
            if ( ! operation ) {
                throw new Error( "*** .applyOperation: Missing operation (" + name + ") in .operation/defaultOperation" );
            }

            arguments_.unshift( nvc );

            var result = operation.apply( this, arguments_ );
            if ( typeof result !== 'undefined' ) {
                if ( $.isFunction( result ) ) {
                    nvc.push( result );
                }
                else {
                    throw new Error();
                }
            }
        }
    };

    $nvc.globalSuite = new $nvc.Suite();

    $.each( $nvc.globalSuite, function( name, value ){
        if ( $.isFunction( value ) ) {
            $nvc[ name ] = function(){
                return $nvc.globalSuite[ name ].apply( $nvc.globalSuite, arguments );
            };
        }
    } );

    $nvc.NVC = function( cfg ){
        var self = this;
        if ( ! cfg ) {
            cfg = {};
        }
        self.cfg = cfg;
        self.sequence = [];
    };
    $nvc.NVC.prototype = {

        'process': function( value ){
            var self = this;
            if ( 'default' in self.cfg ) {
                value = $nvc.dflt( value, self.cfg );
            }
            $.each( self.sequence, function( index, operation ){
                value = operation.apply( self, [ value ] );
            } );
            return value;
        },

        'defined': function( value ){
            var self = this;
            return $nvc.defined( value, self.cfg );
        },

        'require': function( value ){
            var self = this;
            if ( self.defined( value ) ) {
                return self.process( value );
            }
            else {
                throw new Error( '*** .require: Missing/invalid value (' + value + ')' );
            }
        },

        'push': function( operation ){
            this.sequence.push( operation );
        },

        '_functionized': function(){
            var self = this;
            var nvc = function( value ){
                return self.process( value );
            };
            nvc.self = self;
            $.each( self, function( name, value ){
                if ( $.isFunction( value ) ) {
                    nvc[ name ] = function(){
                        return self[ name ].apply( self, arguments );
                    };
                }
            } );
            return nvc;
        }
    };

    $nvc.defaultOperation = {};
    $.extend( $nvc.defaultOperation, {

        'default': function( nvc ){
            if ( 1 === arguments.length ) {
                // FIXME Only if type is 'string'
                nvc.cfg[ 'default' ] = '';
            }
            else {
                // TODO Validate arguments[ 1 ] 
                nvc.cfg[ 'default' ] = arguments[ 1 ];
            }
        },

        // TODO Better name? nil-empty is kind of hard to understand
        'nil-empty': function( nvc ){
            nvc.cfg.nilEmpty = true;
        },

        'trim': function( nvc ){
            return function( value ){
                return $.trim( value );
            };
        },

        'ltrim': function(){
            // Adapted from jQuery 1.5
	        var trimLeft = /^[\s\xA0]+/;
            return function( value ){
                if ( null === value ) return '';
                return value.toString().replace( trimLeft, '' );
            };
        },
        
        'rtrim': function(){
            // Adapted from jQuery 1.5
	        var trimRight = /[\s\xA0]+$/;
            return function( value ){
                if ( null === value ) return '';
                return value.toString().replace( trimRight, '' );
            };
        },

        'boolean': function(){
            return function( value ){
                return value ? true : false;
            };
        },


        'defined': function( ){
            return function( value ){
                if ( this.defined( value ) ) {
                    return value;
                }
                else {
                    throw new Error( "*** .defined: Invalid value (" + value + ")" );
                }
            };
        }

    } );

}());
