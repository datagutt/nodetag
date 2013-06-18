'use strict';
var fs = require('fs');
exports.init = function(plugins, server){
	plugins.listen(this, 'record', function(args){
		var stream = fs.createWriteStream('../media/'+args.sn+'-audio.wav');
		args.req.pipe(stream);
		
		args.req.on('end', function(){
			args.res.send('');
		});
	});
};