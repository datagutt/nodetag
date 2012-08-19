/**
	© 2012 nodetag, see LICENSE.txt for license.
**/
var util = require('util'),
express = require('express')
twig = require('twig'),
MemoryStore = require('connect').session.MemoryStore,
app = express(),
fs = require('fs'),
mime = require('mime'),
encode = require('./encode.js').encode;
User = require('./user.js').User,
Plugins = require('./plugins.js').Plugins;
var server = {};
var db = require('mongojs');
server.http = {};
server.http.getBootcode = function(res){
	var filename = './firmware/bootcode.bin';
	fs.exists(filename, function(exists) {
		if(!exists) {
			res.send(404, '404 Not Found\n');
			console.log('[404] Could not find bootcode!');
			return;
		}
		fs.readFile(filename, 'binary', function(err, file) {
			if(err) {
				res.type('text/plain');
				res.send(500, err + '\n');
			}
            var type = mime.lookup(filename);
            res.type(type);
            res.send(file);
		});
	});
}
server.http.handleJSP = function(route, params, res, config){
	switch(route){
		case 'bc':
			server.http.getBootcode(res);
		break;
		case 'record':
			// FIXTHIS
			var post = [];
			fs.writeFile('./media/'+params.sn+'-audio.wav', post[0], function(err) {
				if(err){
					throw err;
				}else{
					console.log('The file was saved!');
				}
			}); 
			Plugins.fire('record', {'get': params, 'post': post});
		break;
		case 'p4':
			// [ 127, 3, 0, 0, 1, 10, 4, 0, 0, 6, 0, 0, 0, 0, 1, 8, 255, 10 ]
			// Get from database
			db.actions.findOne({sn: params.sn}, function(err, doc){
				var ambient = [];
				// Handle ping
				console.log('[PINGED]');
				var data = [0x7f];
				// encode ping interval block
				data.push(0x03, 0x00, 0x00, 0x01, 10);
				Plugins.fire('ping', {'data': data, 'ambient': ambient, 'doc': doc});
				// encode end of data
				data.push(0xff, 0x0a);
				encoded = encode.array(data);
				res.type('binary');
				res.send(encoded);
				db.actions.remove({sn: params.sn});
			});
		break;
		case 'locate':
			res.send('ping '+config.server.host+':'+config.server.port+' \r\nbroad '+config.server.host+':'+config.server.port+' \r\n');
		break;
		default:
			res.send('');
		break;
	}
	return true;
}
server.http.start = function(config){
	app.set('views', __dirname + '/views');
    app.set('view engine', 'twig');
   	app.set('view options', {layout:false});
	app.configure(function(){
		app.use(express['static'](__dirname + '/public'));
		app.use(express.bodyParser());
		app.use(express.cookieParser('nodetag'));
		app.use(express.session({cookie: {path: '/', httpOnly: true, maxAge: null}, secret: 'nodetag'}));
		app.use(app.router);
	});
	app.get('/', function(req, res){
		var isLoggedIn = function(){return req.session && req.session.user;};
		var username = (isLoggedIn() && req.session.user.username) ? req.session.user.username : "";
		var rabbits = (isLoggedIn() && req.session.user.rabbits) ? Object.keys(req.session.user.rabbits).length : 0;
		res.render('index', {
			'COUNT': rabbits,
			'USERNAME': username,
			'loggedin' : isLoggedIn()
		});
	});
	app.get('/rabbits', function(req, res){
		var isLoggedIn = function(){return req.session && req.session.user;};
		if(!isLoggedIn()){
			res.status(500);
			res.end();
			return;
		}
		loggedinFunc = function(res){
			if(isLoggedIn() && req.session.user.rabbits){
				session_rabbits = req.session.user.rabbits;
				var out = '', o = session_rabbits;
				for (var p in o) {
					out += '<li><a href="/rabbit?sn=' + o[p]['sn'] + ' "> ' + o[p]['name'] + '</a> - ' + o[p]['sn'] + '</li>';
				}
			}
			res.status(200);
			res.render('rabbits', {
				'RABBITS': out
			});
		};
		if(typeof loggedinFunc !== 'undefined'){
			loggedinFunc(res);
		}
	});
	app.post('/addBunny', function(req, res){
		var result = {};
		var post = req.body;
		res.status(200);
		if(!req.session || !req.session.user){
			res.end('Your not logged in!');
			return;
		}
		if(!post){
			res.end('No values sent!');
			return;
		}
		if(post.name){
			name = post.name;
		}else{
			name = 'noname';
		}
		if(post.sn){
			sn = post.sn;
		}else{
			sn = '01234abcd';
		}
		result.name = name;
		result.sn = sn;
		req.session.user.rabbits = rabbits = {0: result};
		db.users.findOne({username: req.session.user.username}, function(err, doc){
			if(doc){
				doc.rabbits = rabbits;
				db.users.update({username: req.session.user.username}, doc, true);
			}
		});
		res.end('Updated!');
	});
	app.get('/logout', function(req, res){
		if(req.session && req.session.user){	
			delete req.session.user;
			res.status(302);
			res.set('Location', '/');
		}else{
			res.status(500);
		}
		res.end();
	});
	app.get('/vl/:action', function(req, res){
		var action = req.params.action ? req.params.action.replace('.jsp', '') : '';
		server.http.handleJSP(action, req.params, res, config);
	});
	app.get('*', function(req, res){
		console.log('[404] ' + req.params[0]);
		res.status(404);
		res.end('404 Not Found\n');
	});
	// API
	app.post('/login', function(req, res){
		if(req.body && req.body.username && req.body.password){
			User.login(req.body.username, req.body.password, function(answer){
				if(answer){
					req.session.user = answer;
					res.status(302);
					res.set('Location', '/');
					res.end();
				}else{
					res.end('Wrong username or password.');
				}
			});
		}else{
			res.end('Please fill out all fields.\n');
		}
	});
	app.post('/register', function(req, res){
		if(req.body && req.body.username && req.body.password && req.body.email){
			User.register(req.body.username, req.body.password, req.body.email, function(answer){
				if(answer){
					req.session.user = answer;
					res.status(302);
					res.set('Location', '/');
					res.end();
				}else{
					res.end('User already exists!');
				}
			});
		}else{
			res.end('Please fill out all fields.\n');
		}
	});
	app.listen(config.server.port, config.server.host);
}
server.start = function(config){
	// If config exists, use it, else use default.
	config = config || {
		server: {
			host: '192.168.0.8',
			port: 80
		},
		db: {
			database : 'nodetag'
		},
		plugins: {
			'ambient.plugis.js': {},
			'ears.plugin.js': {},
			'clear.plugin.js': {}
		}
	}
	// Connect to db
	db = db.connect(config.db.database, ['rabbits', 'users', 'actions']);
	console.log('nodetag started on ' + config.server.host + ':' + config.server.port);
	// Init User
	User = new User(db, encode);
	server.http.start(config);
	// Init plugins
	Plugins = exports.Plugins = new Plugins(this);
	Plugins.load(config.plugins);
}
exports.server = server;