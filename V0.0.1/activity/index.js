'use strict';
//设置EC db链接
var C = require('../../config.js');
var FastDBM = require('yf-fast-dbm');
var M = FastDBM(C.db.activity);
require('./func/foo')(M);
module.exports = M;