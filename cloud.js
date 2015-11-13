var AV  = require("leanengine");
var M   = require("./lib/method.js");
var dao = require("./lib/dao.js");
var fb  = require("./lib/fb.js");

AV.Cloud.define("notify_new_config", function (request, response) {
    var user_id = request.params.userId,
        config  = request.params.config;
    M.notifyNewConfig(user_id, config, fb.configuration_ref).then(
        function (msg){
            response.success({
                code: 0,
                message: msg
            })
        },
        function (error){
            response.error({
                code: 1,
                message: error
            });
        }
    );
});

AV.Cloud.define("notify_new_config_batch", function (request, response) {
    var user_ids = request.params.userIds,
        configs  = request.params.configs;

    M.notifyNewConfigBatch(user_ids, configs, fb.configuration_ref).then(
        function (msg){
            response.success({
                code: 0,
                message: msg
            })
        },
        function (error){
            response.error({
                code: 1,
                message: error
            });
        }
    );
});

AV.Cloud.define("notify_all_user_same_config", function (request, response) {
    var configs  = request.params.configs;
    console.log("The config content is: \n" + JSON.stringify(configs));

    dao.getAllUsers().then(function (all_users){
        M.notifyNewConfigBatch(all_users, configs, fb.configuration_ref).then(
            function (msg){
                response.success({
                    code: 0,
                    message: msg
                })
            },
            function (error){
                response.error({
                    code: 1,
                    message: error
                });
            }
        );
    });
});

AV.Cloud.define("notify_new_output", function (request, response) {
    var user_id = request.params.userId,
        output  = request.params.output;
    M.notifyNewEvents(user_id, output, fb.notification_ref).then(
        function (msg){
            response.success({
                code: 0,
                message: msg
            })
        },
        function (error){
            response.error({
                code: 1,
                message: error
            });
        }
    );
});
AV.Cloud.define("notify_new_details", function(request, response){
    var user_id = request.params.userId,
        type = request.params.type,
        val  = request.params.val,
        source = request.params.source,
        timestamp = request.params.timestamp || (new Date()).valueOf();
    console.log(
        "user_id: " + user_id + " "
        + "type: " + type + " "
        + "val: " + val + " "
        + "timestamp " + timestamp
    );
    M.notifyNewDetails(user_id, type, val, source, timestamp, fb.notification_ref).then(
        function (msg){
            response.success({
                code: 0,
                message: msg
            })
        },
        function (error){
            console.log("error: " + error);
            response.error({
                code: 1,
                message: error
            });
        }
    );
});

module.exports = AV.Cloud;
