'use strict';
var Q = require('q');
var _ = require('underscore');
var config = require('../../../config');
var async = require('async');
var E = require('../../../error');
var rest = require('../../rest');
module.exports = function(M){
    M.shop = {
        syncData:function(args){
            return rest.invoke('/shop/syncData',args);
        }
    };
    return M;
}