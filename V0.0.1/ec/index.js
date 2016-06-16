'use strict';

//设置EC db链接
var C = require('../../config.js');
var FastDBM = require('yf-fast-dbm');
var M = FastDBM(C.db.ec);

module.exports = M;
require('./func/weistore')(M);
require('./func/tuangou')(M);
require('./func/act')(M);
require('./func/foretaste')(M);
require('./func/order')(M);
require('./func/user')(M);
require('./func/analysis')(M);
require('./func/timing')(M);
require('./func/server')(M);