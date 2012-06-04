var encode = require('./../encode.js').encode;
exports.init = function(plugins, server){
	plugins.listen(this, 'ping', function(args){
		var doc = args.doc;
		var data = args.data;
		var ambient = args.ambient;
		if(doc && doc.action && doc.action == 'ambient' && doc.value){
			type = parseInt(doc.type, 10);
			encode.set_ambient(ambient, type, parseInt(doc.value, 10));
			
			data.push(4);
			encode.length(data, ambient.length + 4);
			data.push(0, 0, 0, 0);
			[].forEach.call(ambient, function(e, i){
				data.push(e);
			});
		}
	});
}