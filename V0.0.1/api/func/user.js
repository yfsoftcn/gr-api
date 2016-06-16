var Q = require('q');
var AV = require('leanengine');
var _ = require('underscore');
var rest = require('../../rest');
var L = require('../../../logger.js');
var async = require('async');
var User = AV.Object.extend('_User');
var E = require('../../../error.js');

module.exports = function(M){
    M.user = {
        signIn:function(args){

            var deferred = Q.defer();

            var openid = args.login_name,
                unionID = args.unionID;

            var type = args.type;
            L.info(openid);
            async.waterfall([
                //1.根据openid到api数据库里看有没有
                function(callback){
                    var arg = {table:'gr_login_info',condition:"exists (select 1 from gr_thirdparty b where b.uid  = gr_login_info.id AND b.openid = '" + openid + "' )"};
                    M.count(arg).then(function(c){
                        callback(null,c)
                    }).catch(function(err){
                        callback(err);
                    });
                },
                //2.判断该用户是否在mysql
                function(c,callback){
                    if(c==0){
                        //如果c=0代表api数据库里没有,下拉
                        query = new AV.Query(User);
                        query.equalTo('openid',openid);
                        query.first().then(function(obj){
                            callback(null,c,obj);
                        })
                    }else{
                        //若c>0代表api数据库里有,
                        rest.invoke('/user/signin',args).then(function(data){
                            callback(null,c,data)
                        }).catch(function(err){
                            callback(err);
                        });
                    }
                },
                //3.判断该用户是否在云端
                function(c,data,callback){
                    if(c==0){
                        if(!data || data.length<1){
                            //如果不在mysql，又不在云端，则报错：账号未注册，无法登录
                            //return callback(E.User.ACCOUNT_ERROR);       //code:9999 系统错误
                            callback(null,c,data,0);
                        }else{
                            //如果不在mysql，但是在云端，则操作下拉操作
                            logininfo = {};
                            logininfo.objectId = data.id;
                            logininfo.openid =openid;
                            logininfo.login_pass = '123456';
                            logininfo.nickname = (data.get('nickname')||'');
                            logininfo.sex = (data.get('sex')||'');
                            logininfo.balance = (data.get('amount')||0);
                            logininfo.point = (data.get('point')||0);
                            logininfo.level = (data.get('level_id')||2);
                            logininfo.headimgurl = (data.get('headimgurl')||'');
                            logininfo.city = (data.get('city')||'');
                            logininfo.province = (data.get('province')||'');
                            logininfo.country = (data.get('country')||'');
                            logininfo.createAt = _.now();
                            logininfo.updateAt = _.now();
                            var arg = {table:'gr_login_info',row:logininfo};
                            M.create(arg).then(function(res){
                                callback(null,c,data,res.insertId)
                            }).catch(function(err){
                                callback(err);
                            });
                        }
                    }else{
                        callback(null,c,data,0);
                    }
                },
                //4.如果是第三方，向gr_thirdparty表下拉数据
                function(c,data,insertId,callback){
                    if(c==0){
                        if(!data || data.length<1){
                            //如果不在mysql，又不在云端，则报错：账号未注册，无法登录
                            //return callback(E.User.ACCOUNT_ERROR);
                            callback(null);
                        }else{
                            //如果不在mysql，但是在云端，则操作下拉操作
                            thirdparty = {};
                            thirdparty.uid = insertId;
                            thirdparty.openid = openid;
                            thirdparty.openidType = 'WX';
                            thirdparty.unionID = unionID ;
                            thirdparty.createAt = _.now();
                            thirdparty.updateAt = _.now();
                            var arg = {table:'gr_thirdparty',row:thirdparty};
                            M.create(arg).then(function(res){
                                callback(null)
                            }).catch(function(err){
                                callback(err);
                            });
                        }
                    }else{
                        callback(null)
                    }
                },
                //5.调登录接口
                function(callback){
                    rest.invoke('/user/signin',args).then(function(data){
                        callback(null,data);
                    }).catch(function(err){
                        callback(err);
                    });
                }
            ],function(err,res){
                if(err){
                    deferred.reject(err);
                }else{
                    deferred.resolve(res);
                }
            });

            return deferred.promise;
        },
        foo1:function(args){
            return rest.invoke('/rest/test',{});
        }
    }
    return M;
}