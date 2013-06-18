'use strict';
var fs = require('fs');
exports.init = function(plugins, server){
	plugins.listen(this, 'record', function(args){
	console.log(args);
		fs.writeFile('./media/'+args.sn+'-audio.wav', raw, function(err) {
			if(err){
				throw err;
			}else{
				console.log('The file was saved!');
			}
		}); 
	});
};