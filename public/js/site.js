var Site = {};
Site.Core = {};
Site.Core.init = function(){
	N1.addEvent('.form', 'submit', function(e){
		var form = this;
		N1.ajax.post(form.action,
			JSON.stringify(form),
			function(data){
				alert(data);
			});
		N1.preventDefault(e);
		return false;
	});
}
N1.documentReady(Site.Core.init);