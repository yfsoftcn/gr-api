'use strict';
var yfserver = require('yf-api-server');
var job = yfserver.job;
module.exports = function() {
    return {
        run: function (args) {
            var eventId = args.eventId;
            delete args.eventId;
            return job(eventId,args);
        },
        query:function(args){
            throw new Error('use api.get get the task detail~');
        }
    }
}