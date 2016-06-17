'use strict';
var FastDBM = require('yf-fast-dbm');
module.exports = function(C){
    var M = FastDBM(C.db.erp);
    require('./func/inventory')(M,C);
    return M;
};
