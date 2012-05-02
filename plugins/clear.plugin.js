var encode = require('./../encode.js').encode;
exports.init = function(plugins, server){
	plugins.listen(this, 'ping', function(args){
		var doc = args.doc;
		var ambient = args.ambient;
		if(doc && doc.action && doc.action == 'clear'){
			encode.clear_ambient(ambient, 1);
			server.isAmbient = 1;
		}
	});
}