var AV  = require("leanengine");
var Wilddog = require("wilddog");
var log = require("./logger").log;
var logger = new log("NOTIFICATION");
var apn = require("apn");

var Installation = AV.Object.extend("Installation");
var application = AV.Object.extend("Application");
var NotificationTask = AV.Object.extend("NotificationTask");

AV.initialize("wsbz6p3ouef94ubvsdqk2jfty769wkyed3qsry5hebi2va2h",
	"6z6n0w3dopxmt32oi2eam2dt0orh8rxnqc8lgpf2hqnar4tr",
	"ukptm7yckuf1gz07ki2ppo25hz64mw3qc4d3bxvzxqctcqe9");

var notification_cache = {};
var installation_map = {}; //key: installationId, value: installationObj;
var userId_insatalltionId = {}; //key uid, value: installationId;
var defaultExpire = 60;  //采集数据命令的默认超时时间
var maintainPeriod = 100;  //轮询周期
var notify_task_cache = {};

var createOnBoot = function(app_list){
	var installation_query = new AV.Query(Installation);
	var installation_promises = [];
	app_list.forEach(function(appId){
		var app = {
			"__type": "Pointer",
			"className": "Application",
			"objectId": appId
		};
		installation_query.equalTo("application", app);
		installation_query.descending("updatedAt");
		installation_promises.push(installation_query.find());
	});
	return AV.Promise.all(installation_promises)
		.then(function(installation_lists){
			var connection_promises = [];
			installation_lists.forEach(function(installations){ //every app's installation record
				var de_weight_installations = DupInstallationFilter(installations);
				logger.debug("createOnBoot", de_weight_installations.length);
				de_weight_installations.forEach(function(installation){   //certain app's installations
					connection_promises.push(createAIConnection(installation));
				})
			});
			return AV.Promise.all(connection_promises);
		})
		.catch(function(e){
			return AV.Promise.error(e);
		});
};

var DupInstallationFilter = function(installations){
	var tmp = {};
	installations.forEach(function(item){
		var deviceType = item.get("deviceType");
		var token = item.get("token");

		if(token || deviceType === "android"){
			var uid = item.get("user").id;
			var time = item.createdAt;

			if(!tmp[uid] || tmp[uid].time < time){
				tmp[uid] = {time: time, installation: item};
			}
		}
	});
	var result = [];
	Object.keys(tmp).forEach(function(uid){
		result.push(tmp[uid].installation);
	});
	return result;
};

var createAIConnection = function(installation){
	if(!installation){
		return;
	}

	var deviceType = installation.get("deviceType");
	var installationId = installation.id;

	var uid = installation.get("user").id;
	userId_insatalltionId[uid] = installationId;

	installation_map[installationId] = installation;

	resetExpire(installationId);

	notification_cache[installationId].deviceType = deviceType;

	if(deviceType === "ios"){
		var token = installation.get("token");
		if(token){
			notification_cache[installationId].device = new apn.Device(token);
		}

		var appId = installation.get("application").id;
		var app_query = new AV.Query(application);
		app_query.equalTo("objectId", appId);
		return app_query.first().then(
			function(app){
				var cert_url = app.get('cert_url') || "";
				var key_url = app.get('key_url') || "";
				return AV.Promise.all([
					AV.Cloud.httpRequest({ url: cert_url }),
					AV.Cloud.httpRequest({ url: key_url }),
					app.get('passphrase')
				]);
			})
			.then(
				function(response){
					var cert = response[0].buffer;
					var key = response[1].buffer;
					var passpharse = response[2];
					if(cert && key){
						var apnConnection = new apn.Connection({cert: cert, key: key,
							production: true, passphrase: passpharse});
						var apnConnection_dev = new apn.Connection({cert: cert, key: key,
							production: false, passphrase: passpharse});
						notification_cache[installationId].apnConnection = apnConnection;
						notification_cache[installationId].apnConnection_dev = apnConnection_dev;
					}
					return AV.Promise.as(notification_cache[installationId]);
				})
			.catch(
				function(e){
					return AV.Promise.error(e);
				})
	}else{
		//var uid = installation.get("user").id;
		//userId_insatalltionId[uid] = installationId;
		var collect_data_ref = "https://notify.wilddogio.com/message/"+ uid + "/collect_data";
		var configuration_ref = "https://notify.wilddogio.com/configuration/"+ uid + "/content";
		var notify_ref = "https://notify.wilddogio.com/notification/"+ uid + "/content/";
		var updatedAt_ref = "https://notify.wilddogio.com/notification/"+ uid + "/updatedAt";
		notification_cache[installationId].collect_data_ref = collect_data_ref;
		notification_cache[installationId].configuration_ref = configuration_ref;
		notification_cache[installationId].notify_ref = notify_ref;
		notification_cache[installationId].updatedAt_ref = updatedAt_ref;
		return AV.Promise.as(notification_cache[installationId]);
	}

};

var resetExpire = function(id){
	if(!notification_cache[id]){
		notification_cache[id] = {};
	}

	notification_cache[id].expire = notification_cache[id].expire_init || defaultExpire;
};
var incExpire = function(id){
	logger.debug("incExpire", notification_cache[id].expire);
	notification_cache[id].expire -= 1;
};
var getExpire = function(id){
	if(!notification_cache[id]){
	    return "Invalid installationId";
	}
	return {expire_init: maintainPeriod*(notification_cache[id].expire_init || defaultExpire),
		expire_now: maintainPeriod*(notification_cache[id].expire)}
};
var setExpire = function(id, expire){
	if(!notification_cache[id]){
		return "Invalid installationId";
	}
	notification_cache[id].expire_init = expire/maintainPeriod;
	notification_cache[id].expire = expire/maintainPeriod;
	return id;
};

var maintainExpire = function(){
	Object.keys(notification_cache).forEach(function(installationId){
		incExpire(installationId);

		if(notification_cache[installationId].expire <= 0){
			var msg = {
				"type": "collect-data"
			};
			console.log(JSON.stringify(msg));
			pushAIMessage(installationId, msg);
			resetExpire(installationId);
			createAIConnection(installation_map[installationId]);
		}
	});
	logger.debug("maintainExpire", new Date().getTime());
	logger.info("maintainExpire", "Timer Schedule!");
};

var pushAIMessage = function(installationId, msg){
	if(userId_insatalltionId[installationId]){
		installationId = userId_insatalltionId[installationId];
	}
	logger.debug("pushAIMessage ", installationId);

	if(!notification_cache[installationId]){
		logger.error("pushAIMessage", "Invalid insatallationId");
		return;
	}
	var deviceType = notification_cache[installationId].deviceType;
	if(deviceType === "android"){
		if(msg.type === "collect_data" || msg.type === "collect-data"){
			var collect_data_ref = new Wilddog(notification_cache[installationId].collect_data_ref);
			collect_data_ref.set(Math.random()*10000, function(){
				logger.debug("\<Sended Android Msg....\>" , installationId + ": " + msg.type);
			});
		}else{
			var notify_ref = new Wilddog(notification_cache[installationId].notify_ref + msg.type);
			notify_ref.set({status: msg.value, timestamp: msg.timestamp, probability: 1}, function(){
				logger.debug("\<Sended Android Msg....\>" , installationId + ": " + msg.type);
			});
			notification_cache[installationId].last_msg = msg;
			var updatedAt_ref = new Wilddog(notification_cache[installationId].updatedAt_ref);
			updatedAt_ref.set(new Date().toString(), function(){
				logger.debug("\<Sended Android Msg....\>" , installationId + ": " + msg.type);
			})
		}
	}

	if(deviceType === "ios"){
		var config = notification_cache[installationId];
		if(!config) return;

		var apnConnection = config.apnConnection;
		var apnConnection_dev = config.apnConnection_dev;
		var device = config.device;

		var note = new apn.Notification();
		note.contentAvailable = 1;
		note.payload = {
			"senz-sdk-notify": msg
		};

        if(msg.type != 'collect-data'){
            notification_cache[installationId].last_msg = msg;
        }

		logger.debug("APN_MSG: "+installationId, JSON.stringify(note.payload));

		if(apnConnection && device){
			apnConnection.pushNotification(note, device);
			apnConnection_dev.pushNotification(note, device);
			logger.debug("\<Sended IOS Msg....\>" , installationId);
		}
	}
};

var getLastNotify = function(installationId){
    return notification_cache[installationId].last_msg;
};

var createNotifyTask = function(params){
	var startedAt = params.startedAt;
	var stoppedAt = params.stoppedAt;
	var timestamp = params.timestamp;
	var userIds = params.user_ids;
	var targetStatus = params.targetStatus;
	var message = params.message;

	var task = new NotificationTask();
	task.set("targetStatus", targetStatus);
	task.set("startedAt", startedAt);
	task.set("stoppedAt", stoppedAt);
	task.set("timestamp", timestamp);
	task.set("userIds", userIds);
	task.set("message", message);
	return task.save().then(function(task){
		notify_task_cache[task.id] = task.attributes;
		return AV.Promise.as({taskId: task.id});
	}).catch(
		function(e){
			return AV.Promise.error("create task failed!" + JSON.stringify(e));
		});
};

var checkCurStatus = function(installationId, taskId){
	var msg = {
		"type": "checkStatus",
		"timestamp": new Date().getTime(),
		"taskId": taskId
	};
	pushAIMessage(installationId, msg);
};

var procPushFlag = function(){
	Object.keys(notify_task_cache).forEach(function(tid){
		var task = notify_task_cache[tid];
		var now = new Date().getTime();
		if(task.startedAt <= now && now <= task.stoppedAt){
			task.userIds.forEach(function(uid){
				checkCurStatus(userId_insatalltionId[uid], tid);
			});
		}
		if(now >= task.stoppedAt){
			pushAIMessage(userId_insatalltionId[uid], msg);
			delete notify_task_cache[tid];
		}
	});
};

var procPostStatus = function(params){
	var taskId = params.taskId;
	var timestamp = params.timestamp;
	var curStatus = params.curStatus;
	var installationId = params.installationId;

	if(!notify_task_cache[taskId]){
		return "Invalid taskId";
	}

	var gesture = curStatus.gesture;
	if(gesture == "in_hand"){
		var msg = notify_task_cache[taskId].message;
		msg.timestamp = timestamp;
		console.log("start push APN msg!");

		pushAIMessage(installationId, msg);
		delete notify_task_cache[taskId];
	}

	return "END";
};


setInterval(function(){
	maintainExpire();
}, maintainPeriod * 1000);
setInterval(procPushFlag, 30 * 1000);


exports.initConnOnBoot = createOnBoot;
exports.createAIConnection = createAIConnection;
exports.resetExpire = resetExpire;
exports.getExpire = getExpire;
exports.setExpire = setExpire;
exports.incExpire = incExpire;
exports.maintainExpire = maintainExpire;
exports.getLastNotify = getLastNotify;
exports.pushAIMessage = pushAIMessage;
exports.checkCurStatus = checkCurStatus;
exports.createNotifyTask = createNotifyTask;
exports.procPostStatus = procPostStatus;


