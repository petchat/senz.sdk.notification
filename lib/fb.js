var AV       = require("leanengine");
var Firebase = require("firebase");
var base_url = require("./config.js").firebase_base_url;

exports.notification_ref  = new Firebase(base_url + "/notification/");
exports.configuration_ref = new Firebase(base_url + "/configuration/");

exports.setUserConfiguration = function (user_id, content, updated_at, config_id, ref){
    var data = {
        objectId:  config_id,
        updatedAt: updated_at,
        content:   content
    };
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

exports.setUserEvents = function (user_id, events, result_id, updated_at, ref){
    var promises = [];
    var object_id_field = ref.child(user_id).child("objectId"),
        update_at_field = ref.child(user_id).child("updatedAt"),
        events_field    = ref.child(user_id).child("content").child("events");

    // Update result id for user.
    promises.push(
        object_id_field.set(result_id, function (error){
            if (error){
                return AV.Promise.error(error);
            }
            else {
                var msg = "User " + user_id + " config is updated successfully!";
                return AV.Promise.as(msg);
            }
        })
    );
    // Update updated at for user.
    promises.push(
        update_at_field.set(updated_at, function (error){
            if (error){
                return AV.Promise.error(error);
            }
            else {
                var msg = "User " + user_id + " config is updated successfully!";
                return AV.Promise.as(msg);
            }
        })
    );
    // Update events for user.
    promises.push(
        events_field.set(events, function (error){
            if (error){
                return AV.Promise.error(error);
            }
            else {
                var msg = "User " + user_id + " config is updated successfully!";
                return AV.Promise.as(msg);
            }
        })
    );

    return AV.Promise.when(promises);
};