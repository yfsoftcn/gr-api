'use strict';
var Q = require('q');
var _ = require('underscore');
var yfserver = require('yf-api-server');
var job = yfserver.job;


module.exports = {
    run: function (args) {
        var eventId = args.eventId;
        delete args.eventId;
        return job(eventId,args);
    },
    query:function(args){
        throw new Error('use api.get get the task detail~');
    }
}