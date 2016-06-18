'use strict';
module.exports = function(C){
 return {
        //activity:require('./activity')(C),
        //api:require('./api')(C),
        common:require('./common')(C),
        //ec:require('./ec')(C),
        //erp:require('./erp')(C),
        //job:require('./job')(C),
        //order:require('./order')(C)
    };
};