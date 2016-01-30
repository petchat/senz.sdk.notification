/**
 * Created by zhanghengyang on 15/5/4.
 */

var config = require("./config.json");
var debug = config.debug;

var log = function(log_tag) {

    if (debug) {
        var log = require("tracer").colorConsole(
            {
                format: "{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})",
                dateformat: "isoDateTime"
            }
        );
    }
    else {
        if(process.env.APP_ENV === "prod"){
            var token = "cee20e6c-3979-4b90-b53d-b45d8785ab15"
        }
        else{
            token = 'cee20e6c-3979-4b90-b53d-b45d8785ab15'
        }

        var logentries = require('node-logentries');
        log = logentries.logger({
            token: token
        });
    }

    return {
        "info": function (id, info) {
            log.info(log_tag + " <" + id + "> " + info);
        },

        "debug": function (id, debug) {
            log.debug(log_tag + " <" + id + "> " + debug);
        },

        ////exports.notice = function(notice){
        //    log.notice(log_tag + notice);
        //}


        "warn": function (id, warn) {
            if (debug) {
                log.warn(log_tag + " <" + id + "> " + warn);
            }
            else {
                log.warning(log_tag + " <" + id + "> " + warn);
            }
        },

        "error": function (id, err) {
            if (debug) {
                log.error(log_tag + " <" + id + "> " + err);
            }
            else {
                log.err(log_tag + " <" + id + "> " + err);
            }
        }
    }


//exports.alert = function(alert){
//    log.alert(log_tag + alert);
//}


}


exports.log = log;
