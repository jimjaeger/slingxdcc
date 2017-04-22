/*
 * ----------------------------------------------------------------------------
 * "THE BEER-WARE LICENSE" (Revision 42):
 * <varga.daniel@gmx.de> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return Daniel Varga
 * ----------------------------------------------------------------------------
 */
'use strict';

/* Serveraddcontroller for creating a new server in settings */
angular.module('myApp')
  .controller('ServerAddCtrl', ['$scope', '$http', function ($scope, $http){
    $scope.joinChanStr = "";
    $scope.nServConf = {
        key           : "",
        host          : "",
        port          : "",
        nick          : "",
        channels      : [],
        observchannels: []
    };

    $scope.addServer = function (){
        if ($scope.nServConf.port.length === 0){
        	$scope.nServConf.port = "6667";
        }
        
        if ($scope.nServConf.key.length === 0 || $scope.nServConf.host.length === 0 || parseInt($scope.nServConf.port) > 65535 || parseInt($scope.nServConf.port) < 0 || $scope.nServConf.nick.length === 0){
        	return;
        }
        
        var server = {
            srvkey        : $scope.nServConf.key,
            host          : $scope.nServConf.host,
            port          : $scope.nServConf.port,
            nick          : $scope.nServConf.nick,
            channels      : $scope.nServConf.channels.length > 0 ? $scope.nServConf.channels.join(' ') : "",
            observchannels: $scope.nServConf.observchannels.length > 0 ? $scope.nServConf.observchannels.join(' ') : ""
        };

        $http.post('/api/server/', server).then(function (data){
                $scope.servers[$scope.nServConf.key] = {};
                $scope.nServConf.connected = false;
                angular.copy($scope.nServConf, $scope.servers[$scope.nServConf.key]);
                $scope.joinChanStr = "";
                $scope.nServConf = {
                    key           : "",
                    host          : "",
                    port          : "",
                    nick          : "",
                    channels      : [],
                    observchannels: []
                };

                $scope.getData();
            });
    };
    
    
    $scope.onNameChange = function (){
    	if(($scope.nServConf.key.startsWith('irc://') || $scope.nServConf.key.startsWith('ircs://')) && $scope.nServConf.host.length === 0){
    		const url = ircUrlParts($scope.nServConf.key);
    		$scope.nServConf.host = url.host;
    		$scope.nServConf.key = url.host;
    		$scope.nServConf.port = url.port || (url.protocol === "ircs" ? "6697" : "6667");
    		$scope.nServConf.channels = url.label ? [url.label] : [];
    		console.log(url);
    	}
    	
    };

    $scope.joinChannels = function (){
        if ($scope.joinChanStr.length > 0){
            $scope.nServConf.channels = $scope.nServConf.channels.concat($scope.joinChanStr.split(" "));
            $scope.joinChanStr = "";
        }
    };

    $scope.partChannel = function (channel){
        $scope.nServConf.channels.splice($scope.nServConf.channels.indexOf(channel), 1);
    };

    $scope.toggleObserv = function (channel){
        if ($scope.isObserved(channel)){
            $scope.nServConf.observchannels.splice($scope.nServConf.observchannels.indexOf(channel), 1);
        }else{
            $scope.nServConf.observchannels.push(channel);
        }
    };

    $scope.isObserved = function (channel){
        if ($scope.nServConf.observchannels.indexOf(channel) !== -1){
            return true;
        }else{
            return false;
        }
    };

    $scope.isKeyUniqe = function (){
        if(typeof $scope.nServConf.key !== "undefined" && $scope.nServConf.key.length > 0){
            return (typeof $scope.servers[$scope.nServConf.key] === "undefined");
        }
        return true;
    };
    
    function ircUrlParts (ircUrl) {
        // http://tools.ietf.org/html/draft-butcher-irc-url-04
        if (!ircUrl) {
            return;
        }
        var urlParts = ircUrl.split('://');
        if (!urlParts[1]) {
            return;
        }
        var protocol = urlParts[0];
        var port;
        var bufferParts = urlParts[1].split('#');
        var rootPart, bufferString;
        if (bufferParts[0].indexOf('/') === -1) {
            // No slash used as channel delimiter, just hash
            rootPart = bufferParts.shift();
            if (bufferParts.length) {
                bufferString = '#' + bufferParts.join('#');
            }
        } else {
            bufferParts = urlParts[1].split('/');
            rootPart = bufferParts.shift();
            if (bufferParts.length) {
                bufferString = bufferParts.join('/');
            }
        }

        var rootPartSplit = rootPart.split(':');
        if (rootPartSplit[1]) {
        	port = rootPartSplit[1];
        	rootPart = rootPartSplit[0];
            var rootPortSSL = rootPartSplit[1].match(/^\+(\d+)$/);
            if (rootPortSSL) {
                protocol = 'ircs';
            }
        }        
        var url = rootPart;
        var label;
        if (bufferString) {
            var bufferStringParts = bufferString.split(',');
            label = bufferStringParts[0];
            if (bufferStringParts[1] != 'isuser' && $.inArray(label[0], ['#', '＃', '&', '+', '!']) == -1) {
                label = '#' + label;
            }
            url += '/' + label;
        }
        return {
        	protocol: protocol,
        	host: rootPart,
        	port: port,
            label: label,
            url: url
        };
    }
}]);