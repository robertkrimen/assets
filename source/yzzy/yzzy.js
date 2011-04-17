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

if ( ! 'console' in window ) {
    yzzy.log = function(){};
}
