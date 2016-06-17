var Q = require('q');
var _ = require('underscore');
var async = require('async');
var E = require('../../../error');
module.exports = function(M){
    M.version = {
        /**
         * args{
         * app,
         * version,
         * device,
         * }
         * @param args
         * @returns {*|promise}
         */
        check: function (args) {
            var deferred = Q.defer();
            //获取版本号最大的一个
            var arg = {table: 'cm_version', condition: "app = '"+args.app+"' and device = '"+args.device+"' ",sort:"version-"};
            M.first(arg).then(function(v){
                if(_.isEmpty(v)){
                    //没有数据，默认为相同版本
                    deferred.resolve({});
                }else{
                    if(args.version == v.version){
                        //版本相同
                        deferred.resolve({});
                    }else{
                        //版本不同
                        v.errno = E.System.NOT_LATEST.errno;
                        v.message = E.System.NOT_LATEST.message;
                        deferred.reject(v);
                    }
                }

            }).catch(function(err){
                deferred.reject(err);
            });
            return deferred.promise;
        }
    };
    return M;
}