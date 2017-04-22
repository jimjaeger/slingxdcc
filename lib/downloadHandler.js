/*
 * ----------------------------------------------------------------------------
 * "THE BEER-WARE LICENSE" (Revision 42):
 * <varga.daniel@gmx.de> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return Daniel Varga
 * ----------------------------------------------------------------------------
 */
var downloadHandler = function downloadHandler() {


    var nconf = require("nconf"),
        axdcc = require("axdcc"),
        logger = require("./xdcclogger"),
        log4js = require('log4js'),
        loggerjs = log4js.getLogger('downloadHandler'),
        packdb = require("./packdb"),
        nodefs = require("node-fs");


    var homePath = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    var appHome = homePath+'/.slingxdcc/';

    nconf.add('settings', {type: 'file', file: appHome+'config/settings.json'});

    nconf.defaults({
        "downloadHandler": {
            "destination": appHome+"downloads/",
            "resumeDownloads": true,
            "refreshInterval": 1
        },
        "downloads": {}
    });
    nconf.set('downloadHandler',nconf.get('downloadHandler'));
    nodefs.mkdirSync(nconf.get('downloadHandler:destination'),0777,true);
    nconf.save();

    var interval = nconf.get('downloadHandler:refreshInterval');
    var requests = {};
    var dlQueues = nconf.get('downloads');
    var self = this;

    var notifications = [];

    for (var server in dlQueues) {
        if (dlQueues.hasOwnProperty(server)) {
            var attr = dlQueues[server];
            for (var nick in attr) {
                if (attr.hasOwnProperty(nick)) {
                    var queue = attr[nick];
                    if (queue.length > 0) {
                        createRequest(queue[0]);
                    }
                }
            }
        }
    }

    this.startDownload = function (packObj) {
        if (typeof dlQueues[packObj.server] === "undefined") {
            dlQueues[packObj.server] = {};
            requests[packObj.server] = {};
        }
        if (typeof dlQueues[packObj.server][packObj.nick] === "undefined") {
            dlQueues[packObj.server][packObj.nick] = [];
            requests[packObj.server][packObj.nick] = {};
        }

        if (downloadQueuePosition(packObj) === -1) {
            packObj.progress = 0;
            packObj.lastProgress = Date.now();
            packObj.received = 0;
            dlQueues[packObj.server][packObj.nick].push(packObj);
            if (downloadQueuePosition(packObj) === 0) {
                createRequest(packObj);
            }
            nconf.set('downloads', dlQueues);
            nconf.save();
            return true;
        }
        return false;
    };
    
    this.validateDownload = function(packObj){
    	return validpack(packObj);
    };

    this.cancelDownload = function (packObj) {
        if (!validpack(packObj)){
            return false;
        }
        loggerjs.debug("Cancel Download", packObj.filename);
        var notification = {
            packObj: {
                server: packObj.server,
                nick: packObj.nick,
                nr: packObj.nr,
                filename: packObj.filename,
                realsize: parseInt(packObj.realsize)
            },
            time: new Date().getTime()
        };

        self.emit('dlcancel', notification);
        notification.type = "dlcancel";
        notifications.push(notification);
        dequeueDownload(packObj);
        return true;
    };

    this.getDownloads = function () {
        return dlQueues;
    };

    this.upqueue = function (packObj) {
        if (!validpack(packObj)) {
            return false;
        }

        var oldindex = downloadQueuePosition(packObj);
        var maxindex = dlQueues[packObj.server][packObj.nick].length - 1;

        if (oldindex >= maxindex) {
            return false;
        }

        var old = dlQueues[packObj.server][packObj.nick][oldindex];
        dlQueues[packObj.server][packObj.nick][oldindex] = dlQueues[packObj.server][packObj.nick][oldindex + 1];
        dlQueues[packObj.server][packObj.nick][oldindex + 1] = old;
        nconf.set('downloads', dlQueues);
        nconf.save();
        return true;
    };

    this.downqueue = function (packObj) {
        if (!validpack(packObj)) {
            return false;
        }

        var oldindex = downloadQueuePosition(packObj);

        if (oldindex <= 1) {
            return false;
        }

        var old = dlQueues[packObj.server][packObj.nick][oldindex];
        dlQueues[packObj.server][packObj.nick][oldindex] = dlQueues[packObj.server][packObj.nick][oldindex - 1];
        dlQueues[packObj.server][packObj.nick][oldindex - 1] = old;
        nconf.set('downloads', dlQueues);
        nconf.save();
        return true;
    };

    this.getNotifications = function(){
        return notifications;
    };

    this.clearNotifications = function(){
        notifications = [];
    };

    this.exit = function(){
        for (var server in requests) {
            if (requests.hasOwnProperty(server)) {
                var attr = requests[server];
                for (var nick in attr) {
                    if (attr.hasOwnProperty(nick)) {
                        var request = attr[nick].request;
                        loggerjs.debug("Cancel Package", request);
                        request.emit("cancel");
                    }
                }
            }
        }
    };

    function createRequest(packObj) {
        if (typeof requests[packObj.server] === "undefined") {
            requests[packObj.server] = {};
        }
        if (typeof requests[packObj.server][packObj.nick] === "undefined") {
            requests[packObj.server][packObj.nick] = {};
        }
        var notification;
        requests[packObj.server][packObj.nick].connectHandler = function (pack) {
        	//loggerjs.debug("Connect on Package", pack);
        	if (pack.filename.replace(/\s/g, '').toLowerCase() !== packObj.filename.replace(/\s/g, '').toLowerCase()) {

                packdb.addPack({
                    server: packObj.server,
                    nick: packObj.nick,
                    nr: parseInt(packObj.nr),
                    downloads: 0,
                    filesize: parseInt(packObj.realsize),
                    filename: pack.filename,
                    lastseen: new Date().getTime()
                });

                notification = {
                    packObj: {
                        server: packObj.server,
                        nick: packObj.nick,
                        nr: packObj.nr,
                        filename: packObj.filename
                    },
                    error: "filename mismatch",
                    source : "errorHandler",
                    type : "dlerror",
                    gotFile: pack.filename,
                    time: new Date().getTime()
                };
                //loggerjs.debug("Error on Package", pack, notification.error);

                self.emit('dlerror', notification);
                notifications.push(notification);

                requests[packObj.server][packObj.nick].request.emit("cancel");
                dequeueDownload(packObj);
            } else {
                dlQueues[packObj.server][packObj.nick][0].realsize = pack.filesize;

                notification = {
                    packObj: {
                        server: packObj.server,
                        nick: packObj.nick,
                        nr: packObj.nr,
                        filename: packObj.filename,
                        realsize: parseInt(packObj.realsize)
                    },
                    time: new Date().getTime()
                };

                self.emit('dlstart', notification);
                notification.type = "dlstart";
                notifications.push(notification);
            }
        };

        requests[packObj.server][packObj.nick].progressHandler = function (pack, received) {

            var receivedDelta = received - packObj.received;

            packObj.received = received;

            self.emit('dlprogress', {packObj: {
                server: packObj.server,
                nick: packObj.nick,
                nr: packObj.nr,
                speed: parseInt(receivedDelta / interval),
                received : packObj.received
            }});

        };

        requests[packObj.server][packObj.nick].completeHandler = function (pack) {
        	//loggerjs.debug("Complete on Package", pack);
            notification = {
                packObj: {
                    server: packObj.server,
                    nick: packObj.nick,
                    nr: packObj.nr,
                    filename: packObj.filename
                },
                time: new Date().getTime()
            };

            self.emit('dlsuccess', notification);
            notification.type = "dlsuccess";
            notifications.push(notification);
            dequeueDownload(packObj);
        };

        requests[packObj.server][packObj.nick].errorHandler = function (pack, error) {
           //loggerjs.debug("Error on Package", pack, error);
            notification = {
                packObj: {
                    server: packObj.server,
                    nick: packObj.nick,
                    nr: packObj.nr,
                    received : pack.received,
                    filename: packObj.filename
                },
                error: error,
                source : "errorHandler",
                type : "dlerror",
                time: new Date().getTime()
            };

            self.emit('dlerror', notification);
            notifications.push(notification);

            requests[packObj.server][packObj.nick].request.emit("cancel");
            dequeueDownload(packObj);
        };
        
        if (typeof logger.getIrcServers()[packObj.server] === "undefined" || logger.getIrcServers()[packObj.server].connected === false) {
            function startPending(srvKey){
                if (srvKey === packObj.server) {
                    startRequest(packObj);
                }
            }

            logger.on("irc_connected", startPending);
            self.on("dequeuePending#"+packObj.server+"#"+packObj.nick+"#"+packObj.nr,function(){
                logger.removeListener("irc_connected", startPending);
                self.removeAllListeners("dequeuePending#"+packObj.server+"#"+packObj.nick+"#"+packObj.nr);
            });
        } else {
            startRequest(packObj);
        }


        function startRequest(packObj) {
            requests[packObj.server][packObj.nick].request = new axdcc.Request(logger.getIrcServer(packObj.server), {
                pack: packObj.nr,
                nick: packObj.nick,
                path: nconf.get('downloadHandler:destination'),
                resume: nconf.get('downloadHandler:resumeDownloads'),
                progressInterval: interval
            })
                .once("dlerror", requests[packObj.server][packObj.nick].errorHandler)
                .once("connect", requests[packObj.server][packObj.nick].connectHandler)
                .on("progress", requests[packObj.server][packObj.nick].progressHandler)
                .once("complete", requests[packObj.server][packObj.nick].completeHandler);

            requests[packObj.server][packObj.nick].request.emit("start");
        }

    }

    function dequeueDownload(packObj) {
        var index = downloadQueuePosition(packObj);
        if (index !== -1) {

            if (index === 0) {
                dlQueues[packObj.server][packObj.nick].shift();
                if(typeof requests[packObj.server][packObj.nick].request !== "undefined"){
                    requests[packObj.server][packObj.nick].request.emit("cancel");
                    requests[packObj.server][packObj.nick].request.removeAllListeners();
                    delete requests[packObj.server][packObj.nick];
                    if (dlQueues[packObj.server][packObj.nick].length > 0) {
                        createRequest(dlQueues[packObj.server][packObj.nick][0]);
                    }
                }else{
                    self.emit("dequeuePending#"+packObj.server+"#"+packObj.nick+"#"+packObj.nr);
                }
            } else {
                dlQueues[packObj.server][packObj.nick].splice(index, 1);
            }


            if (dlQueues[packObj.server][packObj.nick].length === 0){
                delete dlQueues[packObj.server][packObj.nick];
            }
            if (Object.keys(dlQueues[packObj.server]).length === 0){
                delete dlQueues[packObj.server];
            }
            nconf.set('downloads', dlQueues);
            nconf.save();
        }


    }

    function downloadQueuePosition(packObj) {
        var length = dlQueues[packObj.server][packObj.nick].length,
            element = null;
        for (var i = 0; i < length; i++) {
            element = dlQueues[packObj.server][packObj.nick][i];
            if (element.nr === packObj.nr) {
                return i;
            }
        }
        return -1;
    }

    function validpack(packObj) {
        return !(typeof dlQueues[packObj.server] === "undefined" || typeof dlQueues[packObj.server][packObj.nick] === "undefined");
    }

    if (downloadHandler.caller !== downloadHandler.getInstance) {
        throw new Error("This object cannot be instantiated");
    }
};


/* ************************************************************************
 SINGLETON CLASS DEFINITION
 ************************************************************************ */
downloadHandler.instance = null;

/**
 * Singleton getInstance definition
 * @return singleton class
 */
downloadHandler.getInstance = function () {
    if (this.instance === null) {
        this.instance = new downloadHandler();
    }
    return this.instance;
};
downloadHandler.prototype = Object.create(require("events").EventEmitter.prototype);
module.exports = downloadHandler.getInstance();
