'use strict';
var encode = require('./../encode.js');
// [ 127, 3, 0, 0, 1, 10, 4, 0, 0, 8, 0, 0, 0, 0, 4, '6', 5, '7', 255, 10 ]
exports.init = function(plugins, server){
	plugins.listen(this, 'ping', function(args){
		var doc = args.doc;
		var data = args.data;
		var ambient = args.ambient;
		if(doc && doc.action && doc.action === 'ears' && doc.left && doc.right){
			var left = parseInt(doc.left, 10);
			var right = parseInt(doc.right, 10);
			encode.ear_positions(ambient, left, right);
			
			data.push(4);
			encode.length(data, ambient.length + 4);
			data.push(0, 0, 0, 0);
			[].forEach.call(ambient, function(e, i){
				data.push(e);
			});
		}
	});
}