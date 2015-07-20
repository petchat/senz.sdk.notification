var AV = require("leanengine");
var _  = require("underscore");

var User      = AV.Object.extend("_User");
var sdkConfig = AV.Object.extend("sdkConfig");


var _findAll = function (query){
    return query.count().then(
        function (count){
            var promises = [];
            var pages    = Math.ceil(count/1000);
            for (var i = 0; i <= pages; i ++){
                var _query = _.clone(query);
                _query.limit(1000);
                _query.skip(i*1000);
                promises.push(_query.find());
            }
            return AV.Promise.all(promises);
        },
        function (error){
            return AV.Promise.error(error);
        }
    ).then(
        function (results){
            var rebuid_result = [];
            results.forEach(function (result_list){
                result_list.forEach(function (list_item){
                    rebuid_result.push(list_item);
                });
            });
            return AV.Promise.as(rebuid_result);
        },
        function (error){
            return AV.Promise.error(error);
        }
    );
};

exports.getAllUsers = function (){
    var query = new AV.Query(User);
    return _findAll(query).then(
        function (users){
            var user_id_list = [];
            users.forEach(function (user){
                user_id_list.push(user.id);
            });
            return AV.Promise.as(user_id_list);
        },
        function (error){
            return AV.Promise.error(error);
        }
    );
};

exports.updateUserConfiguration = function (user_id, content){
    var user_config  = new sdkConfig();
    var user_pointer = AV.Object.createWithoutData("_User", user_id);
    user_config.set("user", user_pointer);
    user_config.set("content", content);
    return user_config.save();
};