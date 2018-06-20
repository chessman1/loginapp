var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');


mongoose.Promise = global.Promise;

// User Schema
var UserSchema = mongoose.Schema({
	username: {
		type: String,
		index:true
	},
	email: {
		type: String
	},
	password: {
		type: String
	},
	picture: {
		type: String
	},
	facebook : {
		id: String,
		token: String,
		email: String,
		name: String
	},
	resetPasswordToken: {
		type: String
	},
  	resetPasswordExpires: {
  		type: Date
  	}
});

UserSchema.pre('save', function(next) {
    var user = this;
    var SALT_FACTOR = 5;

    if(!user.isModified('password')){
        return next();
    }

    bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
        if(err){
            return next(err);
        }
        bcrypt.hash(user.password, salt, function(err, hash) {
            if(err){
                return next(err);
            }
            user.password = hash;
            next();
        });
    });
});

var User = module.exports = mongoose.model('User', UserSchema);

module.exports.getUserByUsername = function(username, callback){
	var query = {username: username};
	User.findOne(query, callback);
}

module.exports.getUserById = function(id, callback){
	User.findById(id, callback);
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
	bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
    	if(err) throw err;
    	callback(null, isMatch);
	});
}


