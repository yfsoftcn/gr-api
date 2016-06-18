'use strict';
var _ = require('underscore');
module.exports = function(M,B){
    //api模块对应的是api数据库
    var _mApi = _.clone(M.api);
    require('./func/logistics')(_mApi,B);
    require('./func/push')(_mApi,B);
    require('./func/version')(_mApi,B);
    require('./func/shop')(_mApi,B);
    require('./func/user')(_mApi,B);
    return _mApi;
};