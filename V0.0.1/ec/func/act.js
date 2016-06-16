/**
 * Created by Nico on 2016/3/31.
 */
var Q = require('q');
var async = require('async');
var E = require('../../../error');
var api = require('../../api');
var _ = require('underscore');
var L = require('../../../logger.js');
module.exports = function(M){
    M.act = {
        //必抢首页
        rushwelfareHome:function(args){
            var q = Q.defer() ;
            //首页获取商品主图photourlarray
            var sql = "SELECT a.id,a.title,a.code,b.pro_id ,c.photourlarray ,c.minPrice " +
                "FROM gr_act_title a ,gr_act_pro_relations b ,gr_product c " +
                "where b.act_id = a.id and a.code='mrbq' and b.pro_id=c.id and b.delflag=0 and c.status=1";
            M.adapter.query(sql, function(err,data){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(data);
                }
            });
            return q.promise;
        },
        presaleHome:function(args){
            var q = Q.defer() ;
            //首页获取商品主图photourlarray
            var sql = "SELECT a.id,a.title,a.code,b.pro_id ,c.photourlarray ,c.minPrice " +
                "FROM gr_act_title a ,gr_act_pro_relations b ,gr_product c " +
                "where b.act_id = a.id and a.code='yushou' and b.pro_id=c.id and b.delflag=0 and c.status=1";
            M.adapter.query(sql, function(err,data){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(data);
                }
            });
            return q.promise;
        },
        //新的必抢首页
        rushwelfareHome_new :function(args){
            var q = Q.defer() ;
            async.auto({
                f0:function(cb){
                    var sql = "SELECT a.id ,a.title,a.code,a.rule,a.start,a.end,a.pids " +
                        "FROM gr_act_rushwelfare a " +
                        "where a.status=1 and a.code='mrbq' and a.end>"+ Math.floor(_.now()/1000)+" order by a.start asc";
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err);
                        }else{
                            cb(null, data);
                        }
                    });
                },
                f1:['f0',function(cb,result){
                    //,b.name,b.minPrice,b.picurlarray,b.ptags,b.sales,b.recommend
                    var list = result.f0 ;
                    if(!_.isEmpty(list)){
                        async.eachSeries(list, function(e,cb1){
                            if(_.isEmpty(e.pids)){
                                e['prolist']=[];
                            }else{
                                var sql = "select b.id,b.name,b.minPrice,b.photourlarray,b.ptags,b.sales,b.recommend from gr_product b where b.id in ("+ e.pids+")";
                                M.adapter.query(sql,function(err,data){
                                    if(err){
                                        e['prolist'] = [] ;
                                        cb1(null);
                                    }else{
                                        e['prolist'] = data ;
                                        cb1(null);
                                    }
                                });
                            }
                        },function(){
                            cb(null,list);
                        })
                    }else{
                        cb(null, [])
                    }
                }],
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result.f1);
                }
            });
            return q.promise;
        },
        //根据aid获取活动信息，根据pid获取是否已下过单
        historyOrdersCount:function(args){
            var q = Q.defer();
            var uid = args.uid,
                aid = args.aid,
                pid = args.pid;
            async.auto({
                f0: function (cb) {
                    //根据aid获取活动信息
                    var arg = {
                        table: 'gr_act_rushwelfare',
                        id: aid
                    };
                    M.get(arg).then(function (data) {
                        cb(null, data);
                    }).catch(function (err) {
                        cb(err);
                    })
                },
                f1: ['f0',function (cb,result) {
                    //根据商品id到gr_final_order_goods中查找已成功下单单数
                    var act = result.f0;
                    var now = Math.floor(_.now()/1000);
                    var sql = "SELECT count(*) count " +
                        "FROM gr_final_order a,gr_final_order_group b ,gr_final_order_goods c " +
                        "WHERE a.groupNo=b.groupNo and a.status>=1000 " +
                        "and b.uid=" + uid + " and a.orderid=c.orderid and c.pid=" + pid;
                    if(act.rule.each_day_limit === 1){
                        //规定每天限制，为0时则是永久限制
                        sql = sql+" and a.createAt>"+now+" and a.createAt<"+now ;
                    }
                    M.adapter.query(sql, function (err, data) {
                        if (err) {

                            cb(null, 0);
                        } else {
                            cb(null, data[0].count);
                        }
                    });
                }],
                f2:['f1',function(cb,result){
                    var rule = JSON.parse(result.f0.rule),
                        orderscount = result.f1;
                    rule['canbuy'] = (+rule.user_orders)- (orderscount) ;
                    cb(null,rule );
                }]
            },function(err,result){
                if(err){
                    q.reject(err)
                }else{
                    q.resolve(result.f2);
                }
            })
            return q.promise;
        }
    };
    return M ;
};
//获取活动分类信息
var getActInfo = function(M,ids){
    var q = Q.defer() ;
    var sql = "select a.title,a.code,a.id,b.pro_id from gr_act_title a,gr_act_pro_relations b where a.id = b.act_id and a.delflag = 0 and b.delflag = 0 ";
    sql = sql + (_.isArray(ids)?" and b.pro_id in ("+ids.join(',')+")":" and b.pro_id = "+ids);
    M.adapter.query(sql,function(err,data){
        if(err){
            q.reject(err);
        }else{
            async.eachSeries(data, function(e,cb){
                e['photourlarray'] = JSON.parse(e.photourlarray)[0];
                cb(null);
            },function(){
                q.resolve(data);
            });
        }
    });
    return q.promise;
};