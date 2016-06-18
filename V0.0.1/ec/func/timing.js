/**
 * Created by admin on 2016/6/3.
 */
var Q = require('q');
var async = require('async');
var _ = require('underscore');
var E = require('../../../error');
var L = require('../../../logger.js');
module.exports = function(M,B){
    M.timing = {
        //获取用户定时券（会员、普通券的数量、具体券）
        getTimingCoupons:function(args){
            var q = Q.defer();
            var uid = args.uid,
                now = Math.floor(_.now()/1000);
            var member_coupons = {},
                user_coupons = {};
            async.waterfall([
                function(cb){
                    var sql = "select sum(a.count) sum " +
                        "from gr_timeservice_membercoupons a,gr_timeservice_coupons b ,gr_timeservice_slot c " +
                        "where a.usestarttime<"+now+" and a.useendtime>"+now+" and a.uid="+uid+" " +
                        "and a.cid=b.id and b.slotid=c.id and a.count>0 ";
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err);
                        }else{
                            member_coupons['count']=data[0].sum;
                            cb(null);
                        }
                    });
                },
                function(cb){
                    var sql = "select a.id,a.uid,a.cid,a.count,a.usestarttime,a.useendtime,b.title,c.price,c.starttime,c.endtime " +
                        "from gr_timeservice_membercoupons a,gr_timeservice_coupons b ,gr_timeservice_slot c " +
                        "where a.usestarttime<"+now+" and a.useendtime>"+now+" and a.uid="+uid+" " +
                        "and a.cid=b.id and b.slotid=c.id and a.count>0 ";
                    console.log(sql);
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err);
                        }else{
                            member_coupons['coupons']=data;
                            cb(null);
                        }
                    });
                },
                function(cb){
                    var arg = {
                        table:'gr_timeservice_usercoupons',
                        condition:" usestarttime<"+now+" and useendtime>"+now+" and uid="+uid+" and used=0"
                    };
                    M.count(arg).then(function(data){
                        user_coupons['count']=data;
                        cb(null);
                    });
                },
                function(cb){
                    var sql = "select a.id,a.type,a.usestarttime,a.useendtime,b.title,c.price,c.starttime,c.endtime " +
                        "from gr_timeservice_usercoupons a , gr_timeservice_coupons b ,gr_timeservice_slot c " +
                        "where a.usestarttime<"+now+" and a.useendtime>"+now+" and a.uid="+uid+" and a.used=0 " +
                        "and a.cid=b.id and b.slotid=c.id";
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err);
                        }else{
                            user_coupons['coupons']=data;
                            cb(null);
                        }
                    });
                }
            ],function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve({status:0,member:member_coupons,user:user_coupons});
                }
            });
            return q.promise;
        },
        //根据兑换码获取定时达券
        giveTimingCouponsByCode : function(args){
            var uid = args.uid,
                code = args.code,
                now = Math.floor(_.now()/1000);
            var today = Math.floor(new Date((new Date(now*1000).toDateString())).getTime()/1000);
            var q = Q.defer();
            async.waterfall([
                function(cb){
                    var sql = "select a.uid,a.cid,b.receivestarttime,b.receiveendtime,b.receiveuseday " +
                        "from gr_timeservice_usercoupons a,gr_timeservice_coupons b " +
                        "where a.code='"+code+"' and b.receivestarttime<"+now+" and b.receiveendtime>"+now +" and a.cid=b.id";

                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(E.WeiStore.TIMING_CODE_INVALID);
                        }else{
                            if(_.isEmpty(data[0])){
                                cb(E.WeiStore.TIMING_CODE_INVALID);
                            }else{
                                cb(null, data[0])
                            }
                        }
                    })
                },
                function(user,cb){
                    var arg = {
                        table:'gr_timeservice_usercoupons',
                        condition:'type=1 and code="'+code+'" and uid is null',
                        row:{
                            uid:uid,
                            usestarttime:today,
                            useendtime:today+((+user.receiveuseday)*24*3600),
                            createAt:now,
                            updateAt:now
                        }
                    };
                    M.update(arg).then(function(){
                        cb(null,{errno:0});
                    }).catch(function(err){
                        console.log(err);
                        cb(E.WeiStore.TIMING_CODE_INVALID);
                    })
                }
            ],function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result)
                }
            })
            return q.promise;
        },
        //根据优惠券id获取定时达券
        giveTimingCouponsById : function(args){
            var uid = args.uid,
                code = args.code,
                now = Math.floor(_.now()/1000);
            var today = Math.floor(new Date((new Date(now*1000).toDateString())).getTime()/1000);
            var q = Q.defer();
            async.waterfall([
                function(cb){
                    var arg = {
                        table:'gr_timeservice_coupons',
                        condition:"id="+code+" and receivestarttime<"+now+" and receiveendtime>"+now
                    };
                    M.first(arg).then(function(data){
                        if(data.id){
                            cb(null,data);
                        }else{
                            cb(E.WeiStore.TIMING_CODE_NOT_EXIST);
                        }
                    }).catch(function(err){
                        cb(E.WeiStore.TIMING_CODE_NOT_EXIST);
                    });
                },
                function(user,cb){
                    var arg = {
                        table:'gr_timeservice_usercoupons',
                        condition:'type=2 and cid='+code+' and uid='+uid
                    };
                    M.first(arg).then(function(data){
                        if(data.id){
                            //已领取过
                            cb(E.WeiStore.TIMING_CODE_INVALID);
                        }else{
                            cb(null, user);
                        }
                    })
                },
                function(user,cb){
                    var arg = {
                        table:'gr_timeservice_usercoupons',
                        row:{
                            type:2,
                            uid:uid,
                            cid:code,
                            usestarttime:today,
                            useendtime:today+((+user.receiveuseday)*24*3600),
                            createAt:now,
                            updateAt:now
                        }
                    };
                    M.create(arg).then(function(){
                        cb(null,{errno:0});
                    }).catch(function(err){
                        cb(E.WeiStore.TIMING_CODE_INVALID);
                    })
                }
            ],function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result)
                }
            })
            return q.promise;
        },
        //根据时间获取符合条件的定时达券
        getValidTimingCoupons:function(args){
            var q = Q.defer();
            var uid = args.uid,
                deliveryTime = args.deliveryTime ;
            var member_coupons = {},
                user_coupons = {};
            async.waterfall([
                function(cb){
                    var sql = "select a.* ,c.price,c.starttime,c.endtime,b.title " +
                        "from gr_timeservice_usercoupons a,gr_timeservice_coupons b,gr_timeservice_slot c " +
                        "where a.cid=b.id and b.slotid=c.id and a.used=0 " +
                        "and (UNIX_TIMESTAMP(FROM_UNIXTIME("+deliveryTime+",'%Y-%m-%d'))+TIME_TO_SEC(FROM_UNIXTIME(c.starttime,'%H:%i:%s'))) <="+deliveryTime+" " +
                        "and (UNIX_TIMESTAMP(FROM_UNIXTIME("+deliveryTime+",'%Y-%m-%d'))+TIME_TO_SEC(FROM_UNIXTIME(c.endtime,'%H:%i:%s')))>" +deliveryTime+" "+
                        "and a.uid="+uid;
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(E.WeiStore.NO_TIMING_COUPONS);
                        }else{
                            user_coupons['count']=data.length;
                            user_coupons['coupons']=data;
                            cb(null);
                        }
                    })
                },
                function(cb){
                    var sql = "select a.* ,c.price,b.title " +
                        "from gr_timeservice_membercoupons a,gr_timeservice_coupons b,gr_timeservice_slot c " +
                        "where a.cid=b.id and b.slotid=c.id  " +
                        "and (UNIX_TIMESTAMP(FROM_UNIXTIME("+deliveryTime+",'%Y-%m-%d'))+TIME_TO_SEC(FROM_UNIXTIME(c.starttime,'%H:%i:%s'))) <"+deliveryTime+" " +
                        "and (UNIX_TIMESTAMP(FROM_UNIXTIME("+deliveryTime+",'%Y-%m-%d'))+TIME_TO_SEC(FROM_UNIXTIME(c.endtime,'%H:%i:%s')))>" +deliveryTime+" "+
                        "and a.count>0 and a.uid="+uid;
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(E.WeiStore.NO_TIMING_COUPONS);
                        }else{
                            var count = 0 ;
                            _.each(data, function(n,k){
                                count+=n.count;
                                return n;
                            })
                            member_coupons['count']= count;
                            member_coupons['coupons']=data;
                            cb(null);
                        }
                    })
                }
            ],function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve({status:0,member:member_coupons,user:user_coupons})
                }
            });
            return q.promise;
        },
        //获取当前定时达规则
        getTimingRules:function(){
            var q = Q.defer();
            async.waterfall([
                function(cb){
                    var arg = {
                        table:"gr_timeservice_slot"
                    };
                    M.find(arg).then(function(data){
                        var list = {} ;
                        var hours = [];
                        if(data){
                            _.each(data, function(n,k){
                                for(var i=new Date(n.starttime*1000).getHours();i<= new Date(n.endtime*1000).getHours();i++){
                                    hours.push(i);
                                    if(!list[i+'']){
                                        list[i+'']= n.price;
                                    }
                                }
                            })
                        }
                        cb(null, {hours:_.uniq(hours),prices:list});
                    })
                }
            ],function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result);
                }
            })
            return q.promise;
        }
    };
    return M ;
};