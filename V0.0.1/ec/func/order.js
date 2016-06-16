var Q = require('q');
var async = require('async');
var E = require('../../../error');
var _ = require('underscore');
var api = require('../../api');
var m = require('moment');
var L = require('../../../logger.js');
var ec = require('../');
module.exports = function(M){
    M.order = {
        /**
         * 根据订单编号获取订单详情
         * @param args
         * @returns {*|d.promise|Function|promise|r.promise}
         */
        getOrderByOid:function(args){
            var orderid = args.orderid ;
            var q = Q.defer() ;
            async.auto({
                f0:function(cb){
                    //获取gr_final_order表
                    var arg = {
                        table:'gr_final_order',
                        condition:"orderid='"+orderid+"'",
                        fields:"orderid,groupNo,type,status,givePoint,q_flag,s_flag,t_flag,h_flag"
                    };
                    M.first(arg).then(function(data){
                        cb(null, data)
                    }).catch(function(err){
                        cb(E.WeiStore.FIND_NOTHING);
                    });
                },
                f0_1:['f0',function(cb,result){
                    //获取订单组编号
                    var groupNo = result.f0.groupNo ;
                    //根据订单组编号查询地址
                    var arg = {
                        table:'gr_final_order_group',
                        condition:"groupNo='"+groupNo+"'",
                        fields:"toStreet,toName,toPhone,amount,finalAmount,createAt,payway,expresscost,expresstype,deliveryTime"
                    };
                    M.first(arg).then(function(data){
                        cb(null, data)
                    }).catch(function(err){
                        cb(E.WeiStore.FIND_NOTHING);
                    });
                }],
                f1:function(cb){
                    //获取gr_final_order_goods表
                    var sql = "SELECT a.proname pname,b.picurlarray ,a.spname specname,a.cartnum ,a.price grprice,b.bin " +
                        "FROM gr_final_order_goods a ,gr_product b " +
                        "where a.orderid='"+orderid+"' and a.pid=b.id";
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err)
                        }else{
                            var proList = [] ;
                            async.eachSeries(data,function(e,cb1){
                                proList.push({
                                    pname: e.pname,
                                    specname: e.specname,
                                    cartnum: e.cartnum,
                                    grprice: e.grprice,
                                    bin: e.bin,
                                    imgUrl:JSON.parse(e.picurlarray)[0]
                                });
                                cb1(null);
                            },function(){
                                cb(null, proList);
                            })
                        }
                    })
                },
                f2:['f0',function(cb,result){
                    //获取gr_order_pay表数据
                    var arg = {
                        table:'gr_order_pay',
                        condition:"oid='"+result.f0.groupNo+"'",
                        fields:"way,count"
                    };
                    M.find(arg).then(function(data){
                        var list = {};
                        _.each(data, function(n,k){
                            switch (n.way){
                                case "活动余额":
                                    list['gcoin'] = n ;
                                    break;
                                case "优惠券":
                                    list['coupons'] = n ;
                                    break;
                            }
                            return list ;
                        });
                        cb(null, list)
                    }).catch(function(err){
                        cb(E.WeiStore.FIND_NOTHING);
                    })
                }],
                f3:function(cb){
                    //根据orderid获取物流流水
                    getLogisticsFlow(orderid).then(function(data){
                        cb(null, data);
                    }).catch(function(err){
                        cb(err)
                    })
                },
                final:['f0','f1','f2','f0_1','f3',function(cb,result){
                    cb(null, {order:result.f0,address:result.f0_1,goods:result.f1,pay:result.f2,logistics:result.f3});
                }]
            },function(err,result){
                if(err){
                    q.reject(err);
                } else{
                    q.resolve(result.final);
                }
            });
            return q.promise ;
        },
        /**
         * 根据订单状态获取订单列表
         * @param args
         * @returns {*|d.promise|Function|promise|r.promise}
         */
        getOrdersByStatus:function(args){
            var status = args.status,
                uid = args.uid,
                page = args.page || 0,
                pageSize = 5,
                s_flag = args.s_flag || 0;
            var skip = page * pageSize ;
            var q = Q.defer() ;
            async.waterfall([
                function(cb){
                    var sql = "select a.orderid,a.groupNo,a.type,a.status,a.q_flag,a.s_flag, b.pid ,b.picurl,d.finalAmount " +
                        "from gr_final_order a, gr_final_order_goods b ,gr_final_order_group d " +
                        "where a.orderid = b.orderid and "+(_.isArray(status)?"a.status in ("+status.join(',')+")":"a.status="+status)+ " and d.groupNo=a.groupNo and d.uid='"+uid+"'"+
                        (s_flag===0?"":" and a.s_flag>="+s_flag)+
                        " order by d.createAt desc limit "+skip+","+pageSize;
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err)
                        }else{
                            cb(null, data);
                        }
                    });
                },
                function(l,cb){
                    var list = [] ;
                    if(_.isArray(l)){
                        async.eachSeries(l,function(e,cb1){
                            if(_.isEmpty(list)){
                                var img = [];
                                img.push(e.picurl);
                                list.push(
                                    {
                                        s_flag: e.s_flag,
                                        q_flag: e.q_flag,
                                        groupNo: e.groupNo,
                                        orderid: e.orderid,
                                        status: e.status,
                                        finalAmount: e.finalAmount,
                                        imgUrl:img
                                    }
                                );
                                cb1(null);
                            }else{
                                var flag = false ;
                                async.eachSeries(list,function(f,cb2){
                                    if(f.orderid === e.orderid){
                                        flag = true ;
                                        if(f['imgUrl'].length <3){
                                            if(e.picurl.indexOf(f['imgUrl'])>=0){
                                            }else{
                                                f['imgUrl'].push(e.picurl)
                                            }
                                        }
                                    }
                                    cb2(null);
                                },function(){
                                    if(!flag){
                                        //没有更新到任何list，则创建一条var img = [];
                                        var img = [];
                                        img.push(e.picurl);
                                        list.push(
                                            {
                                                s_flag: e.s_flag,
                                                q_flag: e.q_flag,
                                                groupNo: e.groupNo,
                                                orderid: e.orderid,
                                                status: e.status,
                                                finalAmount: e.finalAmount,
                                                imgUrl:img
                                            }
                                        );
                                    }
                                    cb1(null);
                                })
                            }
                        },function(){
                            cb(null, list);
                        })
                    }else{
                        cb(null, list);
                    }
                }
            ],function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result);
                }
            })
            return q.promise ;
        },
        /***
         * 订单撤销接口
         * @param args
         * @returns {h.promise|Function|promise|*|d.promise|r.promise}
         */
        ordercancel:function(args){
            var q = Q.defer() ;
            async.auto({
                f1:function(callback,r){
                    data={
                        nickname:args.nickname,
                        phone:args.phone,
                        reason:args.reason,
                        detail:args.detail,
                        orderid:args.orderid,
                        createAt:args.time,
                        updateAt:args.time,
                        uid:args.uid
                    }
                    table = {table:"gr_reject_orders",row:data};
                    M.create(table).then(function(d){
                        callback(null, d);
                    }).catch(function(err){
                        callback(err);
                    })
                },
                f1_0:['f1',function(callback,r){
                    var now =Math.floor(_.now()/1000);
                    var arg = {
                        table:"gr_operate_log",
                        row:{
                            type : "用户操作",//自定义字段
                            uid : args.uid,//用户id
                            uname : args.nickname,//快递员姓名
                            remark : "【"+args.nickname+" "+args.phone+"】 撤销订单",//文字描述
                            createdate : now,
                            createAt:now ,
                            updateAt:now,
                            dataId : args.orderid
                        }
                    };
                    ec.create(arg).then(function(data){
                        callback(null, {errno:0})
                    }).catch(function(err){
                        callback(null, {errno:0});
                    });
                }],
                f2:["f1",function(callback,r){
                    data = {
                        q_flag:1,
                        updateAt:args.time
                    }
                    console.log(r);
                    M.update({table:"gr_final_order",condition:"orderid ="+args.orderid+"",row:data}).then(function(d){
                        callback(null,d);
                    }).catch(function(err){
                        callback(err);
                    })
                }]
            },function(err,r){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(r);
                }
            });
            return q.promise;
        },
        /**
         * 订单售后功能
         * @param args
         * @returns {h.promise|Function|promise|*|d.promise|r.promise}
         */
        orderservice:function(args){
            var q = Q.defer() ;
            async.auto({
                f1:function(callback,r){
                    data={
                        nickname:args.nickname,
                        phone:args.phone,
                        detail:args.detail,
                        orderid:args.orderid,
                        uid:args.uid,
                        createAt:args.time,
                        updateAt:args.time,
                        pic_array:args.pic_array
                    }
                    table = {table:"gr_order_service",row:data};
                    M.create(table).then(function(d){
                        callback(null, d);
                    }).catch(function(err){
                        callback(err);
                    })
                },
                f1_0:['f1',function(cb,r){
                    var now =Math.floor(_.now()/1000);
                    var arg = {
                        table:"gr_operate_log",
                        row:{
                            type : "用户操作",//自定义字段
                            uid : args.uid,//用户id
                            uname : args.nickname,//快递员姓名
                            remark : "【"+args.nickname+" "+args.phone+"】 申请售后",//文字描述
                            createdate : now,
                            createAt:now ,
                            updateAt:now,
                            dataId : args.orderid
                        }
                    };
                    ec.create(arg).then(function(data){
                        cb(null, {errno:0})
                    }).catch(function(err){
                        cb(null, {errno:0});
                    });
                }],
                f2:["f1",function(callback,r){
                    data = {
                        s_flag:1,
                        updateAt:args.time
                    }
                    M.update({table:"gr_final_order",condition:"orderid ="+args.orderid+"",row:data}).then(function(d){
                        callback(null,d);
                    }).catch(function(err){
                        callback(err);
                    })
                }]
            },function(err,r){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(r);
                }
            });
            return q.promise;
        },
        /**
         * 订单评论
         * @param args
         * @returns {h.promise|Function|promise|*|d.promise|r.promise}
         */
        goodscomment:function(args){
            var q = Q.defer();

            var order = args.order;
            var goods = args.goods;
            async.auto({
                //添加商品评论
                f0:function(callback,results){
                    if(args.goods.length>0){
                        async.eachSeries(goods,function(a,callback){
                            data={
                                pid:a.pid,
                                specid:a.specid,
                                content:a.content,
                                uid:a.uid,
                                rank:a.rank,
                                orderid:args.orderid,
                                picarray:a.picarray,
                                createAt:args.time,
                                updateAt:args.time
                            };
                            insertComment(data).then(function(d){
                                callback(null,d);
                            }).catch(function(err){
                                callback(err);
                            })
                        },function(err){
                            if(err){
                                callback(err)
                            }else{
                                callback(null,goods)
                            }
                        })
                    }else{
                        callback(null,{data:0});
                    }
                },
                //添加快递员评价
                f1:function(callback,results){
                    if(order.orderid==undefined||order.orderid==""){
                       callback(null,{data:0})
                    }else {
                        row = {
                            courierid: order.courierid,
                            orderid: args.orderid,
                            servicerank: order.servicerank,
                            speedrank: order.speedrank,
                            uid: order.uid,
                            createAt:args.time,
                            updateAt:args.time
                        }
                        data = {table: "gr_courier_comment", row: row}
                        ec.create(data).then(function (d) {
                            callback(null,{data:1});
                        }).catch(function (err) {
                            callback(err);
                        });
                    }
                },
                //若f1对快递员评论，则更新final_order
                f2:["f1",function(callback,results){
                    row={
                        courierComment:1
                    }
                    condition="orderid="+args.orderid;
                    data={table:"gr_final_order",condition:condition,row:row}
                    if(results.f1.data==1){
                        ec.update(data).then(function(d){
                            if(d.length>0){
                                callback(null,{data:0})
                            }else{
                                callback(null,{data:1})
                            }
                        }).catch(function(err){
                            callback(null,{});
                        })
                    }else{
                        callback(null,{})
                    }

                }],
                //查询订单商品是否已评论
                f3:["f0",function(callback,results){
                    condition = "orderid="+args.orderid+" and comment=0";
                    data={table:"gr_final_order_goods",condition:condition}
                    ec.find(data).then(function(d){
                        if(d.length>0){
                            callback(null,{data:0})
                        }else{
                            callback(null,{data:1})
                        }
                    }).catch(function(err){
                        callback(err);
                    })
                }],
                //查询final_order是否对物流已评论
                f4:["f2",function(callback,results){
                    var sql = "SELECT a.courierComment,a.orderid,b.uid,a.givePoint,b.groupNo" +
                        " FROM gr_final_order a,gr_final_order_group b " +
                        " where a.orderid='"+args.orderid+"' and a.courierComment=1 and a.groupNo=b.groupNo";
                    ec.adapter.query(sql,function(err,d){
                        if(d.length>0){
                            callback(null,{data:1,order:d[0]})
                        }else{
                            callback(null,{data:0})
                        }
                    })

                }],
                //若都已评论则更新订单，并返回1
                f5:["f3","f4",function(callback,results){
                    if(results.f3.data==1&&results.f4.data==1){
                        row={
                            status:9999
                        }
                        condition="orderid="+args.orderid;
                        data={table:"gr_final_order",condition:condition,row:row};
                        ec.update(data).then(function(d){
                            param={
                                uid:results.f4.order.uid,
                                aid:results.f4.order.groupNo,
                                title:'成功推荐'

                            }
                            ec.weistore.addExp(param);
                            callback(null,{data:1})
                        }).catch(function(err){
                            callback(null,{});
                        })
                    }else{
                        callback(null,{data:0})
                    }
                }],
                f6:["f3","f4",function(callback,results){
                    if(results.f3.data==1&&results.f4.data==1){
                        data={
                            uid:results.f4.order.uid,
                            point:results.f4.order.givePoint
                        }
                        givePoint(data).then(function (d) {
                            callback(null,d)
                        }).catch(function(err){
                            callback(err);
                        })
                    }else{
                        callback(null,{data:0})
                    }
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
        /**
         *获取订单评论详情
         * @param args
         * @returns {h.promise|Function|promise|*|d.promise|r.promise}
         */
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
        /**
         * 获取商品评价
         * @param args
         * @returns {h.promise|Function|promise|*|d.promise|r.promise}
         */
        getgoodsComment:function(args){
            var pid = args.pid,
                applystatus=1,
                page = args.page || 0,
                pageSize = 5;
            var skip = page * pageSize ;
            var q = Q.defer() ;
            async.waterfall([
                function(cb){
                    var sql = "select a.*,b.name pname,c.name specname" +
                        " from gr_goods_comment a,gr_product b,gr_product_spec c " +
                        "where a.pid="+pid+" and a.pid=b.id and a.pid=c.pid and a.applystatus="+applystatus+
                        " and a.specid=c.id limit "+skip+","+pageSize;
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err)
                        }else{
                            cb(null, data);
                        }
                    });
                },
                function(l,cb){
                    var list = [] ;
                    async.eachSeries(l,function(e,cb1){
                        var r={
                            agree:e.agree,
                            zan: e.zan,
                            id: e.id,
                            rank:e.rank,
                            createAt: e.createAt,
                            uid: e.uid,
                            pname: e.pname,
                            specname: e.specname,
                            content: e.content,
                            picarray:JSON.parse(e.picarray)
                        };
                        condition="id="+ e.uid;
                        data={
                            table:"gr_login_info",
                            condition:condition
                        };
                        api.find(data).then(function(d){
                            if(d.length>0){
                                r.username=d[0].nickname;
                                r.headimgurl=d[0].headimgurl;
                                r.level=d[0].level;
                                list.push(r);
                                cb1(null,r)
                            }else{
                                cb1(null,r)
                            }
                        })
                    },function(){
                        cb(null, list);
                    })

                }
            ],function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result);
                }
            })
            return q.promise ;
        },
        getCommentCount:function(args){
            var pid = args.pid ;
            var q = Q.defer();
            var arg = {
                table:'gr_goods_comment',
                condition:"pid="+pid+" and applystatus=1"
            };
            M.count(arg).then(function(count){
                q.resolve(count);
            }).catch(function(err){
                q.reject(err);
            });
            return q.promise;
        }
    };
    return M ;
};
var getLogisticsFlow = function(orderid){
    var q = Q.defer() ;
    var sql = "SELECT  b.*,c.name,c.phone " +
        "FROM lg_mission a ,lg_mission_flow b ,lg_courier c " +
        "where a.code='"+orderid+"' and b.mission_id=a.code and b.uid=c.id order by b.updateAt desc" ;
    api.adapter.query(sql,function(err,data) {
        if (err) {
            q.reject(err);
        } else {
            q.resolve(data);
        }
    });
    return q.promise;
};
var insertComment = function(param){
    var q = Q.defer();
    async.auto({
        f0:function(callback,results){
            var data = {table:"gr_goods_comment",row:param}
            ec.create(data).then(function(d){
                callback(null,d);
            }).catch(function(err){
                callback(err)
            });
        },
        f1:function(callback,results){
            var condition = "pid="+param.pid+" and specid="+param.specid+" and orderid="+param.orderid;
            var row={
                comment:1
            }
            var data={table:"gr_final_order_goods",condition:condition,row:row}
            ec.update(data).then(function(d){
                callback(null,d);
            }).catch(function(err){
                callback(null,{});
            })
        }
    },function(err,results){
        if(err){
            q.reject(err);
        }else{
            q.resolve(results);
        }
    })
    return q.promise;
};
var givePoint=function(param){
    var q = Q.defer();
    async.auto({
        f1:function(callback,results){
            var data={
                table:"gr_login_info",
                id:parseInt(param.uid)
            };
            api.get(data).then(function(d){
                callback(null,d)
            }).catch(function(err){
                callback(E.WeiStore.FIND_NOTHING)
            })
        },
        f2:["f1",function(callback,results){
            var row={
                point:parseInt(results.f1.point)+parseInt(param.point)
            };
            var data={
                table:"gr_login_info",
                condition:"id="+parseInt(param.uid),
                row:row
            };
            api.update(data).then(function(d){
                callback(null,d);
            }).catch(function(err){
                callback(err)
            })
        }],
        f3:['f2',function(callback,results){
            var args = {
                table:'gr_user_point',
                row:{
                    content: "评论订单积分+" + parseInt(param.point),
                    uid: param.uid,
                    newpoint: parseInt(param.point),
                    beforepoint: results.f1.point,
                    afterpoint: results.f1.point + parseInt(param.point),
                    createAt:Math.floor(_.now()/1000),
                    updateAt:Math.floor(_.now()/1000)
                }
            };
            ec.create(args).then(function(data){
                callback(null, {code: 0, msg: "领取积分奖励成功"});
            }).catch(function(err){
                callback(err);
            })
        }]
    },function(err,results){
        if(err){
            q.reject(err)
        }else{
            q.resolve(results)
        }
    })
    return q.promise;
}


