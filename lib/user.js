'use strict';
const bcrypt = require('bcrypt');
var User = function(db, encode){
	this.db = db;
	this.encode = encode;
};
User.prototype.login = function(username, password, func){
	var self = this;
	var user;
	self.db.users.findOne({username: username}, function(err, doc){
		if(doc){
			var hashed_password = doc.password;
			var salt = doc.salt;
			if(!hashed_password){
				func(false);
				return;
			}
			if(bcrypt.compareSync(password, hashed_password)){
				user = {
					username: doc.username,
					email: doc.email,
					rabbits: doc.rabbits
				};
			}
		}
		func(user);
	});
};
User.prototype.register = function(username, password, email, func){
	var self = this;
	var hashed_password = self.encode.hash_password(password);
	self.db.users.findOne({username:username}, function(err, doc){
	console.log(err, doc);
		if(!doc && !err){
			self.db.users.save({
				username: username,
				email: email,
				password: hashed_password,
				rabbits: {}
			});
			func({
				username: username,
				email: email,
				rabbits: {}
			});
		}else{
			func(false);
		}
	});
};
module.exports = User;