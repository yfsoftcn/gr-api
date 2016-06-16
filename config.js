var k = require('./key.js');

var getDbConfig = function(option){
    var originConfig = {
        host: 'localhost',
        port:3306,
        username:'root',
        password:'',
        debug:false,
        pool:{
            connectionLimit:10,
            queueLimit:0,
            waitForConnections:true
        }
    };
    for(var key in k.db){
        originConfig[key] = k.db[key];
    }
    for(var key in option){
        originConfig[key] = option[key];
    }
    return originConfig;
};
module.exports = {
    db:(function(database){
        var _dbs = {};
        for(var d in database){
            _dbs[d] = getDbConfig({database:database[d]});
        }
        return _dbs;
    })(k.database),
    server:{
        port: k.dev == 'PRODUCT'?9001:8080
    },
    defaultVersion:'0.0.1',
    dev:k.dev,
    bizRestApi: k.bizRestApi,
    CloudKeys : k.CloudKeys,
    EMail:k.EMail
};