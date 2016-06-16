var dev = (function(){
    if('linux' == process.platform){
        //在linux环境中运行
        if(__dirname.indexOf('home/yfsoft/Workspace')>0){
            console.log('DEV模式');
            return 'DEV';
        }
        //在linux环境中运行
        if(__dirname.indexOf('data/www/apiv3')>=0){
            console.log('PRODUCT模式');
            return 'PRODUCT';
        }
        //在linux环境中运行
        if(__dirname.indexOf('data/api')>=0){
            console.log('PRODUCT模式');
            return 'PRODUCT';
        }
        console.log('STAGING模式');
        //判断执行的目录
        return 'STAGING';
    }
    console.log('DEV模式');
    return 'DEV';
})();
var PRODUCT_HOST = '10.10.189.166';
var STAGING_HOST = '127.0.0.1';
var DEV_HOST = '192.168.1.218';
var ERP_DBNAME = 'gr_erp';                  //erp数据库
var API_DBNAME = 'gr_api';                  //通用接口数据库
var EC_DBNAME = 'gr_ec';              //运营平台数据据
var ACTIVITY_DBNAME = 'gr_activity';        //活动数据库

var getDbConfig = function(option){
    var originConfig = {
        host:(function(mode){
            switch(mode){
                case 'DEV':
                    return DEV_HOST;
                case 'STAGING':
                    //STAGING环境使用的数据库均在库名后面添加一个_stag
                    option.database = option.database+'_stag';
                    return STAGING_HOST;
                case 'PRODUCT':
                    return PRODUCT_HOST;
            }
        })(dev),
        port:3306,
        //database:'gr_erp',
        username:'dbadmin',
        password:'87252798',
        debug:false,
        pool:{
            connectionLimit:10,
            queueLimit:0,
            waitForConnections:true
        }
    };
    for(var k in option){
        originConfig[k] = option[k];
    }
    return originConfig;
};
module.exports = {
    db:{
        erp:getDbConfig({database:ERP_DBNAME}),
        api:getDbConfig({database:API_DBNAME}),
        ec:getDbConfig({database:EC_DBNAME}),
        activity:getDbConfig({database:ACTIVITY_DBNAME})
    },
    server:{
        port:dev == 'PRODUCT'?9001:8080
    },
    defaultVersion:'0.0.1',
    dev:dev,
    bizRestApi:{
        url:(function(mode){
            switch(mode){
                case 'DEV':
                    return 'http://192.168.1.223:8090';
                case 'STAGING':
                    //STAGING环境使用的数据库均在库名后面添加一个_stag
                    return 'http://127.0.0.1:8091';
                case 'PRODUCT':
                    return 'http://180.150.187.159:8090';
            }
        })(dev),
        version: '~1.0'
    },
    log4js: {
        appenders: [
            { type: 'console' },{
                type: 'file',
                filename: 'logs/access.log',
                maxLogSize: 1024 * 1024 * 100, //100Mb一个文件
                backups:10,
                category: 'normal'
            }
        ],
        replaceConsole: true
    },
    qiniu:{
        bucket:'yfdocument',
        ACCESS_KEY:'65nep44MNB8Ft1v_L1f7jaSnP8P07buuMMN4kI81',
        SECRET_KEY:'kZxy-i93_B98yg4lNn7XmSujeZh_JWRxQOJX3E_m'
    }
};


var DEV_KEYS = {
    APP_ID:'64yipwcn159l9ehdf3j3x3xz1f1ly9r89x9gf7i2d1282dvz',
    APP_KEY:'w3xp0oibbzhweamm76ogo6r5dyzt82tczw7lssfvyj6hlarv',
    MASTER_KEY:'zlf6rkt286shvykgo08dht3938tg3ln2idvfcu7t61h1ngfq'
};
var PRODUCT_KEYS = {
    APP_ID:'8c4dst8wuiimm9nxj8puwrqrhmkxegkl2ittuy6a2jkmx1pl',
    APP_KEY:'6lqn0keuf89uzoj8px4t47u9e39eimx7jo7ad1qy9pd125nm',
    MASTER_KEY:'lgdpvs1cjc2nab37rlkv6i34hfi6q6r0n87ut5ootaebdndp'
};
module.exports.CloudKeys = (function(){
    switch (dev){
        case 'DEV':
            return DEV_KEYS;
        //return STAGING_KEYS;
        case 'STAGING':
            return DEV_KEYS;
        //return STAGING_KEYS;
        case 'PRODUCT':
            return PRODUCT_KEYS;
    }
})();
var DEV_MAIL = {
    email:'921850425@qq.com',
    pass:'gzzkuqqoeoxcbdgh',
    smtp:'smtp.qq.com'
};
var PRODUCT_MAIL = {
    email : 'shiguo365@126.com',
    pass : 'shiguo365',
    smtp : 'smtp.126.com'
}
module.exports.EMail=(function(){
    switch (dev){
        case 'DEV':
            return DEV_MAIL;
        //return STAGING_KEYS;
        case 'STAGING':
            return DEV_MAIL;
        //return STAGING_KEYS;
        case 'PRODUCT':
            return PRODUCT_MAIL;
    }
})();