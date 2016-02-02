var AV  = require("leanengine");
var M   = require("./lib/method.js");
var dao = require("./lib/dao.js");
var fb  = require("./lib/fb.js");
var log = require("./lib/logger").log;
var logger = new log("NOTIFICATION");
var notify = require("./lib/notification.js");

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

var wilddog_push_flag = {};
AV.Cloud.define("notify_new_details", function(request, response){
    var user_id = request.params.userId,
        type = request.params.type,
        val  = request.params.val,
        source = request.params.source,
        expire = request.params.expire || 600,
        timestamp = request.params.timestamp || (new Date()).valueOf();

    console.log("[notification]"
        + "user_id: " + user_id + " "
        + "source " + source + " "
        + "type: " + type + " "
        + "val: " + val + " "
        + "timestamp " + timestamp + " "
        + "expire " + expire
    );

    if((source == 'panel') || (!wilddog_push_flag[user_id]) || (wilddog_push_flag[user_id] && wilddog_push_flag[user_id][type] == true) ||
        (wilddog_push_flag[user_id] && wilddog_push_flag[user_id][type] == undefined)) {
        console.log("push to wilddog!\n");

        if (!wilddog_push_flag[user_id]) {
            wilddog_push_flag[user_id] = {};
        }
        wilddog_push_flag[user_id][type] = false;
        setTimeout(function(){
            wilddog_push_flag[user_id][type] = true;
        }, 30*1000);

        M.notifyNewDetails(user_id, type, val, source, timestamp, fb.notification_ref).then(
            function (msg) {
                response.success({
                    code: 0,
                    message: msg
                })
            },
            function (error) {
                console.log("error: " + JSON.stringify(error));
                response.error({
                    code: 1,
                    message: error
                });
            });
    }else{
        return response.success();
    }

    //if (type == 'home_office_status'){
    //    timer.start(user_id, expire*1000).then(
    //        function(){
    //            console.log("Timeout");
    //            return M.notifyNewDetails(user_id, type, "unknown_status", source, timestamp, fb.notification_ref);
    //        },
    //        function(err){
    //            return AV.Promise.error(err);
    //        }
    //    ).then(
    //        function (msg){
    //            response.success({
    //                code: 0,
    //                message: msg
    //            })
    //        },
    //        function (error){
    //            console.log("error: " + error);
    //            response.error({
    //                code: 1,
    //                message: error
    //            });
    //        }
    //    );
    //}
});


AV.Cloud.define("changeCollectFreq", function(req, rep){
    var userId = req.params.userId;
    var installationId = req.params.installationId || userId_insatalltionId[userId];
    var collect_expire = req.params.expire || defaultExpire;
    var method = (req.params.method || "").toUpperCase();
    if(method == "GET"){
        return rep.success({installationId: installationId,
            expire: notify.getExpire(installationId)});
    }
    if(method == "SET"){
        return rep.success("SET: " + notify.setExpire(installationId, collect_expire));
    }
    return rep.error("Unknown method type!");
});

AV.Cloud.define('pushAPNMessage', function(req, rep){
    var installationId = req.params.installationId;
    //var source = req.params.source;
    var msg = {
        type: req.params.type,
        status: req.params.status,
        timestamp: req.params.timestamp,
        probability: req.params.probability
    };
    logger.debug("pushAPNMessage", installationId + ": " +JSON.stringify(msg));
    notify.pushAIMessage(installationId, msg);

    rep.success("pushAPNMessage END!");
});

AV.Cloud.define('getLastNotify', function(req, rep){
    var installationId = req.params.installationId;
    return rep.success(notify.getLastNotify(installationId));
});

AV.Cloud.define('pushAndroidMessage', function(req, rep){
    var userId = req.params.userId;
    var msg = {
        type: req.params.type,
        value: req.params.value || req.params.val,
        timestamp: req.params.timestamp
    };
    console.log(userId);
    console.log(msg);
    logger.debug("pushAndroidMessage", userId + ": " +JSON.stringify(msg));
    notify.pushAIMessage(userId, msg);
    rep.success("pushAndroidMessage END!");
});

AV.Cloud.define("pushToken", function(req, rep){
    var token = req.params.token;
    var installationId = req.params.installationId;

    var installation_query = new AV.Query(Installation);
    installation_query.equalTo('objectId', installationId);
    return installation_query.find()
        .then(
            function(results){
                var installation = results[0];
                installation.set('token', token);
                return installation.save();
            })
        .then(
            function(d){
                notify.resetExpire(installationId);
                rep.success('<'+d.id+'>: ' + "push token success!");
                return notify.createAIConnection(installation_map[installationId]);
            })
        .catch(
            function(e){
                rep.error(e);
                logger.error("pushToken", JSON.stringify(e));
                return AV.Promise.error(e);
            });
});

AV.Cloud.define("createNotifyTask", function(req, rep){
    return notify.createNotifyTask(req.params)
        .then(function(d){
            return rep.success(d);
        })
        .catch(function(e){
            return rep.error(e);
        });
});

AV.Cloud.define("pushCurStatus", function(req, rep){
    return rep.success(notify.procPostStatus(req.params));
});


var app_list = [
    "5678df1560b2f2e841665918",
    "564573f660b25b79f067aeef",
    "55bc5d8e00b0cb9c40dec37b",
    "56a9be2adf0eea0054fea151"
];
notify.initConnOnBoot(app_list);

module.exports = AV.Cloud;
