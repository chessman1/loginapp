var express = require('express');
var router = express.Router();
var passport = require('passport');
var async = require('async');
var mime = require('mime');
var crypto = require('crypto');
var multer  = require('multer');
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
      cb(null, 'public/uploads')
  },
  filename: function(req, file, cb) {
      crypto.pseudoRandomBytes(16, function(err, raw) {
          cb(null, raw.toString('hex') + '.' + mime.getExtension(file.mimetype));
      });
    }
});

var upload = multer({
  storage: storage
});

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var FACEBOOK_APP_ID = '162806701032642';
var FACEBOOK_APP_SECRET = '7365159e1cff7f5cccbb98d30e6cb6be';

var User = require('../models/user');


//no address some page not found with picture





// Get Homepage


//Homepage
router.get('/homepage', ensureAuthenticated, function(req,res) { 
  res.render('homepage');
});

// Register
router.get('/register', function(req, res){
	res.render('register');
});

// Login
router.get('/login', function(req, res){
    res.render('login');
});

router.get('/forgot', function(req, res) {
  res.render('forgot');
});

//Reset
router.get('/chat', function(req, res) {
  res.render('chat');
});


// user data

router.post('/register', function(req, res){
	var email = req.body.email;
  var password = req.body.password;
  var password2 = req.body.password2;
  //procent complete profile

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
  
		var user = new User({
			email: email,
			password: password,
		});

		user.save(function(err) {
    req.logIn(user, function(err) {
      res.redirect('/');
    });
  });
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

router.post('/', function (req, res, next) {
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
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hours

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {

    var transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'chesslebron1@gmail.com',
        pass: 'trewq123'                
      }
    });
    
    var mailOptions = {
        to: user.email,
        from: 'passwordreset@demo.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/users/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };

      transport.sendMail(mailOptions, function(err) {
        req.flash('success_msg', 'An e-mail has been sent to ' + user.email +' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) { 
    if (err) return next(err);
    res.redirect('users/forgot');
  });
});

//from email token 
router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/');
    }
    res.render('reset');
  });
});
 
router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, 
        resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('/users/reset');
        }

        //log in if token expired ?
        user.password = req.body.password;
        user.resetPasswordToken = undefined; // undefined because is unique
        user.resetPasswordExpires = undefined;

        req.checkBody('password', 'Password is required').notEmpty();
        req.checkBody('password2', 'Password confirm is required').notEmpty();
        req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

        var errors = req.validationErrors();

        if(errors){
          res.render('reset',{
            errors:errors
          });
        }

        user.save(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      var transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'chesslebron1@gmail.com',
        pass: 'trewq123'            
      }
    });
      var mailOptions = {
        to: user.email,
        from: 'passwordreset@demo.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      transport.sendMail(mailOptions, function(err) {
        req.flash('success_msg', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
});

router.post('/profile', upload.single('pic'), function(req, res, next) {

var pic = req.file.filename;

User.update({
  username: req.user.username
}, {
  $set: { 
    "picture" : pic
  }
}, function (err, user) {
    if (err) throw error;
    res.redirect('/');
});


});

function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next();
  } else {
    res.redirect('/users/login');
  }
}

router.get('/logout', function(req, res){
	req.logout();

	res.redirect('/users/login');
});

module.exports = router;