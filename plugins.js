var Plugins = function(server){
	this.server = server;
	this.hooks = {};
	this.plugins = {};
};
Plugins.prototype = {
	load: function(plugins){
		for(plugin in plugins){
			var tempPlugin = require('./plugins/'+plugin);
			if(typeof tempPlugin == 'object'){
				if(plugins[plugin]){
					tempPlugin.name = plugin;
					tempPlugin.config = plugins[plugin];
				}
				tempPlugin.init(this, this.server);
			}
			this.plugins[plugin] = tempPlugin;
		}
	},
	isPluginFunction: function(plugin, func){
		return !!(plugin && this.plugins[plugin] && this.plugins[plugin][func] && typeof this.plugins[plugin][func] == 'function');
	},
	listen: function(plugin, event, func){
		if(this.hooks[plugin.name] == undefined){
			this.hooks[plugin.name] = [];
		}
		this.hooks[plugin.name][event] = func;
	},
	fire: function(event, passedVars, callback){
		var hooks = this.hooks;
		var self = this;
		for (plugin in hooks){
			if(hooks[plugin]){
				if(typeof hooks[plugin][event] == 'function'){
					hooks[plugin][event].apply(self, [passedVars]);
					if(typeof callback == 'function'){
						try{
							callback();
						}catch(e){
							console.log('[ERROR] ' + e);
						}
					}
				}	
			}
		}
	}
};
module.exports = Plugins;