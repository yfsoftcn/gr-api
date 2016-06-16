'use strict';
var Q = require('q');
var _ = require('underscore');
var async = require('async');
var E = require('../../error');
//设置ERP db链接
var C = require('../../config.js');
var FastDBM = require('yf-fast-dbm');
var M = FastDBM(C.db.erp);

module.exports = M;
require('./func/inventory')(M);
