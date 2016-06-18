var Q = require('q');
var _ = require('underscore');
var L = require('../../../logger.js');
var async = require('async');
var E = require('../../../error.js');

module.exports = function(M,B){
    var rest = B.rest;
    M.user = {
        signIn:function(args){
            var deferred = Q.defer();
            rest.invoke('/user/signin',args).then(function(data){
                deferred.resolve(data);
            }).catch(function(err){
                deferred.reject(err);
            });
            return deferred.promise;
        }
    };
    return M;
}