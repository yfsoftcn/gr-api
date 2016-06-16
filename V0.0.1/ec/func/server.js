/**
 * Created by admin on 2016/6/14.
 *
 */
var Q = require('q');
var async = require('async');
var E = require('../../../error');
var api = require('../../api');
var _ = require('underscore');
var L = require('../../../logger.js');
var com = require('./common.js');
module.exports = function(M){
    M.server = {
        clearOutTimeOrders:function(args){
            var q = Q.defer() ;
            com.clearOutTimeOrders(M).then(function(data){
                q.resolve(data);
            }).catch(function(err){
                q.reject(err);
            });
            return q.promise;
        },
        //给用户发定时达券
        giveMemberTimingCoupons:function(args){
            var q = Q.defer();
            com.giveMemberCoupons(M).then(function(data){
                q.resolve(data);
            }).catch(function(err){
                q.reject(err)
            })

            return q.promise;
        }
    }
}

