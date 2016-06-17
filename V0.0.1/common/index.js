'use strict';
var FastDBM = require('yf-fast-dbm');
module.exports = function(C){
    var M = FastDBM(C.db.erp);
    return M;
};