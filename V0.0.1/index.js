'use strict';
var FastDBM = require('yf-fast-dbm');
module.exports = function(C){
    var M = {
        erp: FastDBM(C.db.erp),
        api: FastDBM(C.db.api),
        activity: FastDBM(C.db.activity),
        ec : FastDBM(C.db.ec),
        config:C,
        rest : require('./rest')(C)
    };
    var bizModules = {};
    //bizModules.activity = require('./activity')(M,bizModules);
    bizModules.api = require('./api')(M,bizModules);
    bizModules.common = require('./common')(M,bizModules);
    //bizModules.ec = require('./ec')(M,bizModules);
    bizModules.erp = require('./erp')(M,bizModules);
    bizModules.job = require('./job')();
    bizModules.order = require('./order')(M,bizModules);
    return bizModules;
};