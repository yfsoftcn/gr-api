'use strict';
var Q = require('q');
var _ = require('underscore');
var config = require('../../../config');
var async = require('async');
var E = require('../../../error');
module.exports = function(M,C){
    var rest = require('../../rest')(C);
    M.shop = {
        syncData:function(args){
            return rest.invoke('/shop/syncData',args);
        }
    };
    return M;
}