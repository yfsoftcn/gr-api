'use strict';
var Q = require('q');
var C = require('../../config.js');
var FastDBM = require('yf-fast-dbm');
var M = FastDBM(C.db.erp);
M.foo = function(){
    var q = Q.defer();
    q.resolve({msg:'hi there from v0.0.1'});
    return q.promise;
};
module.exports = M;