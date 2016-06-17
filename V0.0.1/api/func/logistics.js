var Q = require('q');
var _ = require('underscore');
var async = require('async');
var E = require('../../../error');
var logger = require('../../../logger.js');
var AV = require('leanengine');
var coordtransform=require('coordinate-distance');
module.exports = function(M,C){
    var ec = require('../../ec')(C);
    var erp = require('../../erp')(C);
    M.logistics = {
        syncGps:function(args){
            var deferred = Q.defer();
            args.createAt = Math.floor(_.now()/1000);
            var arg = {table:'lg_location_record',row:args};
            M.create(arg).then(function(data){
                deferred.resolve(data);
            }).catch(function(err){
                deferred.reject(err);
            });
            return deferred.promise;
        },
        login:function(args){
            var deferred = Q.defer();

            async.waterfall([
                //1.通过登录名，获取用户信息
                function(callback){
                    var arg = {table:'lg_courier',condition:" status = 1 and  phone = '" + args.phone + "'"};
                    M.first(arg).then(function(data){
                        callback(null,data)
                    }).catch(function(err){
                        callback(err);
                    });
                },
                function(argA,callback){
                    //未查找到用户名对应的用户
                    if(!_.isObject(argA)){
                        callback(E.User.NOT_EXISTS);
                        return;
                    }
                    if(_.isEmpty(argA)){
                        callback(E.User.NOT_EXISTS);
                        return;
                    }

                    //TODO:添加密码加密的过程
                    if(args.password == argA['password']){
                        callback(null,argA);
                        return;
                    }
                    callback(E.User.PASSWORD_ERROR);
                },function(argB,callback){
                    //TODO:添加一些登录后的操作;如修改登录时间，记录登录次数，记录登录等
                    var _now = Math.floor(_.now()/1000);
                    M.update({table:'lg_courier',condition:"id = "+argB.id,row:{lastlogintime:_now}})
                        .then(function(data){
                    }).catch(function(e){
                        console.log(e);
                    });
                    //添加登录记录流水
                    M.create({table:'lg_courier_login_flow',row:{
                        user:argB.name,
                        device:args.device||'android',
                        version:args.version || '3.0',
                        createAt:_now,
                        updateAt:_now
                    }}).catch(function(e){
                        console.log(e);
                    });
                    callback(null,argB);
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
        taskHome:function(args){
            var uid = args.uid ;
            var deferred = Q.defer();
            var sql =  "select "+
                "count(case when a.status in (7000,8000) and type not in (11,12) then a.code end) zp,"+
                //"count(case when a.status = 9000 and date_format(from_unixtime(a.finish_time),'%Y-%m-%d') = '2016-02-28' then a.code  end) ywc,"+
                "count(case when a.status in (9000,9999) and a.is_account=0 then a.code  end) ywc,"+
                "count(case when a.status in (2500,3000,4000,7000,8000) and a.type = 11 then a.code end) th,"+
                "count(case when a.status in (2500,3000,4000,7000,8000) and a.type = 12 then a.code end) hh,"+
                "count(case when a.status = 6900  then a.code end) yy, "+
                "count(case when a.status = 9004  then a.code end) js "+
                "from lg_mission a where delflag=0 and send_uid = "+uid;
            //sql = 'select count(1) from lg_mission'
            M.adapter.query(sql,function(err,results){
                if(err){
                    deferred.reject(E.System.SQL_INJECTION);
                }else{
                    deferred.resolve(results);
                }
            });
            return deferred.promise;
        },
        hasFinishedList:function(args){
            var uid = args.uid ;
            var deferred = Q.defer();
            var sql =  "select "+
                "count(*) count,"+
                    //"count(case when a.status = 9000 and date_format(from_unixtime(a.finish_time),'%Y-%m-%d') = '2016-02-28' then a.code  end) ywc,"+
                "sum(case when pay_way = 'DAOPAY' then final_amount end) final_amount "+
                "FROM lg_mission where delflag=0 and send_uid="+uid+
                " and is_account=0 and (status in (9000,9999))";
            //sql = 'select count(1) from lg_mission'
            M.adapter.query(sql,function(err,results){
                if(err){
                    deferred.reject(E.System.SQL_INJECTION);
                }else{
                    var sql_ = " select * from lg_mission where delflag=0 and send_uid="+uid+
                        " and is_account=0 and (status in (9000,9999))";
                    M.adapter.query(sql_,function(err,results_){
                        if(err){
                            deferred.reject(E.System.SQL_INJECTION);
                        }else{
                            deferred.resolve({count:results[0].count, sum:results[0].final_amount,list:results_});
                        }
                    });
                }
            });
            return deferred.promise;
        },
        foo1:function(args){
            return rest.invoke('/rest/test',{});
        },
        //领单接口
        newMission:function(args){
            var deferred = Q.defer();
            var now = Math.floor(_.now()/1000) ;
            var uid = args.uid,
                orderid=args.orderid,
                ordertype=args.ordertype,
                lat=args.lat,
                long=args.long;
            async.auto({
                f0_21:function(callback){
                    var where = " id = '"+uid+"' AND delflag = 0";
                    M.find({table:"lg_courier",condition:where}).then(function(d){
                        if(d.length > 0){
                            callback(null,d);
                        }else{
                            callback(E.Logistics.NO_SUCH_COURIER);
                        }
                    }).catch(function(err){
                        callback(err);
                    });
                },
                f0_2:['f0_21',function(cb,results){
                    //根据final_order中的areaId获取areaName
                    var sql = "select name,otherid from gr_lbs_project_areainfo where delflag=0";
                    erp.adapter.query(sql,function(err,data){
                        if(err){
                            cb(E.Logistics.LBS_EORROR);
                        }else{
                            cb(null, data);
                        }
                    })
                }],
                f0:['f0_2',function(callback,results){
                    sql="select a.orderid,a.type,a.amount,a.receivableAmount finalAmount"+
                        ",b.payTime,a.approvaldate,a.printTime,a.warehouseendtime,a.expresstype,a.expresscost,a.deliveryTime"+
                        ",a.status,a.createAt,a.areaId,b.toName,b.toPhone,b.toStreet,b.payway,b.remark,d.lng,d.lat " +
                        "from gr_final_order a,gr_final_order_group b,gr_warehouse d " +
                        "where a.groupNo=b.groupNo and a.orderid = '"+orderid+"'";
                    if(ordertype!=9){
                        sql=sql+" and a.shopId = d.id"
                    }

                    ec.adapter.query(sql,function(err,d){
                        if(err){
                            callback(err);
                        }else{
                            if(d.length==0){
                                callback(E.Logistics.NO_SUCH_ORDER);
                            }else{
                                o=d[0];
                                var areas = _.groupBy(results.f0_2,'otherid') ;
                                if(!_.isUndefined(areas[o.areaId])){
                                    o['areaName'] = areas[o.areaId][0].name ;
                                }else{
                                    o['areaName'] = "";
                                }

                                switch (parseInt(o.status)){
                                    case 3000:
                                        callback(null, o);
                                        break;
                                    case 4000:
                                        callback(null, o);
                                        break;
                                    case 7000:
                                        callback(null, o);
                                        break;
                                    default :
                                        callback(E.Logistics.EC_STATUS_NOT_ALLOW_ACCEPT);
                                        break;
                                }
                            }
                        }
                    });
                }],
                f0_1:["f0",function(callback,results){
                    localtion = {coord1:{lat:parseFloat(results.f0.lat),long:parseFloat(results.f0.lng)},coord2:{lat:parseFloat(lat),long:parseFloat(long)}};
                    dis = coordtransform.wgs84_baidu(localtion.coord2,localtion.coord1);
                    if(parseInt(dis)<50000){
                        callback(null,{});
                    }else{
                        callback(null,{});
                    }

                }],
                //此处不要写死，将来必改
                f1:function(callback,results){
                    M.first({table:"lg_mission",condition:"code = '"+orderid+"'"}).then(function(d){
                        if(d.status==undefined){
                            callback(null,0);
                        }else{
                            switch (parseInt(d.status)) {
                                case 2000:
                                    callback(null, 2000);
                                    break;
                                case 6900:
                                    callback(null, 6900);
                                    break;
                                case 7000:
                                    callback(null,7000);
                                    break;
                                default :
                                    callback(null,0);
                                    break;
                            }
                        }
                    }).catch(function(err){
                        callback(err);
                    })
                },
                f2:["f0","f1",function(callback,results){
                    ecstatus = results.f0.status;
                    missionstatus = results.f1;
                    order = results.f0;
                    user = results.f0_21;
                    var data ={
                        to_name:(order.toName).replace(/'|;/g,' ')||0,
                        to_tel:order.toPhone||0,
                        to_address:(order.toStreet).replace(/'|;/g,' ')||0,
                        code:order.orderid||0,
                        pay_way:(order.payway==="微信支付")?"WXPAY":(order.payway == "货到付款")?"DAOPAY":(order.payway == "余额支付"?"YUEPAY":"OTHERPAY"),
                        type:order.type||0,
                        send_uid:uid,
                        src_sys:"GR100",
                        final_amount:order.finalAmount||0,
                        area_name:order.areaName||0,
                        createAt:now,
                        updateAt:now,
                        src_remark:(_.isEmpty(order.remark)?"/":order.remark).replace(/'|;/g,' ')||0,
                        src_code:order.orderid,
                        get_time:now,
                        status:7000,
                        payTime:order.payTime||0,
                        approvaldate:order.approvaldate||0,
                        printTime:order.printTime||0,
                        warehouseendtime:order.warehouseendtime||0,
                        expresstype:order.expresstype||0,
                        expresscost:order.expresscost||0,
                        deliveryTime:order.deliveryTime||0
                    };

                    switch (ecstatus){
                        case 3000:
                            switch (missionstatus){
                                case 0:
                                    var arg = {table:'lg_mission',row:data};
                                    M.create(arg).then(function(d){
                                        ec.update({table:"gr_final_order",condition:"orderid = '"+orderid+"' AND status = 3000 AND type = 11 ",row:{status:7000,scantime:now,sendUser:user[0]['name']}}).then(function(d){
                                            callback(null,{status:1});
                                        }).catch(function(err){
                                            callback(err);
                                        });
                                    }).catch(function(err){
                                        callback(err);
                                    });
                                    break;
                                default :
                                    callback(E.Logistics.LG_MISSION_EXIST);
                                    break;
                            }
                            break;
                        case 4000:
                            switch (missionstatus){
                                case 0:
                                    var arg = {table:'lg_mission',row:data};
                                    M.create(arg).then(function(d){
                                        ec.update({table:"gr_final_order",condition:"orderid = '"+orderid+"' AND status = 4000 ",row:{status:7000,scantime:now,sendUser:user[0]['name']}}).then(function(d){
                                            callback(null,{status:1});
                                        }).catch(function(err){
                                            callback(err);
                                        });
                                    }).catch(function(err){
                                        console.log(err);
                                        callback(err);
                                    });

                                    break;
                                case 2000:
                                    var data1 = {
                                        status : 7000,
                                        get_time : now,
                                        updateAt : now,
                                        send_uid : uid
                                    };
                                    M.update({table:"lg_mission",condition:"code = '"+orderid+"' AND status = 2000",row:data1}).then(function(d){
                                        ec.update({table:"gr_final_order",condition:"orderid = '"+orderid+"'",row:{status:7000,scantime:now,sendUser:user[0]['name']}}).then(function(d){
                                            callback(null,{status:2,before_status:2000});
                                        }).catch(function(err){
                                            callback(err);
                                        })
                                    }).catch(function(err){
                                        callback(err);
                                    });
                                    break;
                                default :
                                    callback(E.Logistics.LG_MISSION_EXIST);
                                    break;
                            }
                            break;
                        case 7000:
                            switch (missionstatus){
                                case 6900:
                                    var data2 ={
                                        send_uid : uid,
                                        get_time : now,
                                        updateAt : now,
                                        status : 7000
                                    };
                                    M.update({table:"lg_mission",condition:"code = '"+orderid+"' AND status = 6900",row:data2}).then(function(d){
                                        ec.update({table:"gr_final_order",condition:"orderid = '"+orderid+"' AND status = 7000",row:{sendUser : user[0]['name'],scantime : now}}).then(function(d1){
                                            callback(null,{status:2,before_status:6900});
                                        }).catch(function(err1){
                                            callback(err1);
                                        });
                                    }).catch(function(err){
                                        callback(err);
                                    });
                                    break;
                                default:
                                    callback(E.Logistics.LG_STATUS_NOT_ALLOW_ACCEPT);
                                    break;
                            }
                            break;
                        default :
                            callback(E.Logistics.EC_STATUS_NOT_ALLOW_ACCEPT);
                            break;
                    }
                }],
                f3:["f2",function(callback,results){
                    var action = "";
                    switch (results.f2.status){
                        case 2:
                            if(results.f2.before_status == 6900){
                                action = "RESTART";
                            }else{
                                action = "TAKE";
                            }
                            var flowrow = {before_status:results.f2.before_status,after_status:7000,uid:uid,action:action,content:"/",createAt:now,updateAt:now,mission_id:orderid}
                            var flow = {table:"lg_mission_flow",row:flowrow}
                            M.create(flow).then(function(d){
                                callback(null,{})
                            }).catch(function(err){
                                callback(err);
                            });
                            break;
                        case 1:
                            var flowrow = {before_status:0,after_status:7000,uid:uid,action:"TAKE",content:"/",createAt:now,updateAt:now,mission_id:orderid}
                            var flow = {table:"lg_mission_flow",row:flowrow}
                            M.create(flow).then(function(d){
                                callback(null,{})
                            }).catch(function(err){
                                callback(err);
                            })
                            break;
                    }
                }],
                f5:['f2',function(callback,result){
                    var action = "";
                    if(result.f2.status === 1){
                        if(result.f2.before_status == 6900){
                            action = "RESTART";
                        }else{
                            action = "TAKE";
                        }
                        updateOrderFlow(M, {uid:uid,code:orderid,action:action}).then(function(data){
                            callback(null,{});
                        }).catch(function(err){
                            callback(err);
                        });
                    }else{
                        callback(null,{});
                    }
                }]
            },function(err,results){
                   if(err){
                       deferred.reject(err);
                   }else{
                       deferred.resolve(results);
                   }
                });
            return deferred.promise;
        },

        updateMissionAndFlow:function(args){
            var deferred = Q.defer();
            var now = Math.floor(_.now()/1000);
            async.waterfall([
                function(cb){
                    //根据code和send_uid查询出记录
                    var arg = {
                        table:'lg_mission',
                        condition:"send_uid = '"+args.uid+"' and code='"+args.code+"'"
                    };
                    M.first(arg).then(function(data){
                        if(data.id){
                            cb(null, data);
                        }else{
                            cb({code:-1});
                        }
                    }).catch(function(err){
                        cb(err);
                    })
                },
                function(mission,cb){
                    //向mission_flow表插入流水
                    var arg = {
                        table:'lg_mission_flow',
                        row:{
                            uid:args.uid,
                            mission_id:args.code,
                            action:args.action,
                            content:(args.status==9004 ? _.isEmpty(args.content)?'/':args.content:_.isEmpty(mission.remark)?'/':mission.remark),//拒收时添加
                            before_status:mission.status,
                            after_status:args.status,
                            createAt:Math.floor(_.now()/1000),
                            updateAt: Math.floor(_.now()/1000)
                        }
                    };
                    M.create(arg).then(function(data){
                        cb(null,mission);
                    }).catch(function(err){
                        cb(E.Object.CREATE_ERROR);
                    });
                },
                function(mission,cb){
                    //更新order的流水
                    updateOrderFlow(M, {uid:args.uid,code:args.code,action:args.action,content:(args.status==9004 ? _.isEmpty(args.content)?'/':args.content:_.isEmpty(mission.remark)?'/':mission.remark)}).then(function(data){
                        cb(null, mission);
                    }).catch(function(err){
                        cb(err);
                    });
                },
                function(mission,cb){
                    var arg = {
                        table:'lg_mission',
                        condition:" send_uid = "+args.uid+" and code='"+args.code+"'",
                        row:{
                            status:args.status,
                            start_time:(args.status==7000 ? Math.floor(_.now()/1000):mission.start_time), //开始派送或者重新派送试添加
                            finish_time:(args.status==9000 ? Math.floor(_.now()/1000):mission.finish_time),//完成派送时添加
                            remark:(args.status==9004 ? args.content:mission.remark),//拒收时添加
                            book_time:(args.status==6900 ? args.book_time:mission.book_time),//预约时添加
                            updateAt: Math.floor(_.now()/1000)
                        }
                    };
                    M.update(arg).then(function(data){
                        cb(null,data);
                    }).catch(function(err){
                        cb(E.Object.UPDATE_ERROR);
                    });
                },
                function(mission,cb){
                    //更新order表：只有status=7000，9000，9004（拒收）的时候才更新
                    if(_.indexOf([7000,8000,9000],args.status)!=-1){
                        //更新order

                        var arg = {
                            table:"gr_final_order",
                            condition:" orderid = '"+args.code+"'",
                            row:{
                                status:args.status,
                                taketime:args.status==9000?now:0
                                //updateAt: _.now()
                            }
                        };
                        ec.update(arg).then(function(data){
                            cb(null, {code:0});
                        }).catch(function(err){
                            cb(E.Object.UPDATE_ERROR);
                        })
                    }else{
                        //不更新order
                        cb(null, {code:0});
                    }
                },
            ],function(err,results){
                if(err){
                    deferred.reject(err);
                }else{
                    deferred.resolve(results);
                }

            });
            return deferred.promise;
        },
        accountNow:function(args){
            var deferred = Q.defer();
            async.waterfall([
                function(cb){
                    var arg = {
                        table:'lg_mission',
                        condition:" send_uid = '"+args.uid+"' and status in (9000,9999) and is_account=0",
                        fields:" send_uid as uid,id as mission_id"
                    };
                    M.find(arg).then(function(data){
                        var _now = Math.floor(_.now()/1000);
                        data.forEach(function(item){
                            item.updateAt = item.createAt = _now;
                        });
                        cb(null, data);
                    }).catch(function(err){
                        cb(null, []);
                    })
                },
                function(missions,cb){
                    var arg = {
                        table:'lg_account_flow',
                        condition:'',
                        row:missions
                    };
                    M.create(arg).then(function(data){
                        cb(null, data);
                    }).catch(function(err){
                        cb(E.Object.CREATE_ERROR);
                    })
                },
                function(newM,cb){
                    var arg = {
                        table:'lg_mission',
                        condition:" delflag=0 and send_uid = '"+args.uid+"' and status in (9000,9999) and is_account=0",
                        row:{is_account:1}
                    }
                    M.update(arg).then(function(data){
                        cb(null, {code:0});
                    }).catch(function(err){
                        cb(E.Object.UPDATE_ERROR);
                    })
                }
            ],function(err,results){
                if(err){
                    deferred.reject(err);
                }else{
                    deferred.resolve(results);
                }
            });
            return deferred.promise;
        },
        //查找订单接口
        findOrder:function(args){
            var deffer = Q.defer();
            async.auto({
                f0_1:function(cb){
                    //根据final_order中的areaId获取areaName
                    var sql = "select name,otherid from gr_lbs_project_areainfo where delflag=0";
                    erp.adapter.query(sql,function(err,data){
                        if(err){
                            cb(E.Logistics.LBS_EORROR);
                        }else{
                            cb(null, data);
                        }
                    })
                },
                f0:function(callback,results){
                    sql = " status = 6900 AND code like '%"+args.orderid+"%'";
                    M.find({table:"lg_mission",condition:sql}).then(function(d){
                        if(d.length > 0){
                            callback(null,{value:1,data:d});
                        }else{
                            callback(null,{value:0});
                        }
                    });
                },
                f1: ["f0",function(callback,results){
                    var sql = "select a.orderid,a.type,a.amount,a.finalAmount,a.expresstype,a.deliveryTime," +
                        "a.status ,a.createAt,a.areaId,b.toName,b.toPhone,b.toStreet,b.payway " +
                        "from gr_final_order a,gr_final_order_group b " +
                        "where a.groupNo=b.groupNo and " +
                        "((a.orderid like '%"+args.orderid+"%' AND a.status = 4000 AND a.q_flag = 0) " +
                        "OR (a.orderid like '%"+args.orderid+"%' and a.type = 11 and a.status = 3000)";
                    if(results.f0.value == 1){
                        for(x in results.f0.data){
                            sql = sql + " OR (a.orderid like '%"+results.f0.data[x].code+"%' and a.status = 7000)";
                        }
                    }
                    sql = sql + ")";
                    console.log(sql);
                    ec.adapter.query(sql,function(err,data){
                        if(err){
                            callback(err);
                        }else{
                            callback(null,data);
                        }
                    });
                }],
                f2:['f0_1','f1',function(cb,results){
                    //cb(null, results.f1)
                    if(_.isEmpty(results.f1)){
                        cb(E.Logistics.NO_SUCH_ORDER);
                    }else{
                        var areas = _.groupBy(results.f0_1,'otherid') ;
                        var list = _.each(results.f1, function(e,k){
                            e['areaName'] = areas[e.areaId][0].name||"NO";
                            return e ;
                        })
                        cb(null, list);
                    }
                }]
            },function(err,results){
                if(err){
                    deffer.reject(err);
                }else{
                    deffer.resolve(results.f2);
                }
            });
            return deffer.promise;
        },
        //查找甩单接口
        getTransferOrder:function(args){
            var deffer = Q.defer();
            async.auto({
                f0_1:function(cb){
                    //根据final_order中的areaId获取areaName
                    var sql = "select name,otherid from gr_lbs_project_areainfo where delflag=0";
                    erp.adapter.query(sql,function(err,data){
                        if(err){
                            cb(E.Logistics.LBS_EORROR);
                        }else{
                            cb(null, data);
                        }
                    })
                },
                f0:function(callback,results){
                    sql = " status = 6900 AND type = 9 ";
                    M.find({table:"lg_mission",condition:sql}).then(function(d){
                        if(d.length > 0){
                            callback(null,{value:1,data:d});
                        }else{
                            callback(null,{value:0});
                        }
                    });
                },
                f1: ["f0",function(callback,results){
                    var sql = "select a.orderid,a.type,a.amount,a.finalAmount,a.expresstype,a.deliveryTime," +
                        "a.status ,a.createAt,a.areaId,b.toName,b.toPhone,b.toStreet,b.payway " +
                        "from gr_final_order a,gr_final_order_group b " +
                        "where a.groupNo=b.groupNo ";

                    console.log(args.uphone);
                    if(args.uphone!=0){
                        sql = sql + "and b.toPhone like '%"+args.uphone+"%' ";
                    }
                    sql = sql + " and ((a.type = 9 AND a.status = 4000 AND a.q_flag = 0) ";
                    if(results.f0.value == 1){
                        for(x in results.f0.data){
                            sql = sql + " OR (a.orderid like '%"+results.f0.data[x].code+"%' and a.status = 7000)";
                        }
                    }
                    sql = sql + ")";
                    console.log(sql);
                    ec.adapter.query(sql,function(err,data){
                        if(err){
                            callback(err);
                        }else{
                            callback(null,data);
                        }
                    });
                }],
                f2:['f0_1','f1',function(cb,results){
                    //cb(null, results.f1)
                    if(_.isEmpty(results.f1)){
                        cb(E.Logistics.NO_SUCH_ORDER);
                    }else{
                        var areas = _.groupBy(results.f0_1,'otherid') ;
                        var list = _.each(results.f1, function(e,k){
                            if(!_.isUndefined(areas[e.areaId])){
                                e['areaName'] = areas[e.areaId][0].name||"NO";
                            }else{
                                e['areaName'] = "";
                            }
                            return e ;
                        })
                        cb(null, list);
                    }
                }]
            },function(err,results){
                if(err){
                    deffer.reject(err);
                }else{
                    deffer.resolve(results.f2);
                }
            });
            return deffer.promise;
        },
        //快递员扫码领取快件接口
        getExpress1:function(args){
            var now = Math.floor(_.now()/1000) ;
            var deffer = Q.defer();
            async.auto({
                f0:function(callback,results){
                    where = " expressno = '"+args.expressno+"' AND type = 1 AND uid = "+args.uid+" ";
                    M.find({table:"lg_expressmission",condition:where}).then(function(d){
                        if(d.length > 0){
                            callback(null,{value:1,data:d});
                        }else{
                            callback(null,{value:0});
                        }
                    });
                },
                f1: ["f0",function(callback,results){
                    if(results.f0.value == 0){
                        var arg = {
                            table:'lg_expressmission',
                            row:{
                                uid:args.uid,
                                area:args.area,
                                scantime:now,
                                expressno:args.expressno,
                                type:args.type||'1',
                                createAt:now,
                                updateAt:now
                            }
                        }
                        M.create(arg).then(function(data){
                            callback(null,{msg:'扫码领取快件成功!'});
                        });
                    }else{
                        var arg = {
                            table:'lg_expressmission',
                            row:{
                                finishtime:now
                            },
                            condition:" uid = "+args.uid+" and expressno = '"+args.expressno + "' and type=1"
                        }
                        M.update(arg).then(function(data){
                            callback(null,{msg:'快件派送成功!'});
                        });
                    }
                }]
            },function(err,results){
                if(err){
                    deffer.reject(err);
                }else{
                    deffer.resolve(results.f1);
                }
            });
            return deffer.promise;
        },
        //站长扫码领取快件接口
        getExpress2:function(args){
            var deffer = Q.defer();
            var now = Math.floor(_.now()/1000) ;
            async.auto({
                f0:function(callback,results){
                    where = " expressno = '"+args.expressno+"' AND type = 2 AND uid = "+args.uid+" ";
                    M.find({table:"lg_expressmission",condition:where}).then(function(d){
                        if(d.length > 0){
                            callback(null,{value:1,data:d});
                        }else{
                            callback(null,{value:0});
                        }
                    });
                },
                f1: ["f0",function(callback,results){
                    if(results.f0.value == 0){
                        var arg = {
                            table:'lg_expressmission',
                            row:{
                                uid:args.uid,
                                area:args.area,
                                scantime:now,
                                expressno:args.expressno,
                                type:args.type||'2',
                                createAt:now,
                                updateAt:now
                            }
                        }
                        M.create(arg).then(function(data){
                            callback(null,{msg:'扫码领取快件成功!'});
                        });
                    }else{
                        M.clear({"table":"lg_expressmission","condition":" type = 1 and expressno ='"+args.expressno+"' "})
                        callback(null,{msg:'快件回站成功，再次派送需重新扫码!'});
                    }
                }]
            },function(err,results){
                if(err){
                    deffer.reject(err);
                }else{
                    deffer.resolve(results.f1);
                }
            });
            return deffer.promise;
        },
        //营销首页数据展示
        marketTypeList:function(args){
            var deffer = Q.defer();
            var arg = {
                table:"gr_market",
                condition:' status=1',
                sort:' ordnum+',
                fields:' id,title,gjz'
            };
            ec.find(arg).then(function(d){
                deffer.resolve(d);
            }).catch(function(err){
                deffer.reject(null, [])
            });
            return deffer.promise;
        },
        //根据分类id获取商品列表
        marketProList1:function(args){
            var deffer = Q.defer();
            var marketType = parseInt(args.marketType) || "";
            var search_name = args.name || "";
            async.waterfall([
                function(cb){
                    var sql = " delflag=0 and productType=2 " ;
                    if(parseInt(marketType) != 0 && marketType!=""){
                        sql = sql + " and marketType="+marketType ;
                    }
                    if(search_name !=""){
                        sql = sql+ " and name like '%" + search_name + "%'";
                    }
                    var arg = {
                        table:"gr_product",
                        condition:sql,
                        fields:" id,name,intro,marketType,productType,minPrice"
                    }
                    ec.find(arg).then(function(data){
                        cb(null, data);
                    }).catch(function(err){
                        cb(null,[]);
                    });
                },
                function(pro,cb){
                    if(pro.length>1){
                        async.eachSeries(pro, function(eachP,cb1){
                            var arg = {
                                table:"gr_product_spec",
                                condition:" delflag=0 and pid = "+eachP.id,
                                fields:" id,name,grprice"
                            };
                            ec.find(arg).then(function(data){
                                eachP['spec'] = data ;
                                cb1(null, eachP);
                            }).catch(function(err){
                                cb1(null, []);
                            });
                        },function(){
                            cb(null, pro)
                        })
                    }
                }
            ],function(err,result){
                if(err){
                    deffer.reject(err);
                }else{
                    deffer.resolve(result);
                }
            })
            return deffer.promise;
        },
        marketProList:function(args){
            var deffer = Q.defer();
            var marketType = parseInt(args.marketType) || "";
            var search_name = args.name || "";
            async.waterfall([
                function(cb){
                    var sql = "SELECT a.id,a.name,a.intro,a.marketType,a.productType,a.minPrice,b.id psid,b.name specname,b.grprice,b.packageprice "+
                        " FROM gr_product a,gr_product_spec b"+
                        " where a.id = b.pid"+
                        " and a.status = 1 and b.status = 1"+
                        " and a.productType=2" ;

                    if(parseInt(marketType) != 0 && marketType!="" && parseInt(marketType) != -1){
                        sql = sql + " and a.marketType="+marketType ;
                    }
                    if(search_name !="" && search_name!='0'){
                        sql = sql+ " and a.name like '%" + search_name + "%'";
                    }
                    sql = sql + " order by a.name" ;
                    ec.adapter.query(sql,function(err,result){
                        if(err){
                            cb(E.System.SQL_INJECTION)
                        }else{
                            cb(null, result)
                        }
                    });
                },
                function(pro,cb){
                    if(pro.length>=1){
                        var product = [] ;
                        var flag = 0 ;
                        async.eachSeries(pro, function(eachP,cb1){
                            if(product.length>0){
                                flag = 0 ;
                                async.eachSeries(product, function(epro,cb2){
                                    if(epro.id == eachP.id){
                                        epro.spec.push(
                                            {
                                                id:eachP.psid,
                                                name:eachP.specname,
                                                grprice:eachP.grprice,
                                                packageprice:eachP.packageprice
                                            }
                                        );
                                        flag++ ;
                                    }
                                    cb2(null);
                                },function(){
                                    if(flag === 0){
                                        var newPro = {};
                                        newPro['id'] = eachP.id ;
                                        newPro['name'] = eachP.name ;
                                        newPro['intro'] = eachP.intro ;
                                        newPro['marketType'] = eachP.marketType ;
                                        newPro['productType'] = eachP.productType ;
                                        newPro['minPrice'] = eachP.minPrice ;
                                        newPro['spec'] = [] ;
                                        newPro.spec.push(
                                            {
                                                id:eachP.psid,
                                                minPrice:eachP.minPrice,
                                                name:eachP.specname,
                                                grprice:eachP.grprice,
                                                packageprice:eachP.packageprice
                                            }
                                        )
                                        product.push(newPro);
                                    }
                                    cb1(null, product);
                                });
                            }else{
                                var newPro = {};
                                newPro['id'] = eachP.id ;
                                newPro['name'] = eachP.name ;
                                newPro['intro'] = eachP.intro ;
                                newPro['marketType'] = eachP.marketType ;
                                newPro['productType'] = eachP.productType ;
                                newPro['minPrice'] = eachP.minPrice ;
                                newPro['spec'] = [] ;
                                newPro.spec.push(
                                    {
                                        id:eachP.psid,
                                        name:eachP.specname,
                                        grprice:eachP.grprice,
                                        packageprice:eachP.packageprice
                                    }
                                )
                                product.push(newPro);
                                cb1(null, product);
                            }
                        },function(){
                            cb(null, product)
                        })
                    }else{
                        cb(null, [])
                    }
                }
            ],function(err,result){
                if(err){
                    deffer.reject(err);
                }else{
                    deffer.resolve(result);
                }
            })
            return deffer.promise;
        },
        //获取购物车数据
        getCourierCart:function(args){
            var deffer = Q.defer();
            var uid = args.uid ;
            async.waterfall([
                function(cb){
                    var arg = {
                        table:"lg_courier_cart",
                        condition:" delflag=0 and uid='"+uid+"'",
                        fields:"id,pid,psid,number"
                    };
                    M.find(arg).then(function(data){
                        cb(null, data);
                    }).catch(function(err){
                        cb(null, []);
                    });
                },
                function(pro,cb){
                    if(pro.length>=1){
                        async.eachSeries(pro, function(eachP,cb1){
                            var sql = "SELECT a.id,a.name pname,a.intro,b.name specname,b.id,b.grprice,b.packageprice,b.inventory "+
                                        "FROM gr_product a,gr_product_spec b "+
                                        "where a.id = b.pid "+
                                        " and a.id="+eachP.pid+
                                        " and b.id="+eachP.psid;

                            ec.adapter.query(sql,function(err,result){
                                if(err){
                                    cb1(null, err)
                                }else{
                                    eachP["info"] = (result[0])  ;
                                    cb1(null, pro);
                                }
                            })
                        },function(){
                            cb(null, pro)
                        })
                    }else{
                        cb(null,[]);
                    }
                }
            ],function(err,result){
                if(err){
                    deffer.reject(err);
                }else{
                    deffer.resolve(result);
                }
            })
            return deffer.promise;
        },
        //批量更新购物车
        updateCourierCart:function(args){
            var deffer = Q.defer();
            var uid = args.uid ;
            var sql = "UPDATE lg_courier_cart"+
                " SET number = (CASE id";
            var row = args.row ;
            for(var i in args.row){
                sql = sql + " WHEN "+row[i].id+" THEN "+row[i].number ;
            }
            sql = sql + " end) WHERE uid='"+uid+"'" ;
            M.adapter.query(sql,function(err,result){
                if(err){
                    deffer.reject(E.System.SQL_INJECTION);
                }else{
                    deffer.resolve(result);
                }
            });
            return deffer.promise;
        },
        test:function(args){
            var q = Q.defer() ;
            var ss = coordtransform.wgs84_baidu({lat:32.36990243001775,long:119.4647228411208},{lat:32.379203,long:119.480749})
            q.resolve(ss);
            /*updateOrderFlow(M,{uid:args.uid,code:args.code,action:args.action}).then(function(data){
                q.resolve(data);
            }).catch(function(err){
                q.reject(err);
            });*/
            return q.promise;
        }

    };
    return M;
};
//处理action
var actionFilter = function(action){
    var actionList = {
        "TAKE":"扫码领件",
        "FINISH":"完成派送",
        "REJECT":"确认用户拒收",
        "BOOK":"确认用户预约时间",
        "RESTART":"重新派送",
        "OTHER":"其他操作"
    };
    return actionList[action] ;
};
//更新AV中order表的状态
var updateAVOrderStatus = function(orderid,status){
    var q = Q.defer() ;
    var Order = AV.Object.extend('Order');
    async.waterfall([
        function(cb){
            //首先判断是否有重单
            var query = new AV.Query(Order);
            query.equalTo('orderid',orderid);
            query.find().then(function(data){
                if(data.length === 0){
                    cb({code:-1,msg:'没找到任何数据'})
                }else if(data.length === 0){
                    cb(null, {code:1,order:data});
                }else{
                    var list = [] ;
                    async.eachSeries(data,function(e,cb1){
                        if(e.get('status')>=2500 && _.isEmpty(e.get('areaId')) && e.get('syncStatus')==1){
                            //需要清理
                            //e.set({uid:"null",syncStatus:0,orderid: orderid+"-C"});
                            e.set('uid',"null");
                            e.set('syncStatus',0);
                            e.set('orderid',orderid+"-C");
                            e.save().then(function(d){
                                cb1(null);
                            }).catch(function(){
                                cb1(null);
                            });
                        }else{
                            list.push(e);
                            cb1(null);
                        }
                    },function(){
                        cb(null, {code:2,order:list});
                    });
                }
            });
        },
        function(o,cb){
            var orders = o.order ;
            async.eachSeries(orders,function(e,cb1){
                e.set("status",status);
                e.save().then(function(){
                    cb1(null);
                })
            },function(){
                cb(null, {code:0})
            })
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
var updateOrderFlow = function(M,key){
    var q = Q.defer() ;
    var uid = key.uid,
        code = key.code,
        action=key.action,
        now = Math.floor(_.now()/1000);
    var content = actionFilter(action)+(_.isEmpty(key.content)?'':"("+key.content+")") ;
    async.auto({
        f0:function(cb){
            var arg = {
                table:"lg_courier",
                id:uid
            };
            M.get(arg).then(function(data){
                cb(null, data);
            }).catch(function(err){
                cb(err);
            });
        },
        f1:['f0',function(cb,result){
            console.log(result.f0);
            var arg = {
                table:"gr_operate_log",
                row:{
                    type : "订单",//自定义字段
                    uid : uid,//用户id
                    uname : result.f0.name,//快递员姓名
                    remark : "【"+result.f0.name+" "+result.f0.phone+"】 "+content,//文字描述
                    createdate : now,
                    createAt:now ,
                    updateAt:now,
                    dataId : code
                }
            };
            ec.create(arg).then(function(data){
                cb(null, {errno:0})
            }).catch(function(err){
                cb(E.Object.CREATE_ERROR);
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
}
