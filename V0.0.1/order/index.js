'use strict';
var Q = require('q');
var _ = require('underscore');
var rest = require('../rest');
module.exports = function(args){
    var act = args.action;
    delete args.action;
    return rest.invoke('/order/'+act||'',args);
}