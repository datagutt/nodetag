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
			if(self.encode.hash_password(salt, password) === hashed_password){
				user = {
					username: doc.username,
					email: doc.email,
					rabbits: doc.rabbits
				};
			}
		}
		func(user);
	});
}
User.prototype.register = function(username, password, email, func){
	var self = this;
	var salt = Math.round((new Date().valueOf() * Math.random())) + '';
	var hashed_password = self.encode.hash_password(salt, password);
	self.db.users.findOne({username:username}, function(err, doc){
		if(!doc){
			self.db.users.save({
				username: username,
				email: email,
				password: hashed_password,
				salt: salt,
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
}
module.exports.User = User;