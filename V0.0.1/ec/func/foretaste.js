/**
 * Created by admin on 2016/4/28.
 */
var Q = require('q');
var async = require('async');
var E = require('../../../error');
var _ = require('underscore');
var m = require('moment');
var L = require('../../../logger.js');

//试吃 专属接口
module.exports = function(M,C) {
    var api = require('../../api')(C);
    var com = require('./common.js')(C);
    M.foretaste = {
        //获取参与试吃活动的前30名用户头像、等级、总人数
        getForetasterByAid:function(args){
            var aid = args.aid,
                q = Q.defer() ;
            async.auto({
                f0:function(cb){
                    //根据aid获取活动申请表中的人数
                    var arg = {
                        table:"gr_foretaste_apply",
                        condition:"aid="+aid+" and delflag=0",
                        sort:"createAt+"
                    };
                    M.count(arg).then(function(data){
                        cb(null, data);
                    }).catch(function(err){
                        cb(err);
                    })
                },
                f1:function(cb){
                    var arg = {
                        table:"gr_foretaste_apply",
                        condition:"aid="+aid+"",
                        fields:"uid",
                        sort:"createAt+",
                        limit:30
                    };
                    M.find(arg).then(function(data){
                        if(data){
                            var uids = [] ;
                            async.eachSeries(data,function(e,cb1){
                                uids.push(e.uid);
                                cb1(null);
                            },function(){
                                cb(null, uids);
                            })
                        }
                    }).catch(function(err){
                        cb(err);
                    });
                },
                f2:['f1',function(cb,result){
                    if(_.isEmpty(result.f1)){
                        cb(null, []);
                    }else{
                        var arg = {
                            table:'gr_login_info',
                            condition:' id in ('+result.f1.join(',')+')',
                            fields:"headimgurl,nickname,level",
                            limit:30
                        };
                        api.find(arg).then(function(data){
                            cb(null, data);
                        }).catch(function(err){
                            cb(err)
                        })
                    }
                }],
                final:['f0','f2',function(cb,result){
                    cb(null, {users:result.f2, count:result.f0})
                }]
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result.final);
                }
            })
            return q.promise;
        },
        //获取试吃报告首页数据
        getForetasteByAid:function(args){
            var q = Q.defer(),
                aid = args.aid ;
            async.auto({
                f0:function(cb){
                    var sql = "select a.question,a.answer,count(a.id) cnt " +
                        "from gr_foretaste_opinion_question a ,gr_foretaste_opinion b " +
                        "where a.aid = "+aid+" and a.aid = b.aid and b.status=1 group by a.question,a.answer order by a.question,a.answer";
                    L.info(sql);
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err);
                        }  else{
                            cb(null,data);
                        }
                    })
                },
                f1:['f0',function(cb,result){
                    var list = [];
                    async.eachSeries(result.f0,function(e,cb1){
                        var answer = {name: e.answer,count: e.cnt};
                        if(_.isEmpty(list)){
                            list.push({title: e.question,answer:[answer]});
                            cb1(null);
                        }else{
                            var flag = false ;
                            async.eachSeries(list,function(l,cb2){
                                if(l.title === e.question)  {
                                    flag = true ;
                                    l['answer'].push(answer);
                                }
                                cb2(null);
                            },function(){
                                if(!flag){
                                    //没有更新到任何数据
                                    list.push({title: e.question,answer:[answer]});
                                }
                                cb1(null, list);
                            })
                        }
                    },function(){
                        cb(null, list);
                    })
                }],
                f2:function(cb){
                    //根据aid获取活动主图和名称，并且获取有效的评论数量
                    var sql = "select a.title,a.pic_array,count(b.id) cnt " +
                        " from gr_foretaste_activity a ,gr_foretaste_opinion b " +
                        " where a.id="+aid+" and b.aid="+aid+" and b.status=1";
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err);
                        }else{
                            cb(null, data);
                        }
                    })
                },
                final:["f1","f2",function(cb,result){
                    cb(null, {activity:result.f2[0], opinions:result.f1});
                }]
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result.final);
                }
            })
            return q.promise;
        },
        //获取试吃反馈，分页，每页5条
        getForetasteOpinions:function(args){
            var q = Q.defer(),
                aid = args.aid,
                page = args.page || 0,
                pageSize = 20 ;
            async.auto({
                f0:function(cb){
                    var arg = {
                        table:'gr_foretaste_opinion',
                        condition:'aid='+aid+" and status=1",
                        skip:page*pageSize,
                        limit:pageSize ,
                        sort:"createAt-",
                        fields:"id,aid,uid,createAt,remark,pic_array,zan"
                    };
                    M.find(arg).then(function(data){
                        cb(null, data);
                    }).catch(function(err){
                        cb(err);
                    })
                },
                f1:['f0',function(cb,result){
                    var uids = [] ;
                    async.eachSeries(result.f0,function(e,cb1){
                        uids.push(e.uid);
                        e['pic_array'] = _.isEmpty(e.pic_array)?[]:JSON.parse(e.pic_array);
                        cb1(null);
                    },function(){
                        cb(null, {uids:uids,opinions:result.f0});
                    });
                }],
                f2:['f1',function(cb,result){
                    if(result.f0.length==0){
                        cb(null,[]);
                    }else{
                        var arg = {
                            table:"gr_login_info",
                            condition:"id in ("+result.f1.uids.join(',')+")",
                            fields:"id,headimgurl,nickname,level"
                        };
                        api.find(arg).then(function(data){
                            cb(null, data);
                        }).catch(function(err){
                            cb(err);
                        })
                    }
                }],
                f3:['f2',function(cb,result){
                    var list = [] ;
                    async.eachSeries(result.f1.opinions,function(e,cb1){
                        async.eachSeries(result.f2,function(u,cb2){
                            if(e.uid === u.id){
                                e['user'] = u ;
                                list.push(e);
                            }
                            cb2(null);
                        },function(){
                            cb1(null);
                        })
                    },function(){
                        cb(null, list);
                    })
                }]
            },function(err,result){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result.f3);
                }
            });
            return q.promise;
        },
        //根据uid获取已申请的试吃活动
        getAppliedListByUid:function(args){
            var q = Q.defer(),
                uid = args.uid,
                page = args.page || 0,
                pageSize = 5 ;
            var sql ="select a.id,a.title,a.endDate,a.pic_array,b.status," +
                " (select count(1) from gr_foretaste_opinion c where a.id = c.aid and c.uid = "+uid+" ) opinion_count" +
                " from gr_foretaste_activity a,gr_foretaste_apply b " +
                " where b.uid="+uid+" and a.id=b.aid order by a.createAt desc limit "+page*pageSize+","+pageSize;
            M.adapter.query(sql,function(err,data){
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(data);
                }
            });
            return q.promise;
        },
        //根据商品id获取试吃人数和
        getForetasteByProid: function (args) {
            var q = Q.defer() ;
            var pid = args.pid ;
            async.auto({
                f0:function(cb){
                    var sql = "select a.aid from gr_foretaste_product a where a.pid="+pid+" and a.status=1";
                    M.adapter.query(sql,function(err,data){
                        if(err){
                            cb(err);
                        }else{
                            cb(null, _.map(data,'aid'));
                        }
                    });
                },
                f1:['f0',function(cb,result){
                    var aids = result.f0 ;
                    if(_.isEmpty(aids)){
                        cb(null, []);
                    }else{
                        var sql = "select distinct uid from gr_foretaste_apply where aid in ("+aids.join(',')+") and status=1";
                        M.adapter.query(sql,function(err,data){
                            if(err){
                                cb(err);
                            }else{
                                cb(null, _.map(data,'uid'));
                            }
                        });
                    }

                }],
                f2:['f1',function(cb,result){
                    if(_.isEmpty(result.f1)){
                        cb(null, []);
                    }else{
                        var sql = "select headimgurl from gr_login_info where id in ("+result.f1.join(',')+") limit 0,4";
                        api.adapter.query(sql,function(err,data){
                            if(err){
                                cb(err);
                            }else{
                                cb(null, _.map(data,'headimgurl'));
                            }
                        });
                    }
                }],
                final:['f0','f1','f2',function(cb,result){
                    cb(null, {count: _.size(result.f1),aid: _.last(result.f0),users:result.f2})
                }]
            }, function (err,result) {
                if(err){
                    q.reject(err);
                }else{
                    q.resolve(result.final);
                }
            })
            return q.promise ;
        }
    }
};