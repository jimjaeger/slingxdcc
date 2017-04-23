const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const security = require('./security.js');
const session = require('express-session');
const log4js = require('log4js'), logger = log4js
.getLogger('auth');

function isAuthenticated(req, res, next) {
    console.log(security.isEnabled());
    console.log(req.isAuthenticated());
    if (!security.isEnabled() || req.isAuthenticated()) {
        return next();
    }
    res.sendStatus(401);
}

module.exports.authenticate = isAuthenticated;
module.exports.middleware = function (app) {

    app.use(session({
        secret : security.getSessionKey(),
        resave : true,
        saveUninitialized : true,
        cookie : {
            secure : false
        }
    }));

    app.use(passport.initialize());

    app.use(passport.session());

    passport.use(new LocalStrategy(function (username, password, done) {
        const user = security.getActiveUser(username);
        if (!user) {
            logger.info("User");
            return done(null, false, {
                message : 'Incorrect username.'
            });
        }
        if (!security.validatePassword(username, password)) {
            logger.info("Password");
            return done(null, false, {
                message : 'Incorrect password.'
            });
        }
        return done(null, user);
    }));

    passport.serializeUser(function (user, done) {
        done(null, user.email);
    });

    passport.deserializeUser(function (email, done) {
        var user = security.getActiveUser(email);
        if (user) {
            done(null, user);
        } else {
            done({
                message : "Cannot deserialize"
            });
        }
    });

    app.post('/auth/login', passport.authenticate('local'),
            function (req, res) {
                res.json(req.user);
            });

    app.get('/auth/currentuser', isAuthenticated, function (req, res) {
        res.json(req.user || {});
    });

    app.get('/auth/logout', function (req, res) {
        req.logout();
        res.send(200);
    });

};