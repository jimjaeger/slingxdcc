'use strict';

/* ServerSettingsCtrl for editing a server in settings */
angular.module('myApp').controller('UserSettingsCtrl',
        [ '$scope', '$http', 'socket', function ($scope, $http, socket) {

            $scope.init = function (key) {
                $scope.user = $scope.users[key];
                $scope.user.id = key;
            };
            
            $scope.editUser = function (){
                
                var user = {
                        email          : $scope.user.email,
                        name          : $scope.user.name,
                        password: $scope.user.password,
                        enabled          : $scope.user.enabled,
                        type        : $scope.user.type,
                    };
                $http.put('/api/user/'+ $scope.user.id, user).then(function (response){
                    $scope.getData();
                });
            };
            
            $scope.removeUser = function (){
                $http.delete('/api/user/' + $scope.user.id).then(function (response){
                    delete $scope.users[$scope.user.id];
                });
            };

        } ]);

/* ServerSettingsCtrl for editing a server in settings */
angular.module('myApp').controller('UserAddCtrl',
        [ '$scope', '$http', 'socket', function ($scope, $http, socket) {

            $scope.nUserConf = {
                email : "",
                name : "",
                password: "",
                enabled : true,
                type : "local"
            };

            
            $scope.addUser = function (){                
                var user = {
                    email          : $scope.nUserConf.email,
                    name          : $scope.nUserConf.name,
                    password: $scope.nUserConf.password,
                    enabled          : $scope.nUserConf.enabled,
                    type        : $scope.nUserConf.type,
                };

                $http.post('/api/user/', user).then(function (data){
                        $scope.nUserConf = {
                                email : "",
                                name : "",
                                password: "",
                                enabled : true,
                                type : "local"
                        };
                        $scope.getData();
                    });
            };
        } ]);

angular.module('myApp').controller('authController', [ '$scope', '$http', '$location', function($scope,$http,$location) {

    $scope.user  = {username:'',password:''};
    $scope.alert = '';

    $scope.login = function(user){
        $http.post('/auth/login', user).
            then(function(data) {
                $scope.loggeduser = data;
                $location.path('/');
            }, function() {
                $location.url('/signin');
                $scope.message = 'Login failed';
            });

    };

    $scope.signup = function(user){
        $http.post('/auth/signup', user).
            then(function(data) {
                $scope.message = data.alert;
             }, function() {
                $scope.message = 'Registration failed';
            });

    };

    $scope.userinfo = function() {
        $http.get('/auth/currentuser').
            then(function (data) {
                $scope.loggeduser = data;
            }, function () {
                $scope.message = 'Login failed';
            });
    };



    $scope.logout = function(){
        $http.get('/auth/logout')
            .then(function() {
                $scope.loggeduser = {};
                $location.path('/');

            }, function() {
                $scope.message = 'Logout failed';
            });
    };
}]);