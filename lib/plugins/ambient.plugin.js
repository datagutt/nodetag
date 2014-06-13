'use strict';
var encode = require('./../encode.js');
exports.init = function(plugins, server){
	plugins.listen(this, 'ping', function(args){
		var doc = args.doc,
			data = args.data,
			ambient = args.ambient,
			type = 0;
		if(doc && doc.action && doc.action === 'ambient' && doc.value){
			type = parseInt(doc.type, 10);
			encode.set_ambient(ambient, type, parseInt(doc.value, 10));

			data.push(0x04);
			encode.length(data, ambient.length + 4);
			data.push(0, 0, 0, 0);
			ambient.forEach(function(e, i){
				data.push(e);
			});
		}
	});
}
