'use strict';
var _ = require('underscore');
module.exports = function(M,B){
    //common模块对应的是erp数据库
    var _mCommon = _.clone(M.erp);
    return _mCommon;
};