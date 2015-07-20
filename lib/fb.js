var AV       = require("leanengine");
var Firebase = require("firebase");
var base_url = require("./config.js").firebase_base_url;

exports.notification_ref  = new Firebase(base_url + "/notification/");
exports.configuration_ref = new Firebase(base_url + "/configuration/");


var setUserFirebase = function (ref, user_id, data){
    var promise = new AV.Promise();
    var userDataField = ref.child(user_id);
    userDataField.set(data, function (error){
        if (error){
            promise.reject(error);
        }
        else {
            var msg = "User " + user_id + " config is updated successfully!";
            promise.resolve(msg);
        }
    });
    return promise;
};

exports.setUserConfiguration = function (user_id, content, updated_at, config_id, ref){
    var data = {
        objectId:  config_id,
        updatedAt: updated_at,
        content:   content
    };
    return setUserFirebase(ref, user_id, data);
};
