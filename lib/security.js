'use strict';

var users = function users() {
	// defining a var instead of this (works for variable & function) will
	// create a private definition
	var nconf = require('nconf'), log4js = require('log4js'), logger = log4js
			.getLogger('users');

	var homePath = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
	var appHome = homePath + '/.slingxdcc/';
	const passwordReplace = 'SYSTEM_REPLACED_SYSTEM_REPLACED_SYSTEM_REPLACED';

	nconf.add('settings', {
		type : 'file',
		file : appHome + 'config/settings.json'
	});

	nconf.defaults({
		'usermanagement' : {
		    enabled: false,
			users : []
		}
	});
	nconf.set('usermanagement', nconf.get('usermanagement'));
	nconf.save();

	const activeUsers = {};
	const passwords = {};
	let enabled = false;
	const sessionkey = 'Q0rtvJ:o>uJ46S{Hag5:Ihk<Z9Kx{0';

	init();

	var self = this;

	function clone(obj) {
		// Handle the 3 simple types, and null or undefined
		if (null === obj || 'object' !== typeof obj) {
			return obj;
		}

		// Handle Date
		if (obj instanceof Date) {
			let copy = new Date();
			copy.setTime(obj.getTime());
			return copy;
		}

		// Handle Array
		if (obj instanceof Array) {
			let copy = [];
			for (var i = 0, len = obj.length; i < len; i++) {
				copy[i] = clone(obj[i]);
			}
			return copy;
		}

		// Handle Object
		if (obj instanceof Object) {
			var copy = {};
			for ( var attr in obj) {
				if (obj.hasOwnProperty(attr)) {
					copy[attr] = clone(obj[attr]);
				}
			}
			return copy;
		}

		throw new Error('Unable to copy obj! Its type is not supported.');
	}
	
    this.getActiveUser = function (userkey) {
        if (typeof activeUsers[userkey] !== 'undefined') {
            return activeUsers[userkey];
        }
        return null;
    };
	
	this.getActiveUsers = function () {
        return activeUsers;
    };
    
    this.editUser = function(userkey, user){
        var existingUser = activeUsers[userkey];
        if (typeof existingUser === 'undefined'){
            return;
        }
        if (user.password === passwordReplace){
            user.password = passwords[userkey];
        }
        //make persistent
        nconf.set('usermanagement:users:' + userkey, user);
        nconf.save();
        passwords[userkey] = user.password;
        user.password = passwordReplace;
        activeUsers[userkey] = user;
        return userkey;  
    };
    
    this.removeUser = function(userkey){
        var existingUser = activeUsers[userkey];
        if (typeof existingUser === 'undefined'){
            return;
        }
        delete passwords[userkey];
        delete activeUsers[userkey];
        //make persistent
        nconf.clear('usermanagement:users:' + userkey);
        enabled = enabled && Object.keys(activeUsers).length > 0;
        nconf.set('usermanagement:enabled', enabled);
        nconf.save();
        return userkey;  
    };
    
    this.addUser =  function(user){
        var userkey = user.email;
        if (typeof activeUsers[userkey] !== 'undefined' || typeof userkey === 'undefined'){
            return;
        }
        //make persistent
        console.log(user);
        nconf.set('usermanagement:users:' + userkey, user);
        nconf.save();
        passwords[userkey] = user.password;
        user.password = passwordReplace;
        activeUsers[userkey] = user;
        return userkey;
        
    };
    
    this.isEnabled = function(){
        return enabled;
    };
    
    this.getSessionKey = function (){
        return sessionkey;
    };
    
    this.validatePassword = function(userkey,  password){
        return typeof passwords[userkey] !== 'undefined' && passwords[userkey] === password;
    };

	function init() {
		function add(userkey, user) {
		    passwords[userkey] = user.password;
		    user.password = passwordReplace;
		    activeUsers[userkey] = user;
		}

		var users = nconf.get('usermanagement:users');
		// logger.info('Found servers', servers);
		for ( var userkey in users) {
			add(clone(userkey), clone(users[userkey]));

		}
		enabled = nconf.get('usermanagement:enabled') || false;
		enabled = enabled && Object.keys(activeUsers).length > 0;
		nconf.set('usermanagement:enabled', enabled);
	    nconf.save();
		//sessionkey = nconf.get('usermanagement:enabled') || 'securedsession';
	}
	
};

/*******************************************************************************
 * SINGLETON CLASS DEFINITION
 ******************************************************************************/
users.instance = null;

/**
 * Singleton getInstance definition
 * 
 * @return singleton class
 */
users.getInstance = function() {
	if (this.instance === null) {
		this.instance = new users();
	}
	return this.instance;
};
users.prototype = Object.create(require('events').EventEmitter.prototype);
module.exports = users.getInstance();