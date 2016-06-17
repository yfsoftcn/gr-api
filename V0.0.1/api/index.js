var FastDBM = require('yf-fast-dbm');
module.exports = function(C){
    var M = FastDBM(C.db.api);
    require('./func/logistics')(M,C);
    require('./func/push')(M,C);
    require('./func/version')(M,C);
    require('./func/shop')(M,C);
    require('./func/user')(M,C);
    return M;
};