'use strict';
var Q = require('q');
var _ = require('underscore');
var async = require('async');
var E = require('../../error');
var restify = require('restify');
var L = require('../../logger.js');
module.exports = function(C){
    var client = restify.createJsonClient(C.bizRestApi);
    return {
        invoke:function(action,param){
            var def = Q.defer();
            var tempArr = _.pairs(param);
            for(var i in tempArr){
                var a = tempArr[i];
                tempArr[i] = a[0] + '=' + encodeURIComponent(a[1]);
            }
            tempArr = tempArr.join('&');
            action = '/grbizapi/api/v1.0' + action;
            L.info('Rest API URL:'+(action+'?'+tempArr));
            client.get(action+'?'+tempArr,function(err, req, res, obj){
                if(err){
                    def.reject(err);
                }else{
                    if(obj.errno != 0){
                        def.reject(obj);
                    }else{
                        def.resolve(obj.data);
                    }
                }
            })
            //client.post(action,param,function (err, req, res, obj) {
            //    if(err){
            //        def.reject(err);
            //    }else{
            //        def.resolve(obj);
            //    }
            //});
            return def.promise;
        }
    }
};