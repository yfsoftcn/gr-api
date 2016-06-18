'use strict';
module.exports = function(M,B){
    var rest = B.rest;
    M.shop = {
        //门店同步日结数据的接口
        syncData:function(args){
            return rest.invoke('/shop/syncData',args);
        }
    };
    return M;
}