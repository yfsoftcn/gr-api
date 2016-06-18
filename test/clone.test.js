var assert = require('chai').assert;
var _ = require('underscore');
describe('Function', function(){
    it('clone function', function(done){
        var M = {api:{val:1},erp:{val:2}};
        var _m = _.clone(M);
        _m.test = {val:3};
        _m.erp.val = 12;
        console.log(_m);console.log(M);

        assert.equal(_m, M);

    });

    it('clone function', function(done){
        var M = {api:{val:1},erp:{val:2}};
        var _m = _.extendOwn(M);
        _m.test = {val:3};
        _m.erp.val = 12;
        console.log(_m);console.log(M);

        assert.equal(_m, M);

    });
    /*
     it('find', function(done){
     var query = new AE.Query('api_webevent');
     query.and(" status>0 ");
     query.find().then(function(data){
     console.log(data);
     done();
     }).catch(function(err){
     console.log('err');
     done(err);
     });
     });//*/
});
