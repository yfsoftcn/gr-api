'use strict';
//设置Activity db链接
var _ = require('underscore');
var AV = require('leanengine');

module.exports = function(M,B){
    //activity模块对应的是activity数据库
    var _mActivity = _.clone(M.activity);

    //打开leancloud的连接
    var config = B.config;
    AV.initialize(config.CloudKeys.APP_ID, config.CloudKeys.APP_KEY, config.CloudKeys.MASTER_KEY);
    AV.Cloud.useMasterKey();
    AV.Promise._isPromisesAPlusCompliant = false;

    require('./func/foo')(_mActivity,B);
    return _mActivity;
};