'use strict';
var _ = require('underscore');
module.exports = function(M,B){
    //erp模块对应的是erp数据库
    var _mErp = _.clone(M.erp);
    require('./func/inventory')(_mErp,B);
    return _mErp;
};
