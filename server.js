/**
	© 2012 nodetag, see LICENSE.txt for license.
**/
'use strict';
var express = require('express'),
	twig = require('twig'),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	expressSession = require('express-session'),app = express(),
	fs = require('fs'),
	mime = require('mime'),
	encode = require('./lib/encode.js'),
	User = require('./lib/user.js'),
	Plugins = require('./lib/plugins.js'),
	mongojs = require('mongojs');
var db;
var server = {};
server.http = {};
server.http.getBootcode = function(res){
	var filename = './firmware/bootcode.bin';
	fs.exists(filename, function(exists) {
		if(!exists) {
			res.send(404, '404 Not Found\n');
			console.log('[404] Could not find bootcode!');
			return;
		}
		res.download(filename, function(err){
			if(err){
				res.type('text/plain');
				res.send(500, err + '\n');
			}
		});
	});
};
server.http.handleJSP = function(route, params, req, res, config){
	//console.log(route, params);
	switch(route){
		case 'bc':
			server.http.getBootcode(res);
		break;
		case 'record':
			if(params && params.sn && req.rawBody){
				Plugins.fire('record', {'sn': params.sn, 'req': req, 'res': res});
			}
		break;
		case 'p4':
			// [ 127, 3, 0, 0, 1, 10, 4, 0, 0, 6, 0, 0, 0, 0, 1, 8, 255, 10 ]
			// Get from database
			db.actions.findOne({sn: params.sn}, function(err, doc){
				var data = [0x7f, 0x03, 0x00, 0x00, 0x01, 5],
					ambient = [],
					encoded;

				// Handle ping
				console.log('[PINGED]');
				Plugins.fire('ping', {'data': data, 'ambient': ambient, 'doc': doc});

				data.push(0xff, 0x0a);
				res.end(encode.array(data), 'binary');
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
};
server.http.start = function(config){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'twig');
	app.set('view options', {layout:false});
	app.use(express['static'](__dirname + '/public'));
	app.use(bodyParser.urlencoded({
		extended: true
	}));
	app.use(cookieParser('nodetag'));
	app.use(expressSession({
		secret: 'secret',
	    proxy: true,
	    resave: true,
	    saveUninitialized: true,
		cookie: {
			httpOnly: true
		}
	}));
	app.get('/', function(req, res){
		var isLoggedIn = function(){return req.session && req.session.user;};
		var username = (isLoggedIn() && req.session.user.username) ? req.session.user.username : '';
		var rabbits = (isLoggedIn() && req.session.user.rabbits) ? Object.keys(req.session.user.rabbits).length : 0;
		res.render('index', {
			'COUNT': rabbits,
			'USERNAME': username,
			'loggedin' : isLoggedIn()
		});
	});
	app.get('/rabbits', function(req, res){
		var out = '';
		var isLoggedIn = function(){return req.session && req.session.user;};
		if(!isLoggedIn()){
			res.status(500);
			res.end('You are not logged in!');
			return;
		}
		var loggedinFunc = function(res){
			if(isLoggedIn() && req.session.user.rabbits){
				var o = req.session.user.rabbits;
				for (var p in o) {
					if(o.hasOwnProperty(p)){
						out += '<li><a href="/rabbit/' + o[p].sn + ' "> ' + o[p].name + '</a> - ' + o[p].sn + '</li>';
					}
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
	app.get('/rabbit/:sn', function(req, res){
		var isLoggedIn = function(){return req.session && req.session.user;};
		if(!isLoggedIn()){
			res.status(500);
			res.end('You are not logged in!');
			return;
		}
		res.render('rabbit', {
			'SN': req.params.sn
		});
	});
	app.post('/addBunny', function(req, res){
		var result = {}, name, sn, rabbits;
		var post = req.body;
		res.status(200);
		if(!req.session || !req.session.user){
			res.status(500);
			res.end('You are not logged in!');
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
			res.end('You are not logged in!');
			return;
		}
		res.end();
	});
	app.get('/vl/:action', function(req, res){
		var action = req.params.action ? req.params.action.replace('.jsp', '') : '';
		server.http.handleJSP(action, req.query, req, res, config);
	});
	app.post('/vl/record.jsp', function(req, res){
		server.http.handleJSP('record', req.query, req, res, config);
	});
	app.get('*', function(req, res){
		console.log('[404] ' + req.params[0]);
		res.status(404);
		res.end('404 Not Found\n');
	});
	// API
	app.post('/api/ambient', function(req, res){
		var post = req.body, type, value, sn;
		if(post){
			var result = {};
			if(!req.session || !req.session.user){
				res.status(500);
				res.end('You are not logged in!');
				return;
			}
			if(req.session && req.session.user && req.session.user.rabbits[0] && post.sn && req.session.user.rabbits[0].sn !== post.sn){
				res.end('This is not your rabbit!');
				return;
			}
			if(post.type){
				type = post.type;
			}else{
				type = 0;
			}
			if(post.value){
				value = post.value;
			}else{
				value = Math.floor((Math.random()*18)+1);
			}
			if(post.sn){
				sn = post.sn;
			}else{
				sn = '01234abcd';
			}
			result.value = value;
			result.action = 'ambient';
			result.type = type;
			result.sn = sn;
			db.actions.save(result);
		}
		res.end('Changed!');
	});
	app.post('/api/ears', function(req, res){
		var post = req.body, left, right, sn;
		if(post){
			var result = {};
			if(!req.session || !req.session.user){
				res.status(500);
				res.end('You are not logged in!');
				return;
			}
			if(req.session && req.session.user && req.session.user.rabbits[0] && post.sn && req.session.user.rabbits[0].sn !== post.sn){
				res.end('This is not your rabbit!');
				return;
			}
			if(post.left){
				left = post.left;
			}else{
				left = 0;
			}
			if(post.right){
				right = post.right;
			}else{
				right = 0;
			}
			if(post.sn){
				sn = post.sn;
			}else{
				sn = '01234abcd';
			}
			result.left = left;
			result.right = right;
			result.action = 'ears';
			result.sn = sn;
			db.actions.save(result);
		}
		res.end('Changed!');
	});
	app.post('/api/reboot', function(req, res){
		var post = req.bod, sn;
		if(post){
			var result = {};
			if(!req.session || !req.session.user){
				res.end('Your not logged in!');
				return;
			}
			if(req.session && req.session.user && req.session.user.rabbits[0] && post.sn && req.session.user.rabbits[0].sn !== post.sn){
				res.end('This is not your rabbit!');
				return;
			}
			if(post.sn){
				sn = post.sn;
			}else{
				sn = '01234abcd';
			}
			result.action = 'reboot';
			result.sn = sn;
			db.actions.save(result);
		}
		res.end('Changed!');
	});
	app.post('/api/tts', function(req, res){
		var post = req.body, sn;
		if(post){
			var result = {};
			if(!req.session || !req.session.user){
				res.end('Your not logged in!');
				return;
			}
			if(req.session && req.session.user && req.session.user.rabbits[0] && post.sn && req.session.user.rabbits[0].sn !== post.sn){
				res.end('This is not your rabbit!');
				return;
			}
			if(post.sn){
				sn = post.sn;
			}else{
				sn = '01234abcd';
			}
			result.action = 'tts';
			result.sn = sn;
			db.actions.save(result);
		}
		res.end('Changed!');
	});
	app.post('/api/clear', function(req, res){
		var result = {} , sn;
		var post = req.body;
		if(!req.session || !req.session.user){
			res.end('Your not logged in!');
			return;
		}
		if(req.session && req.session.user && req.session.user.rabbits[0] && post.sn && req.session.user.rabbits[0].sn !== post.sn){
			res.end('This is not your rabbit!');
			return;
		}
		if(post.sn){
			sn = post.sn;
		}else{
			sn = '01234abcd';
		}
		result.action = 'clear';
		result.sn = sn;
		db.actions.save(result);
		res.end('Cleared!');
	});

	// Auth
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
	app.listen(config.server.port);
};
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
			'ambient.plugin.js': {},
			'ears.plugin.js': {},
			'clear.plugin.js': {}
		}
	};
	// Connect to db
	db = mongojs(config.db.database, ['rabbits', 'users', 'actions']);
	console.log('nodetag started on ' + config.server.host + ':' + config.server.port);
	// Init User
	User = new User(db, encode);
	server.http.start(config);
	// Init plugins
	Plugins = exports.Plugins = new Plugins(this);
	Plugins.load(config.plugins);
};
server.start(require('./config.local.js'));
