'use strict';
//设置Activity db链接
var FastDBM = require('yf-fast-dbm');
module.exports = function(C){
    var M = FastDBM(C.db.activity);
    require('./func/foo')(M,C);
    return M;
};