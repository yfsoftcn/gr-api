/**
 * Created by Nico on 2016/3/31.
 */
var Q = require('q');
var async = require('async');
var E = require('../../../error');
var _ = require('underscore');
var logger = require('../../../logger.js');
module.exports = function(M,C){
    var api = require('../../api')(C);
    M.tuangou = {
        //添加团购单
        addOrder:function(args){
            var q = Q.defer();
            async.auto({
                f0:function(callback,result){
                    where = "id="+args.uid;
                    api.find({table:'gr_login_info',condition:where}).then(function(d){
                        if(d.length>0){
                            callback(null,d[0]);
                        }else{
                            callback(E.Tuangou.USER_NOT_EXIST);
                        }
                    })
                },
                f1:['f0',function(callback,result){
                    f0 = result.f0;
                    data = {
                        name:args.name,
                        uid:args.uid,
                        addr:args.addr,
                        headimgurl:f0.headimgurl,
                        nickname:f0.nickname||"no name",
                        tel:args.tel,
                        group_id:args.group_id,
                        pay_way:args.pay_way,
                        pid:args.pid,
                        sid:args.sid,
                        product_id:args.product_id,
                        tuangou_price:args.tuangou_price,
                        num:args.num,
                        total_price:args.total_price,
                        status:1000,
                        createAt:args.now,
                        updateAt:args.now
                    };
                    table = {table:"gr_tuangou_order",row:data};
                    M.create(table).then(function(r){
                        console.log(r);
                        callback(null,r);
                    }).catch(function(err){
                        callback(err);
                    })
                }]
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result)
                }
            })
            return q.promise;
        },
        //发起新团购
        newTuangou:function(args){
            var q = Q.defer() ;
            async.auto({
                f1:function(callback,result){
                    M.find({table:"gr_tuangou_product",condition:"id="+args.product_id+" and status = 1 and end_time>"+args.now+" and inventory > 0"}).then(function(d){
                        if(d.length>0){
                            callback(null,d[0]);
                        }else{
                            callback(E.Tuangou.PRODUCT_OUTTIME);
                        }
                    }).catch(function(err){
                        callback(err);
                    });
                },
                f2:['f1',function(callback,result){
                    f1 = result.f1;
                    data={
                        product_id:args.product_id,
                        leader:args.uid,
                        pid:f1.pid,
                        sid:f1.sid,
                        limit_people:f1.limit_people,
                        end_time:f1.end_time,
                        createAt:args.now,
                        updateAt:args.now
                    }
                    table = {table:"gr_tuangou_group",row:data};
                    M.create(table).then(function(d){
                        callback(null, d);
                    }).catch(function(err){
                        callback(err);
                    })
                }],
                f3:['f2',function(callback,result){
                    f1 = result.f1;
                    f2 = result.f2;
                    data = {
                        name:args.name,
                        uid:args.uid,
                        addr:args.addr,
                        tel:args.tel,
                        group_id:f2.insertId,
                        pay_way:args.pay_way,
                        pid:f1.pid,
                        sid:f1.sid,
                        product_id:args.product_id,
                        tuangou_price:args.tuangou_price,
                        num:args.num,
                        total_price:(args.num * args.tuangou_price).toFixed(2),
                        now:args.now
                    };
                    M.tuangou.addOrder(data).then(function(o){
                        callback(null, o.f1);
                    }).catch(function(err){
                        callback(err);
                    });
                }]
                //    ,
                //f4:['f2',function(callback,result){
                //    f2 = result.f2;
                //    M.get({table:'gr_tuangou_group',id:f2.insertId}).then(function(d){
                //        callback(null,d);
                //    }).catch(function(err){
                //        callback(err);
                //    })
                //}]
            },
            function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    console.log(result);
                    q.resolve(result);
                }
            })
            return q.promise;
        },
        //参与团购
        joinTuangou:function(args){
            var q = Q.defer();
            async.auto({
                //判断该团未结束，状态为1000，id正确时，可参加
                f1:function(callback,result){
                    where = "id ="+args.group_id+" and status = 1000 and end_time >"+args.now;
                    M.find({table:'gr_tuangou_group',condition:where}).then(function(d){
                        if(d.length>0){
                            callback(null,d[0]);
                        }else{
                            callback(E.Tuangou.GROUP_OUTTIME);
                        }
                    }).catch(function(err){
                        callback(err);
                    });
                },
                f2:function(callback,result){
                    where = "group_id ="+args.group_id+" and uid ="+args.uid;
                    M.find({table:'gr_tuangou_order',condition:where}).then(function(d){
                        if(d.length>0){
                            callback(E.Tuangou.ALREADY_IN_GROUP);
                        }else{
                            callback(null,{});
                        }
                    }).catch(function(err){
                        callback(err);
                    });
                },
                f3:['f1','f2',function(callback,result){
                    f1 = result.f1;
                    data = {
                        name:args.name,
                        uid:args.uid,
                        addr:args.addr,
                        tel:args.tel,
                        group_id:args.group_id,
                        pay_way:args.pay_way,
                        pid:f1.pid,
                        sid:f1.sid,
                        product_id:f1.product_id,
                        tuangou_price:args.tuangou_price,
                        num:args.num,
                        total_price:(parseInt(args.tuangou_price)*parseInt(args.num)).toFixed(2),
                        now:args.now,
                    };
                    M.tuangou.addOrder(data).then(function(o){
                        callback(null, o.f1);
                    }).catch(function(err){
                        callback(err);
                    });
                }],
                f4:['f1','f2',function(callback,result){
                    f1 = result.f1;
                    joiner = f1.joiner;
                    joiner = parseInt(joiner)+1;
                    data = {
                        joiner:joiner
                    }
                    M.update({table:"gr_tuangou_group",condition:"id = '"+args.group_id+"' AND status = 1000",row:data}).then(function(r){
                        callback(null,r);
                    }).catch(function(err){
                        callback(err);
                    })
                }],
                f5:['f4',function(callback,result){
                    f1 = result.f1;
                    limit_people = parseInt(f1.limit_people);
                    joiner = parseInt(f1.joiner)+1;
                    if(joiner >= limit_people){
                        where = "id ="+args.group_id;
                        data = {
                            status:4000
                        }
                        M.update({table:"gr_tuangou_group",condition:"id = '"+args.group_id+"' AND status = 1000",row:data}).then(function(r){
                            M.update({table:"gr_tuangou_order",condition:"group_id = '"+args.group_id+"'",row:data}).then(function(r){
                                callback(null,r);
                            }).catch(function(err){
                                callback(err);
                            });
                        }).catch(function(err){
                            callback(err);
                        });
                    }else{
                        callback(null,{})
                    }
                }]
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result);
                }
            });
            return q.promise;
        },
        //返回活动详情
        returnTuangou:function(args){
            var q = Q.defer();
            async.auto({
                f1:function(callback,result){
                    where = "id="+args.group_id;
                    M.find({table:'gr_tuangou_group',condition:where}).then(function(d){
                        if(d.length>0){
                            callback(null,d);
                        }else{
                            callback(E.Tuangou.NO_SUCH_GROUP)
                        }
                    }).catch(function(err){
                        callback(err);
                    });
                },
                f3:function(callback,result){
                    where = "group_id="+args.group_id;
                    M.find({table:'gr_tuangou_order',condition:where,sort:"createAt+"}).then(function(d){
                        callback(null,d);
                    }).catch(function(err){
                        callback(err);
                    })
                },
                f2:['f1',function(callback,result){
                    f1 = result.f1[0];
                    where = "id="+f1.product_id;
                    M.find({table:'gr_tuangou_product',condition:where}).then(function(d){
                        if(d.length>0){
                            callback(null,d);
                        }else{
                            callback(E.Tuangou.NO_SUCH_PRODUCT);
                        }
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
        },
        /**
         * 获取用户参加的团购列表（区分正在组团、过期和已成功的团购）
         * @param args
         * @returns {*}
         */
        getTuangouList:function(args){
            var q = Q.defer() ;
            var page = args.page || 0,
                pageSize = 5;
            var skip = page * pageSize ;
            var status = (args.status ===0?" ":args.status ===1000?" and a.status=1000":args.status ===4000?" and a.status>4000":""),
                vaild = (args.vaild?args.vaild===1?" and b.end_time>"+ parseInt(_.now()/1000):" and b.end_time<"+ parseInt(_.now()/1000):"");
            var sql = "SELECT a.pay_way,a.pay_status,a.tuangou_price,a.num,a.status,a.uid, " +
                "b.id group_id,b.leader,b.limit_people,b.joiner,b.status group_status,b.createAt, " +
                "c.id pro_id,c.pname,c.spec,c.pic_array,c.end_time " +
                "FROM gr_tuangou_group b,gr_tuangou_order a,gr_tuangou_product c " +
                "where b.id = a.group_id and b.product_id=c.id and a.uid='"+args.uid+"' limit "+skip+","+pageSize+
                status+
                vaild;
            //args.status ===1000?" and a.status=1000":args.status ===4000?" and a.status>4000":""
            M.adapter.query(sql,function(err,data){
                if(err){
                    q.reject(err);
                }else{
                    async.eachSeries(data, function(e,cb){
                        e['pic_array'] = JSON.parse(e.pic_array)[0];
                        cb(null);
                    },function(){
                        q.resolve(data);
                    })
                }
            });
            return q.promise ;
        },

    };
    return M ;
};