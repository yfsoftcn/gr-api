var config = require('./config.js');

var yfserver = require('yf-api-server');

var app = yfserver(config);

app.setBizModules({'0.0.1':require('./V0.0.1')(config)});//添加对应业务版本的代码

app.start();