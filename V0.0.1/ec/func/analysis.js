/**
 * Created by admin on 2016/4/30.
 */
var Q = require('q');
var async = require('async');
var E = require('../../../error');
var _ = require('underscore');
var m = require('moment');
var L = require('../../../logger.js');
module.exports = function(M,B){
    var api = B.api;
    //数据分析接口
    M.analysis = {
        userAnalysis:function(args){
            var q = Q.defer();
            var start=+(Date.parse(new Date(args.start))+"").substr(0,10),
                end = +(Date.parse(new Date(args.end))+"").substr(0,10) ;
            async.auto({
                f0: function (cb) {
                    var sql = "SELECT date_format(from_unixtime(createAt),'%Y-%m-%d') time," +
                        "sum(finalAmount)/count(groupNo) avgOrder," +
                        "sum(finalAmount)/count(distinct uid) avgUser " +
                        "FROM gr_final_order_group " +
                        "where createAt>"+start+" and createAt<"+end +" " +
                        "group by date_format(from_unixtime(createAt),'%Y-%m-%d') " +
                        "order by createAt asc";
                    M.adapter.query(sql, function (err, data) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, data);
                        }
                    })
                },
                f1:function(cb){
                    reOrder(M, {start:start,end:end}).then(function(data){
                        cb(null, data);
                    }).catch(function(err){
                        cb(err);
                    })
                },
                f2:function(cb){
                    frequency(M, {start:start,end:end}).then(function(data){
                        cb(null, data);
                    }).catch(function(err){
                        cb(err);
                    })
                },
                f3:function(cb){
                    avgOrderAndUser(M, {start:start,end:end}).then(function(data){
                        cb(null, data);
                    }).catch(function(err){
                        cb(err);
                    })
                },
                f4:function(cb){
                    //下单时间段
                    var sql = "SELECT date_format(from_unixtime(createAt),'%H') createAt ,count(1) cnt FROM `gr_final_order` group by date_format(from_unixtime(createAt),'%H')";
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err);
                        }else{
                            cb(null, data);
                        }
                    });
                },
                f5:function(cb){
                    //用户留存率
                    cb(null, 0);
                },
                f6:function(cb){
                    //用户活跃度
                    var sql = "select count(1) cnt,count(distinct user) c from gr_user_login_flow group by user";
                    api.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err);
                        }else{
                            cb(null, data);
                        }
                    });
                },
                final: ['f0','f1','f2','f3','f4','f6',function (cb,result) {
                    var days = [],
                        avgOrder = [],
                        avgUser = [];
                    async.eachSeries(result.f0, function (e, cb1) {
                        days.push(e.time);
                        avgOrder.push(e.avgOrder);
                        avgUser.push(e.avgUser);
                        cb1(null);
                    }, function () {
                        cb(null, {
                            days: _.each(days,function(n){return n}),
                            avgOrder: avgOrder.join(','),
                            avgUser: avgUser.join(','),
                            reOrder:result.f1,
                            frequency:result.f2,
                            avgAllOrder:result.f3.avgAllOrder,
                            avgAllUser:result.f3.avgAllUser,
                            times: _.map(result.f4,'createAt').join(','),
                            timesOrders:_.map(result.f4, 'cnt').join(','),
                            uLogins:_.map(result.f6,'cnt').join(','),
                            users:_.map(result.f6,'c').join(',')
                        })
                    })
                }]
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result.final);
                }
            });
            return q.promise;
        },
        userInfo:function(args){
            var q = Q.defer();
            var uid=args.uid || undefined,
                orderid = args.orderid || undefined,
                openid=args.openid||undefined;
            async.auto({
                f0:function(cb){
                    if(uid !=undefined){
                        cb(null, {code:0,uid:uid});
                    }else{
                        if(orderid != undefined){
                            var sql = "select a.uid from gr_final_order_group a,gr_final_order b where b.orderid='"+orderid+"' and a.groupNo=b.groupNo"
                            M.adapter.query(sql,function(err,data){
                               if(err){
                                   cb(err)
                               } else{
                                   if(!_.isEmpty(data)){
                                       cb(null,{code:0,uid:data[0].uid});
                                   } else{
                                       cb(null, {code:1,msg:"根据openid没有找到对应用户"})
                                   }

                               }
                            });
                        }else{
                            if(openid!=undefined){
                                var arg = {
                                    table:'gr_login_info',
                                    condition:"orderid="+orderid,
                                    fields:"uid"
                                };
                                api.first(arg).then(function(data){
                                    if(data){
                                        cb(null,{code:0,uid:data.uid});
                                    } else{
                                        cb(null, {code:1,msg:"根据openid没有找到对应用户"})
                                    }
                                });
                            }else{
                                cb(null, {code:1,msg:"请输入查询条件"})
                            }
                        }
                    }
                },
                f1_0:['f0',function(cb,result){
                    if(result.f0.code === 0){
                        //找到uid，根据uid查找相关内容
                        uid = result.f0.uid ;
                        var sql = "select count(1) cnt " +
                            "from gr_final_order a,gr_final_order_group b " +
                            "where a.type not in (11,12) and a.status>2000 and  a.groupNo=b.groupNo and  b.uid="+uid;
                        M.adapter.query(sql,function(err,data){
                            if(err){
                                cb(err);
                            }else{
                                cb(null, {code:0,data:data[0].cnt});
                            }
                        })
                    }else{
                        cb(null,result.f0)
                    }
                }],
                f1:['f0',function(cb,result){
                    //查找订单记录，100条
                    if(result.f0.code === 0){
                        //找到uid，根据uid查找相关内容
                        uid = result.f0.uid ;
                        var sql = "select a.* " +
                            "from gr_final_order a,gr_final_order_group b " +
                            "where a.type not in (11,12) and a.status>2000 and  a.groupNo=b.groupNo and b.uid="+uid+
                            " order by a.createAt desc " +
                            "limit 20";
                        M.adapter.query(sql,function(err,data){
                            if(err){
                                cb(err);
                            }else{
                                cb(null, {code:0,data:data});
                            }
                        })
                    }else{
                        cb(null,result.f0)
                    }
                }],
                f2_0:['f0',function(cb,result){
                    if(result.f0.code === 0){
                        //找到uid，根据uid查找相关内容
                        uid = result.f0.uid ;
                        var sql = "select count(1) cnt " +
                            "from gr_final_order a,gr_final_order_group b " +
                            "where a.type in (11,12) and a.groupNo=b.groupNo and b.uid="+uid;
                        M.adapter.query(sql,function(err,data){
                            if(err){
                                cb(err);
                            }else{
                                cb(null, {code:0,data:data[0].cnt});
                            }
                        })
                    }else{
                        cb(null,result.f0)
                    }
                }],
                f2:['f0',function(cb,result){
                    //获取退换货记录
                    if(result.f0.code === 0){
                        uid = result.f0.uid ;
                        var sql = "select a.* " +
                            "from gr_final_order a,gr_final_order_group b " +
                            "where a.type in (11,12) and a.groupNo=b.groupNo and b.uid="+uid+
                            " order by a.createAt desc "+
                            "limit 20";
                        M.adapter.query(sql,function(err,data){
                            if(err){
                                cb(err);
                            }else{
                                cb(null, {code:0,data:data});
                            }
                        })
                    }else{
                        cb(null,result.f0)
                    }
                }],
                f3:['f0',function(cb,result){
                    //获取用户数据
                    if(result.f0.code === 0){
                        uid = result.f0.uid ;
                        var arg = {
                            table:"gr_login_info",
                            id:uid
                        };
                        api.get(arg).then(function(data){
                            cb(null, {code:0,data:data});
                        }).catch(function(err){
                            cb(err);
                        });
                    }else{
                        cb(null,result.f0)
                    }
                }],
                final:['f1','f2','f3','f1_0','f2_0',function(cb,result){
                    var r = {code:0};
                    if(result.f1.code ===0){
                        r['orders']=result.f1.data;
                    }else{
                        r['orders']=[];
                    }
                    if(result.f2.code ===0){
                        r['exchanges']=result.f2.data;
                    }else{
                        r['exchanges']=[];
                    }
                    if(result.f3.code ===0){
                        r['user']=result.f3.data;
                    }else{
                        r['user']=[];
                    }
                    if(result.f1_0.code ===0){
                        r['orders_count']=result.f1_0.data;
                    }else{
                        r['orders_count']=0;
                    }
                    if(result.f2_0.code ===0){
                        r['exchanges_count']=result.f2_0.data;
                    }else{
                        r['exchanges_count']=0;
                    }
                    cb(null, r);
                }]
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result.final);
                }
            });
            return q.promise;
        },
        userLevels:function(args){
            var q = Q.defer();
            var sql = "select level,count(1) cnt from gr_login_info group by level";
            api.adapter.query(sql,function(err,data){
                if(err){
                    q.reject(err);
                }else{
                    var list = [] ;
                    var colors = ["#F38630","#E0E4CC","#69D2E7","#2A7921","#590E5B","#458383"];
                    for(var i = 0 ;i<data.length;i++){
                        list.push({label:"V"+data[i].level,value:data[i].cnt,color:colors[i]});
                    }
                    q.resolve(list);
                }
            })
            return q.promise;
        },
        test:function(args){
            var q = Q.defer() ;
            var start=args.start,
                end = args.end ;
            avgOrderAndUser(M,{start:start,end:end}).then(function(data){
                q.resolve(data);
            }).catch(function(err){
                q.reject(err);
            });
            return q.promise;
        }
    }
};
/**
 * 消费频次
 * @param M
 * @param args
 * @returns {*|d.promise|Function|promise|r.promise}
 * 消费频次
 * 计算公式：每个人的平均下单时间间隔：m,周期内的下单人数：n ；消费频次F=(m*n)/n
 *          m=((t1-start)+(t2-t1)+(t3-t1)+...(end-tn))/(n+1)=(end-start)/(n+1),这里的n表示下单次数，不包括开始和结束时间
 */
var frequency = function(M,args){
    var q = Q.defer() ;
    var start=+(args.start+"").substr(0,10),
        end = +(args.end+"").substr(0,10) ;
    async.auto({
        f0:function(cb){
            var sql = "select uid,createAt ,date_format(from_unixtime(createAt),'%Y-%m-%d') createAt1 from gr_final_order_group where createAt>"+start+" and createAt<"+end;
            M.adapter.query(sql,function(err,data){
                if(err){
                    cb(err);
                }else{
                    cb(null, data);
                }
            })
        },
        //计算平均值
        f1:['f0',function(cb,result){
            var d = result.f0;
            if(_.isEmpty(d)){
                cb(null, 0)
            }else{
                var u = _.each(_.groupBy(d,'uid'),function(e,key,list){
                    var t =  _.map(e, 'createAt') ;
                    //t.push(start);
                    //t.push(end);
                    var total = 0 ;
                    t = _.sortBy(t, function(n){
                        return n
                    });
                    for(var i = 1;i< _.size(t);i++){
                        total =total+(t[i]- t[i-1]) ;
                    }
                    list[key] = (total/ _.size(t)/3600/24).toFixed(2);
                    return list;
                });
                var frequency = _.reduce(_.map(u,function(e,key){
                        return e;
                    }),function(memo,num){
                        return memo+parseFloat(num)
                    },0)/ _.size(u);
                cb(null, frequency)
            }
        }]
    },function(err,result){
        if(err){
            q.reject(err);
        }else{
            q.resolve(result.f1)
        }
    });
    return q.promise;
};
//重复下单率
var reOrder = function(M,args){
    var q = Q.defer();
    //var start=(_.isNumber(args.start)|| _.isDate(args.start)?+(args.start+"").substr(0,10):+(Date.parse(new Date(args.start))+"").substr(0,10)),
    //    end = (_.isNumber(args.end)|| _.isDate(args.end)?+(args.end+"").substr(0,10):+(Date.parse(new Date(args.end))+"").substr(0,10)) ;
    var start=+(args.start+"").substr(0,10),
        end = +(args.end+"").substr(0,10) ;
    async.auto({
        f1:function(cb){
            var sql = "select count(aa.cnt) cnt " +
                "from (select a.uid,count(1) cnt from gr_final_order_group a,gr_final_order b where a.groupNo = b.groupNo and b.type not in (11,12) and b.status >= 2000 and a.createAt>"+start+" and a.createAt<"+end +" group by a.uid having count(1) > 2)  aa";
            M.adapter.query(sql, function (err, data) {
                if (err) {
                    cb(err);
                } else {
                    if(data[0].cnt === 0){
                        cb(null, 0)
                    }else{
                        cb(null, data[0].cnt);
                    }
                }
            })
        },
        f2:function(cb){
            //获取用户下单总人数，排除退换货订单
            var sql = "select count(aa.cnt) cnt from " +
                "(select a.uid,count(1) cnt " +
                "from gr_final_order_group a,gr_final_order b " +
                "where a.groupNo = b.groupNo and b.type not in (11,12) and b.status >= 2000 and a.createAt>"+start+" and a.createAt<"+end +" group by a.uid)  aa";
            M.adapter.query(sql, function (err, data) {
                if (err) {
                    cb(err);
                } else {
                    if(data[0].cnt === 0){
                        cb(null, 0)
                    }else{
                        cb(null, data[0].cnt);
                    }
                }
            })
        },
        final:['f1','f2',function(cb,result){
            if(result.f2 === 0){
                cb(null, 0)
            }else{
                cb(null, result.f1/result.f2*100);
            }

        }]
    },function(err,result){
        if(err){
            q.reject(err);
        }else{
            q.resolve(result.final.toFixed(2)+"%")
        }
    })
    return q.promise;
};
//累计平均订单单价和累计平均客单价
var avgOrderAndUser = function(M,args){
    var q = Q.defer();
    var start=+(args.start+"").substr(0,10),
        end = +(args.end+"").substr(0,10) ;
    async.auto({
        f1:function(cb){
            var sql = "select sum(a.finalAmount)/count(1)  cnt " +
                "from gr_final_order_group a,gr_final_order b " +
                "where a.groupNo = b.groupNo and b.status >= 2000 and a.createAt>"+start+" and a.createAt<"+end;
            //b.type not in (11,12) and
            M.adapter.query(sql, function (err, data) {
                if (err) {
                    cb(err);
                } else {
                    if(data[0].cnt === 0){
                        cb(null, 0)
                    }else{
                        cb(null, data[0].cnt);
                    }
                }
            })
        },
        f2:function(cb){
            //获取用户下单总人数，排除退换货订单
            var sql = "select sum(a.finalAmount)/count(distinct a.uid)  cnt ,count(1) " +
                "from gr_final_order_group a,gr_final_order b " +
                "where a.groupNo = b.groupNo  and b.status >= 2000 and a.createAt>"+start+" and a.createAt<"+end +
                " ";
            //and b.type not in (11,12)
            M.adapter.query(sql, function (err, data) {
                if (err) {
                    cb(err);
                } else {
                    if(data[0].cnt === 0){
                        cb(null, 0)
                    }else{
                        cb(null, data[0].cnt);
                    }
                }
            })
        },
        final:['f1','f2',function(cb,result){
            cb(null,{avgAllOrder:result.f1,avgAllUser:result.f2});
        }]
    },function(err,result){
        if(err){
            q.reject(err);
        }else{
            q.resolve(result.final)
        }
    });
    return q.promise;
};