var encode = require('./../encode.js').encode;
exports.init = function(plugins, server){
	plugins.listen(this, 'ping', function(args){
		var doc = args.doc;
		var data = args.data;
		if(doc && doc.action == "reboot"){
			data.push(0x09, 0x00, 0x00, 0x00);
		}
	});
}