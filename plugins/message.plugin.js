var encode = require('./../encode.js').encode;
exports.init = function(plugins, server){
	plugins.listen(this, 'ping', function(args){
		var doc = args.doc;
		var data = args.data;
		var ambient = args.ambient;
		var msg = [];
		var code = 'ID 1337\n';	
		//message.push('MU /mood/1.mp3');
		code = 'MU http://translate.google.com/translate_tts?q=this+is+a+test';
		
		if(doc && doc.action && doc.action == 'tts'){
			encode.message(msg, code);
			data.push(10);
			encode.length(data, msg.length);
			[].forEach.call(msg, function(e){ 
				console.log(e);
				data.push(e);
			}); 
		}
	});
}