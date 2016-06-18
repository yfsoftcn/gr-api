var Q = require('q');
var JPush = require("jpush-sdk");
var _ = require('underscore');
var async = require('async');
var E = require('../../../error');
var L = require('../../../logger');
//TODO:将jpush的key配置移到config中
var client = JPush.buildClient('1d874db47e96f8f7ca95de17', '038b9f4ae697c0651699502c');
module.exports = function(M,B){
    function savePush(content,alias,sendno,msg_id){
        L.info('保存推送信息');
        var deferred = Q.defer();
        var now = _.now();
        var rows = [];
        alias = alias || 'ALL';
        var aliasArr = alias.split(',');
        aliasArr.forEach(function(item){
            rows.push({content:content,sendno:sendno,msg_id:msg_id,createAt:now,updateAt:now,isread:0,alias:''+item});
        });
        var arg = {table:'nf_record',row:rows};
        M.create(arg).then(function(data){
            deferred.resolve(data);
        }).catch(function(err){
            deferred.reject(err);
        });
        return deferred.promise;
    };
    M.push = {
        //广播推送
        boardcast:function(args){
            var deferred = Q.defer();
            var msg = args.content || 'Hi, 技术部测试的信息，请忽略～～';
            client.push().setPlatform(JPush.ALL)
                .setAudience(JPush.ALL)
                .setNotification(msg,
                JPush.ios(msg, 'happy', 1))
                .send(function(err, res) {
                    if (err) {
                        L.error(err.message);
                        deferred.reject(err);
                    } else {
                        savePush(msg,'ALL',res.sendno,res.msg_id).then(function(){
                            deferred.resolve(res);
                        }).catch(function(err){
                            deferred.reject(err);
                        });
                    }
                });
            return deferred.promise;
        },
        //通知到个人
        notify:function(args){
            var deferred = Q.defer();
            var msg = args.content || 'Hi, 技术部测试的信息，请忽略～～';
            var alias = args.alias;
            if(alias){
                alias = JPush.alias(alias);
            }else{
                alias = JPush.ALL;
            }
            //alias = JPush.ALL;
            client.push().setPlatform(JPush.ALL)
                .setAudience(alias)
                .setNotification(msg,
                JPush.ios(msg, 'happy', 1))
                .send(function(err, res) {
                    if (err) {
                        L.error(err.message);
                        deferred.reject(err);
                    } else {
                        savePush(msg,args.alias,res.sendno,res.msg_id).then(function(){
                            deferred.resolve(res);
                        }).catch(function(err){
                            deferred.reject(err);
                        });
                    }
                });
            return deferred.promise;
        }
    }
    return M;
}