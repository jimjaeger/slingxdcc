/*
 * Serve content over a socket
 */

const logger = require("../lib/xdcclogger");
const packdb = require("../lib/packdb");
const downloadHandler = require("../lib/downloadHandler");
const log4js = require('log4js');
const loggerjs = log4js.getLogger('socket');

module.exports = function (socket) {
	loggerjs.debug("Client connected to socket", socket.id);
    var lastPacketCount = 0;

    setInterval(function () {
        if(lastPacketCount !== packdb.numberOfPackets()){
            lastPacketCount = packdb.numberOfPackets();

            var abspackets = packdb.numberOfPackets();
            var redpackets = packdb.numberOfRedundantPackets();

            socket.emit('send:packetCount', {
                absPackets : abspackets,
                redPackets : redpackets
            });
        }

    }, 100);

    logger.on("irc_error",function(srvkey){
        socket.emit('send:irc_error', {
            server: logger.getIrcServers()[srvkey]
        });
    });

    logger.on("irc_connected", function(srvkey){
        socket.emit('send:irc_connected', {
            server: logger.getIrcServers()[srvkey]
        });
    });

    downloadHandler.on("dlerror",function(data){
    	//loggerjs.debug("Event dlerror", data);
        socket.emit('send:dlerror', data);
    });

    downloadHandler.on("dlsuccess",function(data){
    	//loggerjs.debug("Event dlsuccess", data.packObj.filename);
        socket.emit('send:dlsuccess', data);
    });

    downloadHandler.on("dlprogress",function(data){
        socket.emit('send:dlprogress', data);
    });

    downloadHandler.on("dlstart",function(data){
    	//loggerjs.debug("Event dlstart", data.packObj.filename);
        socket.emit('send:dlstart', data);
    });
    
    downloadHandler.on("dlcancel",function(data){
    	//loggerjs.debug("Event dlcancel", data.packObj.filename);
        socket.emit('send:dlcancel', data);
    });

};