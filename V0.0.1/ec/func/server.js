/**
 * Created by admin on 2016/6/14.
 *
 */
var Q = require('q');
var async = require('async');
var _ = require('underscore');
var E = require('../../../error');
var L = require('../../../logger.js');
module.exports = function(M,B){
    M.server = {
        clearOutTimeOrders:function(args){
            var q = Q.defer() ;
            M.util.clearOutTimeOrders(M).then(function(data){
                q.resolve(data);
            }).catch(function(err){
                q.reject(err);
            });
            return q.promise;
        },
        //给用户发定时达券
        giveMemberTimingCoupons:function(args){
            var q = Q.defer();
            M.util.giveMemberCoupons(M).then(function(data){
                q.resolve(data);
            }).catch(function(err){
                q.reject(err)
            })

            return q.promise;
        }
    }
}

