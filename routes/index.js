var express = require('express');
var router = express.Router();
var passport = require("passport");

// Get Homepage
router.get('/', ensureAuthenticated, function(req, res){
    res.render('index');
});

//FB routes
router.get('/auth/facebook', passport.authenticate('facebook', {scope: ['email']}));

router.get('/auth/facebook/callback', 
      passport.authenticate('facebook', { successRedirect: '/',
                                          failureRedirect: 'users/login' }));


function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		res.redirect('/users/login');
	}
}

module.exports = router;