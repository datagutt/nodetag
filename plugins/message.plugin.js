var encode = require('./../encode.js').encode;
exports.init = function(plugins, server){
	plugins.listen(this, 'ping', function(args){
		var doc = args.doc;
		var data = args.data;
		var ambient = args.ambient;
		var message = [];
		message.push('ID ' + Math.floor((new Date).getTime() / 1000) + '\n');		//message.push('ST /mood/1.mp3');
		message.push('MU http://translate.google.com/translate_tts?q=A+simple_text+to+voice+demonstration');
		message = message.join('\n');
		if(doc && doc.action && doc.action == 'tts'){
			encode.message(ambient, message);
			data.push(10);
			encode.length(data, ambient.length);
			ambient.forEach(function(e){ 
				//console.log(e);
				data.push(e);
			}); 
		}
	});
}