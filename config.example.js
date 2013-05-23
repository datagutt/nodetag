var config = {
	server: {
		host: '127.0.0.1',
		port: 8080,
	},
	db: {
		database : 'nodetag'
	},
	plugins: {
		'ambient.plugin.js': {},
		'ears.plugin.js': {},
		'message.plugin.js': {},
		'reboot.plugin.js': {},
		'clear.plugin.js': {}
	}
}
module.exports = config;
