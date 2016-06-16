'use strict';
var Q = require('q');
var _ = require('underscore');
var async = require('async');
var E = require('../../error');
//设置API db链接
var C = require('../../config.js');
var FastDBM = require('yf-fast-dbm');
var M = FastDBM(C.db.api);


module.exports = M;
require('./func/logistics')(M);
require('./func/push')(M);
require('./func/version')(M);
require('./func/shop')(M);
require('./func/user')(M);