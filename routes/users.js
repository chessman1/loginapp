var express = require('express');
var router = express.Router();
var passport = require('passport');
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

router.post('/changepass', function(req, res){
  var newpasswd = req.body.newpasswd;
  var newpasswd2 = req.body.newpasswd2;

  // validate user inputs
 
  req.checkBody('password2', 'Passwords do not match').equals(req.body.newpasswd2);

  //userschema function
  

    res.redirect('/users/changepass');
  }

});



router.get('/logout', function(req, res){
	req.logout();

	req.flash('success_msg', 'You are logged out');

	res.redirect('/users/login');
});

module.exports = router;