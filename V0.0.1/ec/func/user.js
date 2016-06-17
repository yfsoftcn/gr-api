var Q = require('q');
var async = require('async');
var E = require('../../../error');
var _ = require('underscore');
var m = require('moment');
var L = require('../../../logger.js');

module.exports = function(M,C){
    var api = require('../../api')(C);
    var ec = require('../')(C);
    M.user = {
        zan:function(args){
            var zan_table=args.table+"_zan";
            var q = Q.defer();
            async.auto({
                //查询用户对指定内容点赞条数
                f0:function(callback,results){
                    condition="aid="+args.aid+" and uid="+args.uid;
                    data={
                        table:zan_table,
                        condition:condition
                    }
                    M.find(data).then(function(d){
                        callback(null,{data:d});
                    }).catch(function(err){
                        callback(err);
                    })
                },
                //如果没有则新建一条为0的点赞记录
                f1:['f0',function(callback,results){
                    if(results.f0.data.length>0){
                        callback(null,results.f0.data);
                    }else{
                        row = {
                            uid: args.uid,
                            zan: 0,
                            max_zan: 10,
                            aid:args.aid,
                            createAt:args.time,
                            updateAt:args.time
                        }
                        data = {table: zan_table, row: row}
                        ec.create(data).then(function (d) {
                            callback(null,{data:1});
                        }).catch(function (err) {
                            callback(err);
                        });
                    }
                }],
                //再次获取点赞
                f2:['f1',function(callback,results){
                    condition="aid="+args.aid+" and uid="+args.uid;
                    data={
                        table:zan_table,
                        condition:condition
                    }
                    M.find(data).then(function(d){
                        callback(null,{data:d[0]});
                    }).catch(function(err){
                        callback(err);
                    })
                }],
                //判断点赞数，zan<max_zan?+1:err
                f3:['f2',function(callback,results){
                    zan_cnt = parseInt(results.f2.data['zan'])
                    max_zan = parseInt(results.f2.data['max_zan'])
                    if(zan_cnt>=max_zan){
                        callback(E.User.ZAN_OUT_LIMIT)
                    }else{
                        condition="aid="+args.aid+" and uid="+args.uid;
                        row = {
                            zan:zan_cnt+1,
                        }
                        data = {table: zan_table, condition:condition,row: row}
                        ec.update(data).then(function(d){
                            callback(null,d);
                        }).catch(function(err){
                            callback(err);
                        })
                    }
                }],
                //获取被点赞内容数据
                f4:function(callback,results){
                    condition="id="+args.aid;
                    data={
                        table:args.table,
                        condition:condition
                    }
                    M.find(data).then(function(d){
                        callback(null,{data:d[0]});
                    }).catch(function(err){
                        callback(err);
                    })
                },
                //赞数+1
                f5:['f3','f4',function(callback,results){
                    condition="id="+args.aid;
                    row={
                        zan:parseInt(results.f4.data['zan'])+1
                    }
                    data={
                        table:args.table,
                        condition:condition,
                        row:row
                    }
                    param={
                        uid:results.f4.data['uid'],
                        aid:results.f4.data['id'],
                        title:'收集到赞'
                    }
                    ec.weistore.addExp(param);
                    M.update(data).then(function(d){
                        callback(null,d);
                    }).catch(function(err){
                        callback(null,err)
                    })
                }]

            },function(err,results){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(results);
                }
            });
            return q.promise;
        },
        getOrderComment:function(args){
            var q= Q.defer();
            async.auto({
                f0:function(callback,results){
                    var sql = "SELECT a.courierComment,a.orderid,b.uid" +
                        " FROM gr_final_order a,gr_final_order_group b " +
                        " where a.orderid='"+args.orderid+"' and a.courierComment=0 and a.groupNo=b.groupNo";
                    ec.adapter.query(sql,function(err,d){
                        callback(null,d);
                    })
                },
                f1:function(callback,results){
                    var sql = "SELECT a.orderid,a.pid,a.specid,b.name pname,b.picurlarray,c.name specname,a.cartnum ,c.grprice,b.bin " +
                        "FROM gr_final_order_goods a ,gr_product b,gr_product_spec c " +
                        "where a.orderid='"+args.orderid+"' and a.comment=0 and a.specid = c.id and c.pid = b.id and a.specid = c.id";
                    ec.adapter.query(sql,function(err,data){
                        if(err){
                            callback(err)
                        }else{
                            var proList = [] ;
                            async.eachSeries(data,function(e,cb1){
                                proList.push({
                                    orderid: e.orderid,
                                    pname: e.pname,
                                    specname: e.specname,
                                    cartnum: e.cartnum,
                                    grprice: e.grprice,
                                    pid: e.pid,
                                    specid: e.specid,
                                    bin: e.bin,
                                    imgUrl:JSON.parse(e.picurlarray)[0]
                                });
                                cb1(null);
                            },function(){
                                callback(null, proList);
                            })
                        }
                    })
                },
                f2:function(callback,results){
                    condition = "code="+args.orderid
                    data={table:"lg_mission",condition:condition,limit:1}
                    api.find(data).then(function(d){
                        if(d.length>0){
                            callback(null,{data:d})
                        }else{
                            callback(null,{data:0})
                        }
                    }).catch(function(err){
                        callback(err);
                    })
                }
            },function(err,results){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(results)
                }
            })
            return q.promise
        },
    };
    return M ;
};