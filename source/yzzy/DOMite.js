var yzzy;
if ( yzzy === null || yzzy === undefined ) {
    yzzy = {};
}

( function(){
    var $ = jQuery;
    var $log = function(){};
    if ( typeof console !== "undefined" ) {
        $log = console.log;
    }

    var $DOMite;
    yzzy.DOMite = $DOMite = function(){
        var statement_query = arguments[ 0 ];
        var match = /^(?:\?\*|\?)/.exec( statement_query );
        if ( match ) {
            return $DOMite.query.apply( $DOMite, arguments );
        }
        else {
            return $DOMite.create.apply( $DOMite, arguments );
        }
    };

    $.extend( $DOMite, {

        'create': function( statement ){
            statement = this._unpackStatement( statement );
            var node = new $DOMite.Node({
                name: statement.name,
                blueprint: statement.blueprint
            });
            if ( 1 < arguments.length ) {
                node.dispatch.apply( node, Array.prototype.slice.call( arguments, 1 ) );
            }
            return node;
        },

        '_unpackStatement': function( statement ){
            var result = {
                original: statement,
                name: null,
                blueprint: null
            };
            var match = /^([^:<]+):(.*)$/.exec( statement );
            if ( match ) {
                result.name = match[ 1 ];
                result.blueprint = match[ 2 ];
            }
            else {
                result.blueprint = statement;
            }
            return result;
        },

        'create$': function() {

            var $arguments = Array.prototype.slice.apply( arguments );

            // lt( [ "<div />", "<div />", ... ] )
            if ( $arguments.length === 1 && $.isArray( $arguments[0] ) ) {
                $arguments = [ 'div' ].concat( $arguments );
            }
            // lt( "<div />" )
            else if ( $arguments.length === 1 && $arguments[0][0] === '<' ) {
                return $( $arguments[ 0 ] );
            }

            var blueprint = $arguments[0];
            var append = $arguments[1];

            var result = /^([^\.]+)(\.|(?:\.[^\.]+)*)$/.exec( blueprint );
            if ( ! result ) {
                throw new Error( "Unable to parse blueprint (" + blueprint + ")" );
            }
            result.shift();
            var $node = $( '<' + result[ 0 ]  + '/>' );
            result.shift();
            if ( result[ 0 ] ) {
                var classes = result[ 0 ].split( '.' );
                $.each( classes, function( index, value ){
                    if ( value !== undefined && value.length ) {
                        $node.addClass( value );
                    }
                } );
            }

            if ( append ) {
                $node.append( $( append ) );
            }

            return $node;
        },

        'query': function( query ){
            query = this._unpackQuery( query );
            // TODO selectorFor?
            var selector = this.selectorOf( query.path );
            // TODO Alias $ to jQuery
            var query$ = $( selector ); 
            if ( ! query.many ) {
                return query$.data( 'DOMite' );
            }

            var result = [];
            query$.each( function(){
                var data = $( this ).data( 'DOMite' );
                if ( data ) {
                    result.push( data );
                }
            } );
            return result;
        },

        '_unpackQuery': function( query ){
            var result = {
                original: query,
                path: null,
                many: false
            };
            // TODO Add ?$ querying
            var match = /^(\?\*|\?)(.*)$/.exec( query );
            if ( ! match ) {
                throw new Error( "Unable to parse query (" + query + ")" );
            }
            if ( match[ 1 ] === '?*' ) {
                result.many = true;
            }
            result.path = match[ 2 ];
            return result;
        },

        '_pathClass' : {},

        'pathClass': function( path ){
            if ( this._pathClass[ path ] ) {
                return this._pathClass[ path ];
            }
            // TODO Path cleanup, strip extra, leading, trailing slashes
            var partList = [ 'DOMite' ].concat( path.split( '/' ) );
            var pathClass = partList.join( '-' );
            this._pathClass[ path ] = pathClass;
            return pathClass;
        },

        'classOf': function( path ){
            return this.pathClass( path );
        },

        'selectorOf': function( path ){
            return '.' + this.classOf( path );
        },

        'append': function(){
            return this.appendTo.apply( this, [ 'body' ].concat( Array.prototype.slice.call( arguments ) ) );
        },

        'appendTo': function(){
            var $arguments = Array.prototype.slice.call( arguments );
            var appendTo$ = $( $arguments.shift() );
            var statement = $arguments.shift();
            var node = this.create.apply( this, [ statement ] );
            appendTo$.append( node.$ );
            node.dispatch.apply( node, $arguments );
            return node;
        },

    } );

    $DOMite.Node = function( $Node ){
        var self = this;
        self._initialize( $Node );
    };
    $.extend( $DOMite.Node.prototype, {

        '_initialize': function( $Node ){
            var self = this;

            self.$ = $DOMite.create$( $Node.blueprint );
            self.$.data( 'DOMite', this );
            self.stash = {};
            
            if ( $Node.name ) {
                self.name = $Node.name;
                self.setPath( self.name );
            }

            if ( $Node.parent ) {
                self.attachTo( $Node.parent );
            }
        },

        'setPath': function( path ){
            var self = this;

            // FIXME Better testing of reattaching a node
            // FIXME What if pathClass === 0
            if ( self.pathClass ) {
                self.$.removeClass( self.pathClass );
            }

            self.path = self.trail = path;
            self.pathClass = $DOMite.pathClass( self.path );
            self.$.addClass( self.pathClass );
        },

        'attachTo': function( parent ){
            var self = this;

            // We'll reincorporate name into the trail again below
            self.trail = parent.trail;

            var path;
            if ( self.name ) {
                path = [];
                if ( self.trail ) {
                    path.push( self.trail );
                }
                path.push( self.name );
            }

            if ( path ) {
                path = path.join( '/' );
                self.setPath( path );
            }
        },

        'append': function(){
            var self = this;

            var $arguments = Array.prototype.slice.call( arguments );
            statement = $arguments.shift();
            // FIXME $DOMite.Node.fromStatement
            statement = $DOMite._unpackStatement( statement );
            var node = new $DOMite.Node({
                name: statement.name,
                blueprint: statement.blueprint
            });

            self._append( node );
            node.dispatch.apply( node, $arguments );

            return node;
        },

        'dispatch': function(){
            var self = this;

            if ( $.isFunction( arguments[ 0 ] ) ) {
                // TODO assert( arguments.length === 1 )
                arguments[ 0 ].apply( self, [ self ] );
            }
            else {
                var rest = Array.prototype.slice.call( arguments );

                if ( $.isArray( rest[ 0 ] ) ) {
                    var html = rest.shift();
                    self.$.append.apply( self.$, html );
                }

                if ( rest.length ) {
                    // TODO Check for % 2
                    while ( rest.length ) {
                        var name = rest.shift();
                        var value = rest.shift();
                        if ( ! $.isArray( value ) ) {
                            value = [ value ];
                        }
                        self.$[ name ].apply( self.$, value );
                    }
                }
            }
        },

        '_append': function( node ){
            var self = this;
            // FIXME Make this consistent
            node.attachTo( self );
            this.append$().append( node.$ );
        },

        'append$': function(){
            var append$;
            var into;
            if ( this._intoStack.length ) {
                into = this._intoStack[ this._intoStack.length - 1 ];
            }
            if ( into ) {
                append$ = into.$;
                if ( into.limit > 0 ) {
                    into.limit -= 1;
                    if ( 0 === into.limit ) {
                        this.outof();
                    }
                }
            }
            else {
                this.outof();
                append$ = this.$;
            }
            return append$;
        },

        '_intoStack': [],

        'into': function( blueprint, limit ){
            // TODO Support statement here
            var into = {};
            into.$ = $DOMite.create$( blueprint );
            into.limit = limit;
            this.append$().append( into.$ );
            this._intoStack.push( into );
        },

        'outof': function(){
            if ( this._intoStack.length ) {
                this._intoStack.pop();
            }
        }

    } );
}());
