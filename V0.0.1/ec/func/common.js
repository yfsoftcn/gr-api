var Q = require('q');
var async = require('async');
var _ = require('underscore');
var m = require('moment');
var L = require('../../../logger.js');
var E = require('../../../error');
//�����ﳵ��Ч����.��ʱδʹ�õ�
var clearCartInvalid = function(M,uid){
    var q = Q.defer() ;
    var list = [] ;
    async.auto({
        f1:function(cb){
            var arg = {
                table:'gr_user_cart',
                condition:"uid = '"+uid+"'"
            };
            M.find(arg).then(function(data){
                if(data.length > 0){
                    //�ҵ�
                    var psids = [],
                        ids = [];
                    async.eachSeries(data,function(e,cb1){
                        psids.push(e.psid);
                        ids.push(e.id);
                        cb1(null);
                    },function(){
                        //psids = psids.toString();
                        cb(null, {data:data,psids:psids,ids:ids});
                    });
                }else{
                    //δ�ҵ�����ʾ��
                    cb(E.WeiStore.FIND_NOTHING);
                }
            });
        },
        f2:['f1',function(cb,result){
            //�����ҵ��Ĺ��ﳵ���ݣ�ƴ�ӹ��ﳵ��Ʒ�б�
            var sql = "select a.id pid,a.name pname,b.id psid,b.name specname,b.inventory " +
                "from gr_product a,gr_product_spec b " +
                "where a.id = b.pid and b.id in ("+result.f1.psids.toString()+")" ;
            M.adapter.query(sql,function(err,data){
                if(err){
                    cb(err)
                }else{
                    cb(null, data);
                }
            });
        }],
        f3:['f2',function(cb,result){
            //����۸�
            var prolist = [];
            async.eachSeries(result.f1.data, function(c,cb1){
                async.eachSeries(result.f2,function(p,cb2){
                    if(parseInt(c.psid) === parseInt(p.psid) ){
                        //������Ʒ
                        if(p.inventory > 0){
                            list.push(c.id);
                        }
                    }
                    cb2(null);
                },function(){
                    cb1(null);
                })
            },function(){
                cb(null,_.difference(result.f1.ids,list));
            });
        }],
        f4:['f1','f2','f3',function(cb,result){
            if(result.f3.length <= 0){
                cb(null, {errno:0,msg:'��������'});
            }else{
                var arg = {
                    table:'gr_user_cart',
                    condition:" id in ("+result.f3.toString()+")"
                };
                M.clear(arg).then(function(data){
                    cb(null, {errno:0,msg:'����ɹ�'})
                }).catch(function(err){
                    cb(err);
                });
            }

        }]
    },function(err,result){
        if(err){
            q.reject(err);
        }else{
            q.resolve(result.f4);
        }
    });
    return q.promise;
};
//�Ż�ȯ����,�������ȫ����Ч�Ż�ȯ�Ϳ����Ż�ȯ
var getUserCoupons = function(M,args0,args1){
    var q = Q.defer() ;
    var now =Math.floor(_.now()/1000);
    var amount = -1 ,
        uid = args0 ;
    if(arguments.length > 1){
        amount = args1 ;
    }
    var sql = "SELECT a.id uc_id,a.cid,a.used,a.validityStartPeriod,a.validityEndPeriod,b.type,b.reduce,b.consume,b.fileurl " +
        "FROM gr_user_coupon a ,gr_coupons b " +
        " where a.uid='"+uid+"' and a.cid = b.id and a.used=0 and b.status=1 and a.delflag=0 and b.delflag=0 and a.used=0 "+
        " and a.validityStartPeriod<"+now+" and a.validityEndPeriod>"+now +
        (amount>-1?" and b.consume<"+amount:"");
    L.info(sql);
    M.adapter.query(sql,function(err,result){
        if(err){
            q.reject(err);
        }else{
            q.resolve(result);
        }
    });
    return q.promise;
};
//��ȡ���ﳵ��Ʒ������۸��
var getCartInfoForAll = function(M,uid,checked){
    var q = Q.defer();
    var uid = uid,
        checked = checked || 0 ; //Ĭ��0��Ϊȫ��
    async.auto({
        //��ȡ���Ʒid
        f0:function(cb){
            var arg = {
                table:'gr_actproclass_cfg',
                condition:'status=1',
                fields:'cid'
            };
            M.find(arg).then(function(data){
                cb(null, _.pluck(data,'cid'));
            })
        },
        //��ȡ���ﳵ����
        f1:function(cb){
            var arg = {
                table:'gr_user_cart',
                condition:"uid = '"+uid+"'"+(checked? " and checked = 1":" ")
            };
            M.find(arg).then(function(data){
                if(data.length > 0){
                    //�ҵ�
                    var psids = [] ;
                    async.eachSeries(data,function(e,cb1){
                        psids.push(e.psid);
                        cb1(null);
                    },function(){
                        //psids = psids.toString();
                        cb(null, {data:data,psids:psids});
                    });
                }else{
                    //δ�ҵ�����ʾ��
                    cb(E.WeiStore.FIND_NOTHING);
                }
            });
        },
        f2:['f1',function(cb,result){
            //�����ҵ��Ĺ��ﳵ���ݣ�ƴ�ӹ��ﳵ��Ʒ�б�
            var sql = "select a.id pid,a.cid,a.name pname,a.picurlarray,a.bin,b.id psid,b.name specname,b.inventory,b.grprice,b.point,b.isDiscount " +
                "from gr_product a,gr_product_spec b " +
                "where a.id = b.pid and b.id in ("+result.f1.psids.toString()+")" ;
            M.adapter.query(sql,function(err,data){
                if(err){
                    cb(err)
                }else{
                    cb(null, data);
                }
            });
        }],
        f2_1:['f1',function(cb,result){
            //��ȡ��Ա��Ʒid
            var hyzx = [] ;
            var sql = "SELECT a.pro_id pid " +
                "FROM gr_act_pro_relations a ,gr_act_title b " +
                "where a.act_id = b.id and b.code='hyzx' and a.delflag=0 and b.delflag=0";
            M.adapter.query(sql, function(err,data){
                if(err){
                    cb(null, hyzx)
                }else{
                    async.eachSeries(data, function(e,cb1){
                        hyzx.push(e.pid);
                        cb1(null);
                    },function(){
                        cb(null, hyzx)
                    });
                }
            })
        }],
        f3:['f0','f2','f2_1',function(cb,result){
            //����۸�
            var prolist = [] ;
            var amount = 0,
                disscount = 0,
                points = 0,
                memberAmount = 0,
                act_pro = 0;
            async.eachSeries(result.f1.data, function(c,cb1){
                async.eachSeries(result.f2,function(p,cb2){
                    if(parseInt(c.psid) === parseInt(p.psid) ){
                        var price = parseFloat(p.grprice) * parseInt(c.number) * parseFloat(c.probability) ;//�޳�������ۿ�
                        var total = parseFloat(p.grprice) * parseInt(c.number) ;//ԭ�ۣ�û���κ��ۿ�
                        var dis = parseFloat(total - price).toFixed(2) ;
                        if(c.checked === 1){
                            amount = (parseFloat(amount) + parseFloat(price)).toFixed(2);
                            disscount = (parseFloat(disscount) + parseFloat(dis)).toFixed(2);
                            points += parseInt(p.point)* parseInt(c.number) ;
                            if(_.indexOf(result.f2_1,p.pid) >=0){ //����ʹ�û�Ա�ۿ�
                                memberAmount = (parseFloat(memberAmount) + parseFloat(total)).toFixed(2);
                            }
                        }
                        if(_.indexOf(result.f0,parseInt(p.cid))>=0){
                            //�л��Ʒ
                            p['act_pro'] = 1;
                            act_pro = 1 ;
                        }else{
                            p['act_pro'] = 0;
                        }
                        p['pid']= p.pid ;
                        p['picurlarray'] = JSON.parse(p.picurlarray)[0];
                        p['pname'] = p.pname ;
                        p['mold'] = c.mold ;
                        p['number'] = c.number ;
                        p['discount'] = dis ;
                        p['checked'] = c.checked ? true:false;
                        p['point'] = p.point ;
                        prolist.push(p);
                    }
                    cb2(null);
                },function(){
                    cb1(null);
                })
            },function(){
                cb(null, {prolist:prolist, amount:amount,discount:disscount,points:points,memberAmount:memberAmount,act_pro:act_pro});
            });
        }],
    },function(err,result){
        if(err){
            q.reject(err)
        }else{
            q.resolve(result.f3);
        }
    });
    return q.promise ;
};
//��ȡ�û���Ϣ��ȫ����
var getUser = function(mApi,uid){
    var q = Q.defer() ;
    var arg = {
        table:'gr_login_info',
        condition:" id = "+uid
    };
    mApi.first(arg).then(function(data){
        q.resolve(data);
    }).catch(function(err){
        q.reject(E.WeiStore.FIND_NOTHING);
    });
    return q.promise;
};
//����������
var chuliGCoin = function(total,gCoin){
    var gcoin = 0 ; //���տ���ʹ�õĹ���
    var discount = 0 ;
    if(gCoin != 0){
        if(total<10){
            discount = 0 ;
        }else if(total>=10 && total<20 ){
            discount = total* (0.1);
        }else if(total>=20 && total<50 ){
            discount = total* (0.15);
        }else if(total>=50 && total<150 ){
            discount = total* (0.2);
        }else if(total>=150 && total<300 ){
            discount = total* (0.3);
        }else if(total>=300){
            discount = total* (0.4);
        }
        if(gCoin >= discount){
            gcoin = discount
        }else{
            gcoin = gCoin
        }
    }
    return parseFloat(gcoin).toFixed(2) ;
};
//�����Ա�ۿۼ������
var memberDiscountjisuan = function(total,level){

    if(total==0){
        return 0;
    }
    var menberDiscount = 1.00 ;

    switch (parseInt(level)){
        case 1:
            menberDiscount = 0.86 ;
            break;
        case 2:
            menberDiscount = 1.00 ;
            break;
        case 3:
            menberDiscount = 0.95 ;
            break;
        case 4:
            menberDiscount = 0.92 ;
            break;
        case 5:
            menberDiscount = 0.90 ;
            break;
        default :
            menberDiscount = 1.00 ;
            break;
    }

    return parseFloat(total*(1-menberDiscount)).toFixed(2) ;
};
//������Ʒid��ȡ��Ʒ��Ϣ
var getProductByIds = function(M,ids){
    var q = Q.defer() ;
    var a = _.isArray(ids) ? true:false ;
    //var sql = "select id,name,picurlarray,intro from gr_product where id in ("+ids+")";
    var sql = "select a.id,a.name,a.picurlarray,a.intro ,a.ptags,a.sales,a.recommend,a.minPrice,ifnull((select c.code from gr_act_pro_relations b,gr_act_title c where a.id = b.pro_id and b.delflag = 0 and c.id=b.act_id),0) act_id from gr_product a where id in ("+ids.toString()+")";

    M.adapter.query(sql ,function(err,data){
        if(err){
            q.reject(err);
        }else{
            var list = [] ;
            async.eachSeries(data,function(e,cb){
                list.push(
                    {
                        pid: e.id,
                        name: e.name,
                        intro: e.intro,
                        minPrice:e.minPrice,
                        imgUrl:JSON.parse(e.picurlarray)[0],
                        ptags:(_.isEmpty(e.ptags)?[]: e.ptags.split(",")),
                        sales: e.sales,
                        recommend: e.recommend,
                        code: e.code
                    }
                );
                cb(null);
            },function(){
                q.resolve(list);
            });
        }
    });
    return q.promise;
};
//������Ʒid��ȡ��Ʒ���� ��Ʒ����ҳʹ��
var getProductInfoById = function(M,id){
    var q = Q.defer() ;
    //var a = _.isArray(id) ? true:false ;
    //var sql = "select id,name,picurlarray,intro from gr_product where id in ("+ids+")";
    var sql = "select a.id,a.status,a.name,a.picurlarray,a.intro ,a.minPrice,a.radix+a.sales sales,a.recommend, ifnull((select c.code from gr_act_pro_relations b,gr_act_title c where a.id = b.pro_id and b.delflag = 0 and c.id=b.act_id),'nomal') code from gr_product a where a.id="+id;
    L.info("getProductInfo");
    L.info(sql);
    M.adapter.query(sql ,function(err,data){
        if(err){
            q.reject(err);
        }else{
            var list = [] ;
            async.eachSeries(data,function(e,cb){
                list.push(
                    {
                        id: e.id,
                        sales: e.sales,
                        recommend: e.recommend,
                        name: e.name,
                        intro: e.intro,
                        minPrice:e.minPrice,
                        imgUrl:e.picurlarray,
                        code: e.code,
                        status: e.status
                    }
                );
                cb(null);
            },function(){
                q.resolve(list);
            });
        }
    });
    return q.promise;
};
//���ݱ�ǩ����Ʒ���ƻ�ȡ��Ʒ�б�name��intro��specname��photourlarray[0]��miniPrice��
var getProductByKey = function(M,key){
    var ptags = key.ptags||'null',
        pname = key.pname||'null',
    //s:sales,r:recommend,p:minPrice
        order = key.order==='p'?"a.minPrice":key.order==='r'?"a.updateAt":"a.sales",//�ؼ��֣�order by xx
        sort = (key.sort=="null")?"desc": key.sort;//sort:asc or desc

    L.info(ptags+pname);
    var sql = "select b.pid ,a.name pname,a.minPrice,a.sales,a.recommend,a.ptags,b.name specname,a.picurlarray,a.intro,b.grprice,b.id specid " +
        "from gr_product a,gr_product_spec b " +
        "where a.id=b.pid and a.status=b.status=1 and a.delflag=0 and b.delflag=0 and a.cid not in (select id from gr_classify where isshow=0)";
    if(ptags != 'null' && pname==='null'){
        sql = sql+" and a.ptags like '%"+ptags+"%'";
    }else if(ptags === 'null' && pname!='null'){
        sql = sql+" and a.name like '%"+pname+"%'";
    }else if(ptags != 'null' && pname!='null'){
        sql = sql+" and a.ptags like '%"+ptags+"%' and a.name like '%"+pname+"%'";
    }
    sql = sql + " order by "+order+" "+sort ;
    L.info(sql);
    var q = Q.defer() ;
    M.adapter.query(sql,function(err,data){
        if(err){
            q.reject(err);
        }else{
            var list = [] ;
            async.eachSeries(data,function(e,cb){
                var spec = {
                    specname: e.specname,
                    grprice: e.grprice,
                    specid: e.specid
                } ;
                if(_.isEmpty(list)){
                    list.push(
                        {
                            pid: e.pid,
                            pname: e.pname,
                            intro: e.intro,
                            ptags: _.isEmpty(e.ptags)?[]: e.ptags.split(","),
                            sales: e.sales,
                            recommend: e.recommend,
                            minPrice: e.minPrice,
                            imgUrl:JSON.parse(e.picurlarray)[0],
                            spec:spec
                        }
                    );
                    cb(null, list);
                }else{
                    var flag = false ;
                    async.eachSeries(list,function(l,cb1){
                        if(l.pid === e.pid){
                            flag = true ;
                            if(e.grprice <= l["spec"].grprice ){
                                l["spec"] = spec ;
                            }
                        }
                        cb1(null);
                    },function(){
                        if(!flag){
                            //û�и��µ��κ����ݣ��򴴽�
                            list.push(
                                {
                                    pid: e.pid,
                                    pname: e.pname,
                                    intro: e.intro,
                                    ptags: _.isEmpty(e.ptags)?[]: e.ptags.split(","),
                                    sales: e.sales,
                                    recommend: e.recommend,
                                    minPrice: e.minPrice,
                                    imgUrl:JSON.parse(e.picurlarray)[0],
                                    spec:spec
                                }
                            )
                        }
                        cb(null, list);
                    });
                }
            },function(){
                q.resolve(list);
            });
        }
    });
    return q.promise;
};
//��ȡ�����б������Ļ�ȡ�����б�,��������ҳʹ�õ�,��ȡÿ�������µ����µ�һ��
var getArticleList = function(M){
    var q = Q.defer() ;
    var sql = "select a.*  " +
        "from gr_article a " +
        "where a.delflag = 0 " +
        "and a.status=1 and a.articlerecommend=1 and " +
        "a.updateAt in ( SELECT max(b.updateAt) updateAt FROM gr_article b where b.delflag = 0 and  b.status=1 and  b.articlerecommend=1 group by  b.articletype) " +
        " order by a.createAt desc limit 0,2 ";
    M.adapter.query(sql, function(err,data){
        if(err){
            q.reject(err);
        }else{
            if(!_.isEmpty(data)){
                async.eachSeries(data,function(e,cb){
                    e['img'] = JSON.parse(e.picurlarray)[0] ;
                    cb(null);
                },function(){
                    q.resolve(data);
                })
            }else{
                q.resolve([]);
            }
        }
    });
    return q.promise;
};
//��ȡȫ�������б�
var articleList = function(M,args){
    var q = Q.defer() ;
    var type = args.type || "null",
        pids = args.pids || "null",
        page = args.page || 0,
        pageSize = 20;
    var sql = "select a.id,a.articletype,a.articletitle,a.articleintroduce,a.picurlarray," +
        "a.zan,a.read_rate " +
        "from gr_article a " +
        "where a.delflag = 0 " +
        "and a.status=1 and a.articlerecommend=1 ";
    if(type != "null"){
        sql = sql + " and a.articletype="+type ;
    }
    if(pids != "null"){
        sql = sql + " and a.articlerelationpids="+pids ;
    }
    sql = sql +"order by a.createAt desc limit "+page*pageSize+","+pageSize;
    M.adapter.query(sql,function(err,data){
        if(err){
            q.reject(err);
        }else{
            var result = _.each(data,function(num){
                num['picurlarray']=JSON.parse(num.picurlarray)[0];
                return num;
            });
            q.resolve(result);
        }
    });
    return q.promise;
};
//���µ���
var articleZan = function(M,key){
    var uid = key.uid,
        a_id = key.id,
        now = Math.floor(_.now()/1000);
    var q = Q.defer() ;
    async.waterfall([
        function(cb){
            //�ж��û��Ƿ��޹�������
            var arg ={
                table:"gr_article_zan",
                condition:" action=0 and article_id="+a_id+" and uid="+uid
            };
            M.count(arg).then(function(data){
                cb(null, data);
            }).catch(function(err){
                cb(err);
            });
        },
        function(c,cb){
            if(c === 0){
                //û�޹���������
                //ÿ��һ�Σ�����һ������
                var arg ={
                    table:"gr_article_zan",
                    row:{
                        uid:uid,
                        article_id:a_id,
                        action:0,
                        createAt:now,
                        updateAt:now
                    }
                };
                M.create(arg).then(function(data){
                    cb(null,0)
                }).catch(function(err){
                    cb(err)
                });
            }else{
                cb(null,1);
            }
        },
        function(c,cb){
            if(c === 0){
                //�������е�zan���һ����¼
                var arg ={
                    table:"gr_article",
                    id:a_id
                };
                M.get(arg).then(function(data){
                    var arg1 = {
                        table:"gr_article",
                        condition:" id = "+a_id,
                        row:{
                            zan: data.zan+1,
                            updateAt:now
                        }
                    };
                    M.update(arg1).then(function(data){
                        cb(null, 0);
                    }).catch(function(err){
                        cb(err);
                    });
                }).catch(function(err){
                    cb(err);
                });
            }else{
                cb(null, 0);
            }
        }
    ],function(err,result){
        if(err){
            q.reject(err);
        }else{
            q.resolve(result);
        }
    });
    return q.promise ;
};
var getArticleZan = function(M,key){
    var uid = key.uid,
        a_id = key.id,
        now = Math.floor(_.now()/1000);
    var q = Q.defer() ;
    //ÿ��һ�Σ�����һ������
    var arg ={
        table:"gr_article_zan",
        condition:" action=0 and article_id="+a_id+" and uid="+uid
    };
    M.count(arg).then(function(data){
        q.resolve(data);
    }).catch(function(err){
        q.reject(err);
    });
    return q.promise ;
};
//ÿ���Ķ����£���¼ÿ�����Ķ���ͬ������,������ ��������
var personalReads = function(M,args){
    var q = Q.defer() ;
    var art_id = args.id,
        uid = args.uid ;
    var now = Math.floor(_.now()/1000),
        start = new Date(new Date().toDateString()).getTime();
    async.waterfall([
        function(cb){
            //��������
            var arg = {
                table:"gr_article_zan",
                condition:"article_id="+art_id+" and uid="+uid
            };
            M.first(arg).then(function(data){
                if(!_.isEmpty(data)){
                    cb(null, {code:2,msg:'���Ķ���'})
                }else{
                    //δ�ҵ�
                    cb(null, {code:1,msg:'δ�Ķ�'})
                }
            })
        },
        function(d,cb){
            if(d.code === 1){
                //��ȡ������Ķ���
                var arg = {
                    table:"gr_article_zan",
                    condition:" uid="+uid+" and action=1 and createAt>="+start+" and createAt<="+now
                };
                M.count(arg).then(function(c){
                    if(c>=3){
                        cb(null, {code:2,msg:'�ѳ���'})
                    }else{
                        cb(null, {code:1,msg:'���Է���'})
                    }
                })
            }else{
                cb(null, {code:2,msg:'���Ķ���'})
            }

        },
        function(d,cb){
            if(d.code === 1){
                //����һ������
                var arg = {
                    table:"gr_article_zan",
                    row:{
                        uid:uid,
                        article_id:art_id,
                        action:1,
                        createAt:now,
                        updateAt:now
                    }
                };
                M.create(arg).then(function(data){
                    cb(null, {code:1,msg:'�����ɹ�',id:data.insertId});
                }).catch(function(err){
                    cb(err);
                });
            }else{
                cb(null, {code:2,msg:'���Ķ���'})
            }
        },
        function(a,cb){
            if(a.code === 1){
                var zan_id = a.id ;
                //�ӿ���
                cb(null, {code:0});
            }else{
                cb(null, {code:0});
            }
        },
        function(a,cb){
            //����Ӧ���µ��Ķ�������1
            var arg = {
                table:"gr_article",
                id:art_id
            };
            M.get(arg).then(function(data){
                var arg1 = {
                    table:"gr_article",
                    condition:"id="+art_id,
                    row:{
                        read_rate:data.read_rate+1,
                        updateAt:now
                    }
                };
                M.update(arg1).then(function(){
                    cb(null, {code:0});
                }).catch(function(err){
                    cb(err);
                })
            }).catch(function(err){
                cb(err);
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
var getLogisticsFlow = function(mApi,orderid){
    var q = Q.defer() ;
    var sql = "SELECT  b.*,c.name,c.phone " +
        "FROM lg_mission a ,lg_mission_flow b ,lg_courier c " +
        "where a.code='"+orderid+"' and b.mission_id=a.code and b.uid=c.id order by b.updateAt desc" ;
    mApi.adapter.query(sql,function(err,data) {
        if (err) {
            q.reject(err);
        } else {
            q.resolve(data);
        }
    });
    return q.promise;
};
//�ж��Ƿ�Ϊͬһ��
var isOneDay = function(d1,d2,d3){
    var start = new Date(d1).toDateString(),
        now = new Date(d2).toDateString();
    return m(now).isSame(start);
};
//����ʱ����
var clearOutTimeOrders = function(M){
    var q = Q.defer() ;
    var now = +(_.now().toString().substr(0,10));
    var times = 1800 ;
    async.auto({
        f1:function(cb){
            //ͨ��groupby��䣬�������ݵ����ϣ�������Դ����
            var sql = "SELECT b.specid ,sum(b.cartnum) num FROM gr_final_order a , gr_final_order_goods b where "+ now+" -  left(a.createAt,10) >= "+times+" and a.status in (1000,1500)  and a.orderid = b.orderid" ;
            M.adapter.query(sql,function(err,data){
                if(err){
                    cb(err);
                }else{
                    cb(null, data);
                }
            });
        },
        f2:['f1',function(cb,result){
            var orderlist = [] ;
            async.eachSeries(result.f1,function(e,cb1){
                orderlist.push(e.orderid);
                var sql = "UPDATE gr_product_spec SET inventory = inventory+"+e.num+" WHERE id = "+ e.specid ;
                M.adapter.query(sql,function(err,data){
                    cb1(null)
                });
            },function(){
                cb(null,orderlist);
            });
        }],
        f3:["f2",function(cb,result){
            var sql = "update gr_final_order set status=-2 where "+ now+" -  left(createAt,10) >= "+times+" and status in (1000,1500)" ;
            M.adapter.query(sql,function(err,data){
                if(err){
                    cb(err);
                }else{
                    cb(null, data);
                }
            });
        }]
    },function(err,result){
        if(err){
            q.reject(err);
        }else{
            q.resolve(result.f2);
        }
    });
    return q.promise;
};
var clearOutTimeCartPro = function(M){
    var q = Q.defer() ;
    var now = +(_.now().toString().substr(0,10));
    var times = 1800 ;
    var sql = "update gr_user_cart set delflag=1 where "+ now+" -  left(updateAt,10) >= "+times+" and delflag=0" ;
    M.adapter.query(sql,function(err,data){
        if(err){
            q.reject(err);
        }else{
            q.resolve(data);
        }
    });
    return q.promise;
};
var giveMemberCoupons = function(M){
    var q = Q.defer() ;
    var now = Math.floor(_.now()/1000);
    async.waterfall([
        function(cb){
            //读取配置表gr_config
            var arg = {
                table:'gr_config',
                condition:'name="MEMBER_TIMING_COUPONS_RULE" and status=1'
            };
            M.first(arg).then(function(data){
                var rules = JSON.parse(data.value) ;
                if(_.isEmpty(rules)){
                    cb(E.Server.NO_MEMBER_TIMING_COUPONS_RULE)
                }else{
                    cb(null,rules);
                }
            });
        },
        function(rules,cb){
            //根据规则发放定时达券
            var level = rules.level || -1,
                cid = rules.cid || -1,
                count = rules.count || -1,
                status = rules.status || 1,//0:禁用，1：启用
                days = rules.days || 10,//开始时间后的总天数，例如:开始时间=A ,结束时间=A+days ,-1表示不启用

                start = rules.start || -1,//必须,主要是为了记录开始的时间（HH:mm）
                end = start;//必须,主要是为了记录结束的时间（HH:mm）
            if(status === 0){
                return q.reject({status:0,msg:'不发放会员定时达券'});
            }
            if(level && cid && count && start && end){
                if((start+'').length<=10){
                    start = start*1000;
                }
                start = new Date(new Date(start).getFullYear(),new Date(start).getMonth(),new Date(start).getDate()).getTime();
                start = Math.floor(start/1000);
                end = Math.floor((start*1000 + days*3600*1000*24)/1000) ;
                var sql = "insert into gr_ec.gr_timeservice_membercoupons (type,uid,cid,count,usestarttime,useendtime,delflag,createAt,updateAt) " +
                    "select 2,id,"+cid+","+count+","+start+","+end+",0,"+now+","+now+" from gr_api.gr_login_info where level="+level+" and status=1";
                M.adapter.query(sql,function(err,data){
                    if(err){
                        cb(err);
                    }else{
                        cb(null, {status:0});
                    }
                })
            }else{
                cb(E.Server.RULE_ERROR)
            }
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

module.exports = {
    clearCartInvalid:clearCartInvalid,
    getUserCoupons:getUserCoupons,
    getCartInfoForAll:getCartInfoForAll,
    getUser:getUser,
    chuliGCoin:chuliGCoin,
    memberDiscountjisuan:memberDiscountjisuan,
    getProductByIds:getProductByIds,
    getProductInfoById:getProductInfoById,
    getProductByKey:getProductByKey,
    getArticleList:getArticleList,
    articleList:articleList,
    articleZan:articleZan,
    getArticleZan:getArticleZan,
    personalReads:personalReads,
    getLogisticsFlow:getLogisticsFlow,
    clearOutTimeOrders:clearOutTimeOrders,
    clearOutTimeCartPro:clearOutTimeCartPro,
    giveMemberCoupons:giveMemberCoupons

}