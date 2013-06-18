var encode = require('./../encode.js');
exports.init = function(plugins, server){
	plugins.listen(this, 'ping', function(args){
		var doc = args.doc,
			data = args.data,
			ambient = args.ambient;
		if(doc && doc.action && doc.action == 'clear'){
			encode.clear_ambient(ambient, 1);
			
			data.push(0x04);
			encode.length(data, ambient.length + 4);
			data.push(0, 0, 0, 0);
			[].forEach.call(ambient, function(e, i){
				data.push(e);
			});
		}
	});
}