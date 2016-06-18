'use strict';
var _ = require('underscore');
module.exports = function(M,B){
    var _mEc = _.clone(M.ec);
    _mEc.util = require('./func/common.js');
    require('./func/weistore')(_mEc,B);
    require('./func/tuangou')(_mEc,B);
    require('./func/act')(_mEc,B);
    require('./func/foretaste')(_mEc,B);
    require('./func/order')(_mEc,B);
    require('./func/user')(_mEc,B);
    require('./func/analysis')(_mEc,B);
    require('./func/timing')(_mEc,B);
    require('./func/server')(_mEc,B);
    return _mEc;
};