/*
 * ----------------------------------------------------------------------------
 * "THE BEER-WARE LICENSE" (Revision 42):
 * <varga.daniel@gmx.de> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return Daniel Varga
 * ----------------------------------------------------------------------------
 */
'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp', ['myApp.filters', 'myApp.services', 'myApp.directives', 'ui.bootstrap', 'chart.js', 'ngRoute', 'angular-web-notification']).
	config(['$routeProvider', '$locationProvider', '$httpProvider' , function ($routeProvider, $locationProvider, $httpProvider){
        
	    
	    //================================================
        // Check if the user is connected
        //================================================
        var checkLoggedin = function($q, $timeout, $http, $location, $rootScope){
          // Initialize a new promise
          var deferred = $q.defer();

          // Make an AJAX call to check if the user is logged in
          $http.get('/auth/currentuser').then(function(user){
              deferred.resolve();
          }, function(){
              $rootScope.message = 'You need to log in.';
              deferred.reject();
              $location.url('/signin');
          });

          return deferred.promise;
        };
        
	    
        //================================================
        // Add an interceptor for AJAX errors
        //================================================
        $httpProvider.interceptors.push(function($q, $location) {
          return {
            response: function(response) {
              // do something on success
              return response;
            },
            responseError: function(response) {
              if (response.status === 401){
                $location.url('/signin');
              }
              return $q.reject(response);
            }
          };
        });
	    
	    
	    $routeProvider.
            when('/', {
                templateUrl: 'partials/dashboard/'
            }).
            when('/packets', {
                templateUrl: 'partials/packetlist/'
            }).
            when('/settings', {
                templateUrl: 'partials/settings/',
                resolve: {
                    loggedin: checkLoggedin
                }
            }).
            when('/downloads', {
                templateUrl: 'partials/downloads/',
                resolve: {
                    loggedin: checkLoggedin
                  }
            }).
            when('/signin', {
                templateUrl: '/partials/security/signin',
                controller: 'authController'
            }).
            when('/signup', {
                templateUrl: '/partials/security/signup',
                controller: 'authController'
            }).
            otherwise({
                redirectTo: '/'
            });
        $locationProvider.html5Mode(true);
        

    }]);

