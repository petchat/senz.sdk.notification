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

    M.notifyNewConfig(user_id, output, fb.notification_ref).then(
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

module.exports = AV.Cloud;