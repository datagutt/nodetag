var encode = require('./../encode.js').encode;
exports.init = function(plugins, server){
	plugins.listen(this, 'ping', function(args){
		var doc = args.doc;
		var ambient = args.ambient;
		encode.message.send(ambient, 'MU http://lyd.nrk.no/nrk_radio_p3_mp3_h');
		console.log(encode.message.parse(args.data.join('')));
		console.log(encode.message.parse(args.ambient.join('')));
		server.isAmbient = 1;
	});
}