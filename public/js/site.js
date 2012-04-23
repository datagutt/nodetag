var Site = {};
Site.Core = {};
window.onerror = function(a){alert(a);};
Site.Core.init = function(){
	N1.forEach(N1.getElements('.form'), function(i, form){
		N1.addEvent(form, 'submit', function(e){
			var inputs = {}, temp_inputs = form.getElementsByTagName('input');
			N1.forEach(temp_inputs, function(i, input){
				var name = input.name;
				var value = input.value;
				if(name && value !== null){
					inputs[name] = value;
				}
				if(i == temp_inputs.length - 1){
					callback();
				}
			});
			function callback(){
				N1.ajax.post(form.action,
					inputs,
					function(data){
						alert(data);
					});
			}
			N1.preventDefault(e);
			return false;
		});
	});
}
//N1.documentReady(function(){Site.Core.init();});