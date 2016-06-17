/**
 * Created by Scor on 2016/3/31.
 */
var Q = require('q');
var async = require('async');
var E = require('../../../error');
var _ = require('underscore');
var m = require('moment');
var L = require('../../../logger.js');
module.exports = function(M,C){
    var api = require('../../api')(C);
    M.inventory = {
        getBINinfo:function(args){
            var q=Q.defer();
            async.auto({
                f0:function(callback,results){
                    data={
                        table:'gr_inventory_warn',
                        condition:" BIN='1231201'"
                    }
                    M.find(data).then(function(d){
                        callback(null,d);
                    })
                }
            },function(err,results){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(results);
                }
            })
            return q.promise;
        },
        outBatch:function(args){
            var  q=Q.defer();

        }
    };
    return M ;
};

