var Q = require('q');
var async = require('async');
var _ = require('underscore');
var E = require('../../../error');

//操作leancloud
var AV = require('leanengine');
var User = AV.Object.extend('_User');//用户表
var UserCoupon = AV.Object.extend('UserCoupon');//用户优惠券表
var Coupons = AV.Object.extend('Coupons');// 优惠券表
var PointFlow = AV.Object.extend('PointFlow');//积分流水表
var GCoinFlow = AV.Object.extend('GCoinFlow');//活动余额流水表
var CartM = AV.Object.extend('CartProduct');//用户购物车

module.exports = function(M,B){
    var api = B.api;
    var ec = B.ec;
    M.foo = {
        count:function(args){
            var deferred = Q.defer();
            //var sql = 'select count(*) as count from '+args ;
            M.adapter.query(args.sql,function(err,results){
                deferred.resolve(results);
            });
            return deferred.promise;
        },
        turntableIndex:function(args){
            var q = Q.defer() ;
            async.auto({
                f0:function(cb){
                    var arg = {
                        table:'turntable_rewards_settings',
                        sort:' level+',
                        condition:" delflag = 0"
                    };
                    var turntable = [] ,
                        color = [] ;
                    M.find(arg).then(function(c){
                        async.eachSeries(c, function(e,cb1){
                            if(e.level === 0){
                                color.push("#f7fef6")
                            }else{
                                if(e.level%2 === 0){
                                    color.push("#fecd6f")
                                }else{
                                    color.push("#fa747b")
                                }
                            }
                            turntable.push(e.name);
                            cb1(null);
                        },function(){
                            cb(null,{turntable:turntable,color:color});
                        });
                    }).catch(function(err){
                        cb(err);
                    });
                },
                f1:function(cb){
                    var sql = "SELECT a.id,a.name,a.picurlarray,intro,b.id specid,b.grprice,b.name specname " +
                        "FROM gr_product a ,gr_product_spec b " +
                        "where a.id = b.pid and a.status = 1 and b.status = 1 and a.cid = 29";
                    ec.adapter.query(sql,function(err,d){
                        if(err){
                            cb(err)
                        }else{
                            cb(null, d)
                        }
                    })
                }
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve({turntable:result.f0.turntable,color:result.f0.color, products:result.f1});
                }
            })
            return q.promise ;
        },
        //大转盘奖品发放
        turntableReward:function(args){
            var deferred = Q.defer();
            var uid = args.uid ;
            var now = Math.floor(_.now()/1000);
            var startTime = new Date().setHours(0,0,1),
                endTime =new Date().setHours(23,59,59);
            async.auto({
                //首先获取用户的当天的抽奖次数，获取规则内允许的最大抽奖次数
                f_2:function(cb){
                    var arg = {
                        table:'turntable_public_settings',
                        condition:" delflag = 0"
                    };
                    M.first(arg).then(function(data){
                        if(data){
                            //获取time，
                            var time = data.time ;
                            cb(null,time) ;
                        }else{
                            //不限次
                            cb(null) ;
                        }
                    });
                },
                f_1:function(cb){
                    var arg = {
                        table:'turntable_results',
                        condition:" uid = '"+uid+"' and createAt<="+endTime+" and createAt>="+startTime
                    };
                    M.count(arg).then(function(count){
                        cb(null, count)
                    });
                },
                f_0:['f_1','f_2',function(cb,result){
                    if(result.f_2 > result.f_1){
                        //可以继续抽奖
                        cb(null)
                    }else{
                        //已达上限
                        cb({code:-1,msg:'已达上限，明天再来吧'})
                    }

                }],
                f0:['f_0',function(cb){
                    var arg = {
                        table:'turntable_rewards_settings',
                        sort:' level+',
                        condition:" delflag = 0"
                    };
                    var turntable = [] ;
                    M.find(arg).then(function(c){
                        async.eachSeries(c, function(e,cb1){
                            turntable.push({name:e.name,probability: e.probability,level: e.level,type: e.type,reward: e.reward});
                            cb1(null);
                        },function(){
                            cb(null,turntable)
                        });
                    }).catch(function(err){
                        cb(err);
                    });
                }],
                //生存随机数
                f1:['f0',function(cb,result){
                    var turnplate = result.f0 ;
                    getRandom(JSON.stringify(turnplate)).then(function(item){
                        console.log('========');
                        console.log(turnplate.length);
                        var angles = (item+1) * (360 / turnplate.length) - (360 / (turnplate.length*2));
                        if(angles<270){
                            angles = 270 - angles;
                        }else{
                            angles = 360 - angles + 270;
                        }
                        cb(null, {angles:angles,level:item});
                    }).catch(function(err){
                        cb(err)
                    });
                }],
                f2:['f1','f0',function(cb,result){
                    cb(null, result.f0[result.f1.level]);
                }],
                f3:['f2',function(cb,result){
                    var rewards = result.f2;
                    //获取奖品等级、奖品内容，并根据奖品类型、奖品内容发放相应的奖品
                    var type = rewards.type,
                        reward = rewards.reward ;
                    switch (type){
                        case 0:
                            //什么都不发
                            cb(null, {code:0,msg:"继续努力哦"});
                            break ;
                        case 1:
                            //发放积分
                            givePoint(uid, reward).then(function(data){
                                if(data.code === 0){
                                    cb(null, {code:1,msg:"恭喜您获取积分，请到个人中心查看"});
                                }else{
                                    cb(null, {code:1,msg:"恭喜您获取积分，请到个人中心查看"});
                                }
                            }).catch(function(err){
                                cb({code:1,msg:"退出重新进入下试试",err:err});
                            });
                            break ;
                        case 2:
                            //发放活动余额
                            giveCash(uid,reward).then(function(data){
                                if(data.code === 0){
                                    cb(null, {code:2,msg:"恭喜您获取活动余额，请到个人中心查看"});
                                }else{
                                    cb(null, {code:2,msg:"恭喜您获取活动余额，请到个人中心查看"});
                                }
                            }).catch(function(err){
                                cb({code:2,msg:"退出重新进入下试试", err: err});
                                //cb(null, {code:2,msg:"恭喜您获取活动余额，请到个人中心查看"});
                            });
                            break ;
                        case 3:
                            //发放优惠券，根据优惠券id
                            giveCoupons(uid,reward).then(function(data){
                                if(data.code === 0){
                                    cb(null, {code:3,msg:"恭喜您获取优惠券，请到个人中心查看"});
                                }else{
                                    cb(null, {code:3,msg:"恭喜您获取优惠券，请到个人中心查看"});
                                }
                            }).catch(function(err){
                                cb({code:1,msg:"退出重新进入下试试", err: err});
                                //cb(null, {code:2,msg:"恭喜您获取活动余额，请到个人中心查看"});
                            });
                            break ;
                        case 4:
                            //发放实物，直接加入购物车
                            cb(null, {code:4,msg:"恭喜您获取免费商品，请到购物车查看"});
                            break ;
                        case 5:
                            //发放权限，如获得7折商品
                            cb(null, {code:5,msg:"恭喜您获取折扣商品，加入购物车享受折扣"});
                            break ;
                        default:
                            //执行0的方法
                            cb(null, {code:0,msg:"继续努力哦"});
                            break ;
                    }
                }],
                //记录抽奖流水
                f4:['f2',function(cb,result){
                    //记录抽奖流水
                    var rewards = result.f2;
                    //获取奖品等级、奖品内容，并根据奖品类型、奖品内容发放相应的奖品
                    var type = rewards.type ,
                        level = rewards.level ,
                        reward = rewards.reward ;
                    var arg1 =  {
                        table:'turntable_results',
                        row:{
                            reward:reward,
                            level:level,
                            type:type,
                            uid:uid,
                            time:1,
                            updateAt:now,
                            createAt:now
                        }
                    };
                    M.create(arg1).then(function(){
                        cb(null, {code:0});
                    }).catch(function(err){
                        cb(E.Object.CREATE_ERROR);
                    });
                    /*var arg = {
                     table:'turntable_results',
                     condition:" uid='"+uid+"'",
                     sort:" updateAt-"
                     };*/
                    /*M.first(arg).then(function(d){
                     console.log(d);
                     if(d.id){
                     //找到了就更新
                     var updateAt = d.updateAt ;
                     if(new Date().toDateString() === new Date(updateAt).toDateString()){
                     //true：同一天，更新time
                     var arg1 =  {
                     table:'turntable_results',
                     condition:" id="+d.id,
                     row:{
                     reward:reward,
                     level:level,
                     type:type,
                     uid:uid,
                     time: d.time+1,
                     updateAt:_.now()
                     }
                     };
                     M.update(arg1).then(function(){
                     cb(null, {code:0});
                     }).catch(function(err){
                     cb(E.Object.UPDATE_ERROR);
                     });
                     }else{
                     //非同一天，创建一条新记录
                     var arg1 =  {
                     table:'turntable_results',
                     row:{
                     reward:reward,
                     level:level,
                     type:type,
                     uid:uid,
                     time:1,
                     updateAt:_.now(),
                     createAt:_.now()
                     }
                     };
                     M.create(arg1).then(function(){
                     cb(null, {code:0});
                     }).catch(function(err){
                     cb(E.Object.CREATE_ERROR);
                     });
                     }
                     }else{
                     //否则创建一条记录
                     var arg1 =  {
                     table:'turntable_results',
                     row:{
                     reward:reward,
                     level:level,
                     type:type,
                     uid:uid,
                     time:1,
                     updateAt:_.now(),
                     createAt:_.now()
                     }
                     };
                     M.create(arg1).then(function(){
                     cb(null, {code:0});
                     }).catch(function(err){
                     cb(E.Object.CREATE_ERROR);
                     });
                     }
                     }).catch(function(err){
                     cb(err)
                     });*/
                }],
                final:['f1','f2','f3',function(cb,result){
                    var f = result.f3 ;
                    //console.log(result.f1.angles );
                    f['angles'] = result.f1.angles ;
                    f['level'] = result.f1.level ;
                    f['reward'] = result.f2.reward ;
                    cb(null, f)
                }]
            },function(err,result){
                if(err){
                    deferred.reject(err);
                }else{
                    deferred.resolve(result.final);
                }
            });
            return deferred.promise;
        },
        //加入购物车
        insertToCart:function(args){
            var q = Q.defer() ;
            var pid = args.pid,
                psid =  args.psid,
                num = 1,
                uid = args.uid,
                mold = '0',
                can_cart = 1,
                probability = args.probability;
            console.log(args)
            insertProToCart(pid,psid,num,uid,mold,can_cart,probability).then(function(data){
                if(data.code === 0){
                    q.resolve({code:0,msg:'加入购物车成功'});
                }else{
                    q.reject({code:-1,msg:'加入购物车失败'});
                }
                //q.resolve({code:0,msg:'加入购物车成功'});
            }).catch(function(){
                q.reject({code:-1,msg:'加入购物车失败'});
            });
            return q.promise;
        },
        //发放积分
        givePoint:function(args){
            var q = Q.defer();
            var uid = args.uid,
                point=args.point,
                now = Math.floor(_.now()/1000);
            async.auto({
                //获取用户信息
                f0: function (callback) {
                    var arg = {
                        table:'gr_login_info',
                        id:uid
                    };
                    api.get(arg).then(function (res) {
                        var beforepoint = res.point;
                        var sql = 'update gr_login_info set point=point+'+parseInt(point)+" where id="+uid ;
                        api.adapter.query(sql, function(err,data){
                            if(err){
                                callback(err);
                            }else{
                                callback(null,{newP:parseInt(point),before:beforepoint} );
                            }
                        });
                    }).catch(function (err) {
                        //console.log(err);
                        callback({errno: 1050, msg: "uid用户不存在", err: err});
                    });
                },
                //记录积分流水
                f1:["f0", function (callback,result) {
                    var point = result.f0.newP,
                        beforepoint = result.f0.before;
                    var args = {
                        table:'gr_user_point',
                        row:{
                            content: "签到奖励积分+" + parseInt(point),
                            uid: uid,
                            newpoint: parseInt(point),
                            beforepoint: beforepoint,
                            afterpoint: beforepoint + parseInt(point),
                            createAt:now,
                            updateAt:now
                        }
                    };
                    ec.create(args).then(function(data){
                        callback(null, {code: 0, msg: "领取积分奖励成功"});
                    }).catch(function(err){
                        callback(err);
                    })
                }]
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result.f1);
                }
            });
            return q.promise;
        },
        //发放现金
        giveCash:function(args){
            var q = Q.defer();
            var now =Math.floor(_.now()/1000) ;
            var uid = args.uid,
                gCoin=args.gCoin;
            async.auto({
                f0:function(callback){
                    var arg = {
                        table:'gr_login_info',
                        id:uid
                    };
                    api.get(arg).then(function (res) {
                        var oldAmount = res.gCoin;
                        var sql = 'update gr_login_info set gCoin=gCoin+'+parseInt(gCoin)+" where id="+uid ;
                        api.adapter.query(sql, function(err,data){
                            if(err){
                                callback(err);
                            }else{
                                callback(null,{user:res,newAmount:gCoin,oldAmount:oldAmount} );
                            }
                        });
                    }).catch(function (err) {
                        //console.log(err);
                        callback({errno: 1050, msg: "uid用户不存在", err: err});
                    });
                },
                f1:['f0',function(callback,result){
                    var args = {
                        table:'gr_gcoinflow',
                        row:{
                            content: "签到励充值+"+gCoin+"元",
                            uid:uid,
                            newbalance: gCoin,
                            beforebalance: result.f0.oldAmount,
                            afterbalance:result.f0.oldAmount+gCoin,
                            createAt:now,
                            updateAt:now
                        }
                    };
                    ec.create(args).then(function(data){
                        callback(null, {code: 0, msg: "领取奖励成功"});
                    }).catch(function(err){
                        callback(err);
                    });
                }]
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result.f1);
                }
            });
            return q.promise;
        },
        //发放优惠券
        giveCoupons:function(args){
            var uid = args.uid ,
                cid = args.cid ;
            var timestamp = Math.floor(_.now()/1000);
            var endVaildTime=timestamp+7*3600*24;    //当天24点前有效
            var q = Q.defer();
            async.waterfall([
                //判断优惠券是否存在
                function(callback){
                    var arg = {
                        table:'gr_coupons',
                        id:cid
                    };
                    ec.get(arg).then(function(data){
                        callback(null,data);
                    }).catch(function(err){
                        callback({code:1047,msg:"优惠券未设置",err:err});
                    });
                },
                //发放优惠券
                function(res,callback){
                    var arg = {
                        table:'gr_user_coupon',
                        row:{
                            'uid':uid,
                            'cid':cid,
                            GiveTime:timestamp,
                            validityStartPeriod:timestamp,
                            'validityEndPeriod':endVaildTime,
                            'createAt':timestamp,
                            'updateAt':timestamp,
                            'used':0,
                            'status':1,
                            coupon:res.cname
                        }
                    };
                    ec.create(arg).then(function(data){
                        callback(null,{code:0,msg:"发放成功",res:res});
                    }).catch(function(err){
                        callback(err);
                    });
                }
            ],function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result);
                }
            });
            return q.promise;
        },
        cutPoint:function(args){
            var q = Q.defer();
            var uid = args.uid,
                point = args.point,
                now = Math.floor(_.now()/1000);
            async.auto({
                //获取用户信息
                f0: function (callback) {
                    var arg = {
                        table:'gr_login_info',
                        id:uid
                    };
                    api.get(arg).then(function (res) {
                        var beforepoint = res.point;
                        if(beforepoint-parseInt(point)<0){
                            callback(null, {code:-1,msg:"积分不足"});
                        }else{
                            var sql = 'update gr_login_info set point=point-'+parseInt(point)+" where id="+uid+" and point >=  "+parseInt(point) ;
                            api.adapter.query(sql, function(err,data){
                                if(err){
                                    callback(err);
                                }else{
                                    callback(null,{code:0,newP:parseInt(point),before:beforepoint} );
                                }
                            });
                        }
                    }).catch(function (err) {
                        //console.log(err);
                        callback({errno: 1050, msg: "uid用户不存在", err: err});
                    });
                },
                //记录积分流水
                f1:["f0", function (callback,result) {
                    if(result.f0.code === 0){
                        var point = result.f0.newP,
                            beforepoint = result.f0.before;
                        var args = {
                            table:'gr_user_point',
                            row:{
                                content: "签到补签扣除积分-" + parseInt(point),
                                uid: uid,
                                newpoint: parseInt(point),
                                beforepoint: beforepoint,
                                afterpoint: beforepoint - parseInt(point),
                                createAt:now,
                                updateAt:now
                            }
                        };
                        ec.create(args).then(function(data){
                            callback(null, {code: 0, msg: "扣减积分奖励成功"});
                        }).catch(function(err){
                            callback(err);
                        })
                    }else{
                        callback(null, {code:-1,msg:"积分不足"});
                    }

                }]
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result.f1);
                }
            });
            return q.promise;
        },
        getUserInfo:function(args){
            var q = Q.defer();
            var arg = {
                table:"gr_login_info",
                id:args.uid
            };
            api.get(arg).then(function(data){
                q.resolve(data);
            }).catch(function(err){
                q.resolve(err);
            });
            return q.promise;
        }
    };
    return M;
};
//获取_User数据 get()
var getUser = function(uid){
    var q = Q.defer() ;
    var query = new AV.Query(User);
    query.get(uid+"").then(function(data){
        q.resolve(data.toJSON());
    }).catch(function(err){
        q.reject(err);
    });
    return q.promise;
};
//发放积分，记录流水
var givePoint = function(uid,point){
    var q = Q.defer() ;
    var now = Math.floor(_.now()/1000) ;
    async.auto({
        //获取用户信息
        f0: function (callback) {
            var query = new AV.Query(User);
            query.get(uid + "").then(function (res) {
                var beforepoint = res.get('point');
                res.set('point', beforepoint + parseInt(point));
                res.save();
                callback(null, {newP:parseInt(point),before:beforepoint});
            }).catch(function (err) {
                //console.log(err);
                callback({code: 1050, msg: "uid用户不存在", err: err});
            });
        },
        //记录积分流水
        f1:["f0", function (callback,result) {
            var point = result.f0.newP,
                beforepoint = result.f0.before;
            var pointFlow = new PointFlow();
            pointFlow.save({
                content: "抽奖奖励积分+" + parseInt(point),
                userid: uid,
                newpoint: parseInt(point),
                beforepoint: beforepoint,
                afterpoint: beforepoint + parseInt(point)
            }, {
                success: function (pointflow) {
                    callback(null, {code: 0, msg: "领取积分奖励成功"});
                },
                error: function (pointflow, error) {
                    callback(null, {code: 0, msg: "领取积分奖励成功,流水记录失败！"});
                }
            });
        }],
        f2:["f0", function (callback,result) {
            var point = result.f0.newP,
                beforepoint = result.f0.before;
            var args = {
                table:'gr_point_flow',
                row:{
                    content: "抽奖奖励积分+" + parseInt(point),
                    uid: uid,
                    newpoint: parseInt(point),
                    beforepoint: beforepoint,
                    afterpoint: beforepoint + parseInt(point),
                    createAt:now,
                    updateAt:now
                }
            };
            api.create(args).then(function(data){
                callback(null, {code: 0, msg: "领取积分奖励成功"});
            }).catch(function(err){
                callback(err);
            })
        }]
    },function(err,result){
        if(err){
            q.reject(err);
        }else{
            q.resolve(result.f1);
        }
    });
    return q.promise;
};
//发放优惠券
var giveCoupons = function(uid,couponsId){
    var timestamp = Date.parse(new Date(new Date().setHours(23,59,59)));
    var startTime = Date.parse(new Date());

    var q = Q.defer() ;
    async.waterfall([
        //判断优惠券是否存在
        function(callback){
            var query = new AV.Query(Coupons);
            query.get(couponsId+"").then(function(res){
                if(res){
                    callback(null,res);
                }else{
                    callback({code:1047,msg:"优惠券未设置"});
                }
            }).catch(function(err){
                callback({code:1047,msg:"优惠券未设置"});
            });
        },
        //发放优惠券
        function(res,callback){
            var takeCoupon = new UserCoupon();
            var endVaildTime=String(timestamp);    //当天24点前有效
            var newCoupon={'uid':uid,'cid':res.get("batchNo"),GiveTime:new Date(),'validityEndPeriod':endVaildTime,'used':0,'status':1,coupon:res.attributes,validityStartPeriod:String(startTime)};
            takeCoupon.save(newCoupon).then(function(res){
                callback(null,{code:0,msg:"发放成功",res:res});
            });
        }
    ],function(err,result){
        if(err){
            q.reject(err);
        }else{
            q.resolve(result);
        }
    });
    return q.promise;
};
//发放现金
var giveCash = function(uid,cash){
    var q = Q.defer() ;
    var now = Math.floor(_.now()/1000) ;
    async.auto({
        f0:function(callback){
            var query = new AV.Query(User);
            var newAmount = 0 ;
            var oldAmount = 0 ;
            query.get(uid).then(function(res){
                if(res){
                    oldAmount = parseFloat(res.get('gCoin')) ;
                    newAmount = oldAmount+parseFloat(cash) ;
                    res.save({gCoin:newAmount}).then(function(){
                        callback(null,{user:res,newAmount:newAmount,oldAmount:oldAmount});
                    }).catch(function(err){
                        callback({code:-1,msg:'保存失败'});
                    });

                }else{
                    callback({code:-1,msg:'用户不存在'});
                }
            });
        },
        //发放现金
        f1:['f0',function(callback,result){
            var amountFlow = new GCoinFlow();
            amountFlow.save({
                content: "抽奖奖励充值+"+cash+"元",
                userid:uid,
                newamount: parseFloat(cash),
                beforeamount: result.f0.oldAmount,
                afteramount:result.f0.newAmount
            }, {
                success: function(post) {
                    callback(null,{code:0,msg:"发放成功",res:result.f0});
                },
                error: function(post, error) {
                    callback(null,{code:0,msg:"发放失败",res:result.f0});
                }
            });
        }],
        f2:['f0',function(callback,result){
            var args = {
                table:'gr_gcoin_flow',
                row:{
                    content: "抽奖奖励充值+"+cash+"元",
                    uid:uid,
                    newamount: parseFloat(cash),
                    beforeamount: result.f0.oldAmount,
                    afteramount:result.f0.newAmount,
                    createAt:now,
                    updateAt:now
                }
            };
            api.create(args).then(function(data){
                callback(null, {code: 0, msg: "领取积分奖励成功"});
            }).catch(function(err){
                callback(err);
            });
        }]
    },function(err,result){
        if(err){
            q.reject(err);
        }else{
            q.resolve(result);
        }
    });
    return q.promise;
};
//生成随机数
var getRandom = function(turntable){
    var q = Q.defer() ;
    var level = 0 ;
    var start = 1,
        range = [],
        levels = [] ;
    turntable = JSON.parse(turntable) ;
    async.eachSeries(turntable,function(e,cb){
        range = _.union(range, _.range(start,start+e.probability*10));
        levels.push({level: e.level,range:_.range(start,start+e.probability*10)});
        start += e.probability*10 ;
        cb(null);
    },function(){
        console.log('==========================================='+level);
        var r = _.random(1,range.length)
        async.eachSeries(levels, function(e,cb1){
            if(_.indexOf(e.range,r)>=0){
                level = e.level ;
            }
            cb1(null)
        },function(){
            q.resolve(level) ;
        });
    });
    return q.promise ;
};
var insertProToCart = function(pid,psid,num,uid,mold,can_cart,probability){
    console.log("操作数据了哦");
    mold = mold || "0";
    can_cart = can_cart || 1 ;
    probability = parseFloat(probability) || 1 ;
    var q = Q.defer();

    //创建购物车的查询实例
    var query = new AV.Query(CartM);
    console.log("操作数据了哦1");
    async.waterfall([
        function(callback){
            console.log("操作数据了哦2");
            //根据pid,psid,uid获取该对象
            query.equalTo('pid',pid+"");
            query.equalTo('psid',psid+"");
            query.equalTo('uid',uid+"");
            query.first().then(function(res){
                callback(null,res);
            }).catch(function(err){
                callback({code:9999,reason:err});    //code:9999 系统错误
            });
        },
        function(res,callback){
            console.log("操作数据了哦3");
            if(!res || res.length<1){
                console.log("操作数据了哦4");
                //用户之前没有添加该商品到购物车
                var obj = new CartM();
                obj.set('number',parseInt(num));
                obj.set('uid',uid+"");
                obj.set('pid',pid+"");
                obj.set('checked',true);
                obj.set('mold',mold+"");
                obj.set('psid',psid+"");
                obj.set('probability',parseFloat(probability)) ;
                obj.save().then(function(cartPro){
                    console.log(cartPro);
                    callback(null,{code:0,objectId:cartPro.id});       //添加购物车成功
                }).catch(function(err){
                    console.log(err)
                    callback({code:9999,reason:err});//code:9999 系统错误
                });
            }else{
                console.log("操作数据了哦5");
                //用户之前已经添加过该商品到购物车
                if(parseInt(can_cart) === 0){       //是否允许加入购物1允许，0不允许
                    //禁止加入购物车的商品，再次下单时将不再添加商品
                }else{
                    res.set('number',parseInt(num)+res.get('number'));
                }
                res.save().then(function(cartPro){
                    callback(null,{code:0,objectId:cartPro.id,numbser:num});       //添加购物车成功,返回numbser：添加的数量
                }).catch(function(err){
                    callback({code:9999,reason:err});//code:9999 系统错误
                });
            }
        }
    ],function(err,result){
        if(err){
            console.log("操作数据了哦6");
            q.reject(err);
        }else{
            console.log("操作数据了哦7");
            q.resolve(result);
        }
    });
    return q.promise;
};