module.exports = {
    Object:{
        CREATE_ERROR:{errno:-1,code:'CREATE_ERROR',message:'create function should be called by a new object'},
        SAVE_ERROR:{errno:-2,code:'SAVE_ERROR',message:'save function should be called behind get or create'},
        REMOVE_ERROR:{errno:-3,code:'REMOVE_ERROR',message:'remove function should be called behind get or create'},
        OBJECT_ID_NOT_FIND:{errno:-4,code:'OBJECT_ID_NOT_FIND',message:'Object does not find by id or more rows'},
        UPDATE_ERROR:{errno:-5,code:'UPDATE_ERROR',message:'Nothing changed!'},
    },
    User:{
        NOT_EXISTS:{errno:-11,code:'NOT_EXISTS',message:"login_name does't exists!"},
        PASSWORD_ERROR:{errno:-12,code:'PASSWORD_ERROR',message:"password error!"},
        ZAN_OUT_LIMIT:{errno:-13,code:'ZAN_OUT_LIMIT',message:"ZAN OUT LIMIT"},
    },
    System:{
        //uncaught
        AUTH_ERROR:{errno:-920,code:'AUTH_ERROR',message:'auth error! plz check your appkey ~ '},
        ROOT_ERROR:{errno:-921,code:'ROOT_ERROR',message:'auth error! plz check roots of your app  ~ '},
        UNCAUGHT_ERROR:{errno:-998,code:'UNCAUGHT_ERROR',message:"uncaughtException!"},
        NOT_LATEST:{errno:-907,code:'NOT_LATEST',message:"Not the latest version"},
        SQL_INJECTION:{errno:-906,code:'SQL_INJECTION',message:"you have sql keyword! ex:['drop ','delete ','truncate ',';','insert ','update ','set ','use ']"},
        NO_POST_DATA:{errno:-901,code:'NO_POST_DATA',message:"post data is empty!"},
        PARAM_IS_NOT_JSON:{errno:-905,code:"PARAM_IS_NOT_JSON",message:"Param is not json!"},
        LOST_PARAM:function(col){ return {errno:-900,code:'LOST_PARAM',message:"param: " + col + " required!"}},
        TIMEZONE_OVER:{errno:-902,code:'TIMEZONE_OVER',message:"your time zone not sync the server!"},
        SIGN_ERROR:{errno:-903,code:'SIGN_ERROR',message:"param sign error!"},
        NOT_METHOD:{errno:-908,code:'NOT_METHOD',message:"Cant find the method!"},
        TABLE_REQUIRED:{errno:-910,code:'TABLE_REQUIRED',message:"table required!"},
        FILE_TOO_LARGE:{errno:-911,code:'FILE_TOO_LARGE',message:'file too large,plz < 100MB'},
        FILE_TYPE_REJECT:{errno:-912,code:'FILE_TYPE_REJECT',message:'file only accept json,zip'},
        QINIU_SYNC_ERROR:{errno:-913,code:'QINIU_SYNC_ERROR',message:'sync file to qiniu error!'}

    },
    PayNotify:{
        NO_RECORD:{errno:-21,code:'NO_RECORD',message:'No Record Find!'}
    },
    Logistics:{
        EC_STATUS_NOT_ALLOW_ACCEPT:{errno:-41,code:'EC_STATUS_NOT_ALLOW_ACCEPT',message:'EC STATUS NOT ALLOW ACCEPT'},
        LG_STATUS_NOT_ALLOW_ACCEPT:{errno:-42,code:'LG_STATUS_NOT_ALLOW_ACCEPT',message:'LG STATUS NOT ALLOW ACCEPT'},
        LG_MISSION_EXIST:{errno:-43,code:'LG_MISSION_EXIST',message:'LG MISSION EXIST'},
        NO_SUCH_ORDER:{errno:-44,code:'NO_SUCH_ORDER',message:'NO SUCH ORDER'},
        FAR_AWAY:{errno:-45,code:'FAR_AWAY',message:'FAR AWAY'},
        LBS_EORROR:{errno:-46,code:'LBS_EORROR',message:'LBS_EORROR'},
        NO_SUCH_COURIER:{errno:-47,code:'NO_SUCH_COURIER',message:'NO SUCH COURIER'}
    },
    Mail:{
        API_FIRST_ERROR:{},
        API_FIND_ERROR:{},
        SEND_MAILS_ERROR:{errno:-41,code:'SEND_MAILS_ERROR',message:'SEND EMAIL ERROR'}
    },
    WeiStore:{
        FIND_NOTHING:{errno:-100,code:'FIND_NOTHING',message:'FIND NOTHING'},
        QUERY_ERROR:{errno:-101,code:'QUERY_ERROR',message:'QUERY ERROR'},
        EVALUATION_ERROR:{errno:-102,code:'EVALUATION_ERROR',message:'CREATE EVALUATION FAILED'},
        COUPON_ALREADY_ACCEPTED:{errno:-103,code:'COUPON_ALREADY_ACCEPTED',message:'COUPON ALREADY ACCEPTED'},
        CART_NO_GOODS:{errno:-104,code:'CART_NO_GOODS',message:'CART NO GOODS'},
        TIMING_CODE_NOT_EXIST:{errno:-105,code:'TIMING_CODE_NOT_EXIST',message:'TIMING CODE NOT EXIST'},
        TIMING_CODE_INVALID:{errno:-106,code:'TIMING_CODE_INVALID',message:'TIMING CODE INVALID'},
        NO_TIMING_COUPONS:{errno:-107,code:'NO_TIMING_COUPONS',message:'NO TIMING COUPONS'},
        PC_LOGIN_ERR:{errno:-108,code:'PC_LOGIN_ERR',message:'PC LOGIN ERR'},
        YOU_ARE_NOT_VIP:{errno:-109,code:'YOU_ARE_NOT_VIP',message:'YOU ARE NOT VIP'},
        YOU_NOT_ALLOW_APPLY_TRANS:{errno:-110,code:'YOU_NOT_ALLOW_APPLY_TRANS',message:'YOU NOT ALLOW APPLY TRANS'},
        YOU_HAVE_NO_BALANCE:{errno:-111,code:'YOU_HAVE_NO_BALANCE',message:'YOU HAVE NO BALANCE'},
    },
    Tuangou:{
        GROUP_OUTTIME:{errno:-170,code:'GROUP_OUTTIME',message:'GROUP OUTTIME'},
        PRODUCT_OUTTIME:{errno:-171,code:'PRODUCT_OUTTIME',message:'PRODUCT OUTTIME'},
        ALREADY_IN_GROUP:{errno:-172,code:'ALREADY_IN_GROUP',message:'ALREADY IN GROUP'},
        NO_SUCH_PRODUCT:{errno:-173,code:'NO_SUCH_PRODUCT',message:'NO SUCH PRODUCT'},
        USER_NOT_EXIST:{errno:-174,code:'USER_NOT_EXIST',message:'USER NOT EXIST'},
        NO_SUCH_GROUP:{errno:-175,code:'NO_SUCH_GROUP',message:'NO SUCH GROUP'},
    },
    Job:{
        EVENT_NOT_EXIST:{errno:-180,code:'EVENT_NOT_EXIST',message:'event dont find in webevent list'},
        JOB_ID_EMPTY:{errno:-181,code:'JOB_ID_EMPTY',message:'job id required !'},
        JOB_PENDING:{errno:-182,code:'JOB_PENDING',message:'job is pending! call it later~'}
    },
    Server:{
        NO_MEMBER_TIMING_COUPONS_RULE:{errno:-190,code:'NO_MEMBER_TIMING_COUPONS_RULE',message:'member timing coupons config is not exist,please update gr_config MEMBER_TIMING_COUPONS_RULE'},
        RULE_ERROR:{errno:-191,code:'RULE_ERROR',message:'rule config is invalid ,examp:{"leve":1,"cid":1,"count":3,"start":1465866000,"end":1466038800}'},
    }
}