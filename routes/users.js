var express = require('express');
var router = express.Router();
var passport = require('passport');
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var FACEBOOK_APP_ID = '162806701032642';
var FACEBOOK_APP_SECRET = '7365159e1cff7f5cccbb98d30e6cb6be';

var User = require('../models/user');

// Register
router.get('/register', function(req, res){
	res.render('register');
});

// Login
router.get('/login', function(req, res){
    res.render('login');
});


router.get('/reset', function(req, res){
    res.render('reset');
});

router.get('/forgot', function(req, res){
    res.render('forgot');
});

// user data
router.post('/register', function(req, res){
	var email = req.body.email;
  var password = req.body.password;
  var password2 = req.body.password2;

	// validate user inputs
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

	var errors = req.validationErrors();

	if(errors){
		res.render('register',{
			errors:errors
		});
	} else {
		var newUser = new User({
			email: email,
			password: password
		});

		User.createUser(newUser, function(err, user){
			if(err) throw err;
			console.log(user);
		});

		res.redirect('/users/login');
	}
});

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  function(username, password, done) {
   User.findOne({email:username}, function(err, user){
   	if(err) throw err;
   	if(!user){
   		return done(null, false, {message: 'Unknown User'});
   	}

   	User.comparePassword(password, user.password, function(err, isMatch){
   		if(err) throw err;
   		if(isMatch){
   			return done(null, user);
   		} else {
   			return done(null, false, {message: 'Invalid password'});
   		}
   	});
   });
  }));

//FB strategy
passport.use(new FacebookStrategy({
    clientID        : FACEBOOK_APP_ID,
    clientSecret    : FACEBOOK_APP_SECRET,
    callbackURL    : 'http://localhost:8080/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name'] 
},
function (accessToken, refreshToken, profile, done) {
    process.nextTick(function(){
          User.findOne({'facebook.id': profile.id}, function(err, user){
            if(err)
              return done(err);
            if(user)
              return done(null, user);
            else {
              var newUser = new User();
              newUser.facebook.id = profile.id;
              newUser.facebook.token = accessToken;
              newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
              newUser.facebook.email = profile.emails[0].value;

              newUser.save(function(err){
                if(err)
                  throw err;
                return done(null, newUser);
              })
              console.log(profile);
            }
          });
})
}));

//routes for FB login
router.get('/auth/facebook', passport.authenticate('facebook', { scope : ["email"] }));

router.get('/auth/facebook/callback',
passport.authenticate('facebook', {
failureRedirect: 'users/login'
}),
function(req, res) {
res.redirect('/');
}
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

router.post('/login',
  passport.authenticate('local', {
    successRedirect:'/',
    failureRedirect:'/users/login',
    failureFlash: true
    }),
  function(req, res) {
    res.redirect('/');
  });

router.post('/', function (req, res) {
   async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('users/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
    var smtpTransport = nodemailer.createTransport({
      service: 'Gmail', 
      auth: {
        xoauth2: xoauth2.createXOAuth2Generator({
        user: 'kylevantil14@gmail.com',
       
     })
      }
    });
      var mailOptions = {
        to: user.email,
        from: 'passwordreset@demo.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});
 
router.post('/reset', function (req, res) {
    
    
    var password = req.body.password;
    var confirm = req.body.confirm;
    if (password !== confirm) return res.end('passwords do not match');
    
    // update the user db here 
   
    res.end('password reset');
});


router.get('/logout', function(req, res){
	req.logout();

	req.flash('success_msg', 'You are logged out');

	res.redirect('/users/login');
});

module.exports = router;