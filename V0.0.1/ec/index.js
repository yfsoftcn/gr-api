'use strict';
var FastDBM = require('yf-fast-dbm');
module.exports = function(C){
    var M = FastDBM(C.db.ec);
    require('./func/weistore')(M,C);
    require('./func/tuangou')(M,C);
    require('./func/act')(M,C);
    require('./func/foretaste')(M,C);
    require('./func/order')(M,C);
    require('./func/user')(M,C);
    require('./func/analysis')(M,C);
    require('./func/timing')(M,C);
    require('./func/server')(M,C);
    return M;
};