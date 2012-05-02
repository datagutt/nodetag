var encode = require('./../encode.js').encode;
exports.init = function(plugins, server){
	plugins.listen(this, 'ping', function(args){
		var doc = args.doc;
		var ambient = args.ambient;
		if(doc && doc.action && doc.action == 'ambient' && doc.color){
			type = parseInt(doc.type, 10);
			encode.set_ambient(ambient, type, parseInt(doc.color, 10));
			server.isAmbient = 1;
		}
	});
}