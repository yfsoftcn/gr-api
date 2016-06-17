'use strict';
module.exports = function(C) {
    var rest = require('../rest')(C);
    return function(args){
        var act = args.action;
        delete args.action;
        return rest.invoke('/order/'+act||'',args);
    }
}