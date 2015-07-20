var AV  = require("leanengine");
var fb  = require("./fb.js");
var dao = require("./dao.js");
var _   = require("underscore");
var serialize_task = require("./serialize_task.js");

var _notifyNewConfig = function (user_id, new_config_content, ref){
    return dao.updateUserConfiguration(user_id, new_config_content).then(
        function (config_in_db){
            return AV.Promise.as(
                config_in_db.id,
                config_in_db.updatedAt.toString(),
                config_in_db.get("content")
            );
        },
        function (error){
            return AV.Promise.error(error);
        }
    ).then(
        function (config_id, updated_at, config_content){
            return fb.setUserConfiguration(user_id, config_content, updated_at, config_id, ref);
        },
        function (error){
            return AV.Promise.error(error);
        }
    );
};

exports.notifyNewConfig = function (user_id, new_config_content, ref){
    return _notifyNewConfig(user_id, new_config_content, ref);
};

exports.notifyNewConfigBatch = function (user_id_list, config_content_list, ref){
    if (user_id_list.length != config_content_list.length && config_content_list.length != 1){
        var msg = "user id's count is not equal to config's count.";
        return AV.Promise.error(msg);
    }
    else if (user_id_list.length > 1 && config_content_list.length == 1){
        var config_content  = config_content_list[0];
        config_content_list = [];
        for (var i = 0; i < user_id_list.length; i ++){
            config_content_list.push(config_content);
        }
    }

    var job_objs  = _.object(user_id_list, config_content_list);
    var jobs      = _.pairs(job_objs);

    var work = new serialize_task.SerializeTask();

    jobs.forEach(function (job){
        work.addTask(job);
    });

    work.setWorker(function (job, resolve, reject){
        var user_id = job[0],
            config  = job[1];

        _notifyNewConfig(user_id, config, ref).then(
            function (msg){
                console.log(msg);
                resolve(msg);
            },
            function (error){
                console.log(error);
                reject(error);
            }
        );
    });

    return work.begin().then(
        function (jobs) {
            var msg = "Batch jobs completed.";
            console.log(msg);
            return AV.Promise.as(msg);
        }
    );
};