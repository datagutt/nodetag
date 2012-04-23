/**
	© 2012 nodetag, see LICENSE.txt for license.
**/
var util = require('util'),
qs = require('querystring'),
http = require('http'),
path = require('path'),
url = require('url'),
fs = require('fs'),
mime = require('mime'),
session = require('sesh').session,
encode = require('./encode.js').encode;
User = require('./user.js').User;
var server = {};
var db = require('mongojs');
server.http = {};
server.http.loadFile = function(uri, response, func){
	var filename = './public/' + uri;
	fs.exists(filename, function(exists) {
		if(!exists) {
			return;
		}
		fs.readFile(filename, 'binary', function(err, file) {
			if(err) {
				response.writeHead(500, {'Content-Type': 'text/plain'});
				response.end(err + '\n');
			}else{
				func(file);
			}
		});
	});
}
server.http.getBootcode = function(response){
	var filename = './firmware/bootcode.bin';
	fs.exists(filename, function(exists) {
		if(!exists) {
			response.writeHeader(404);
			response.write('404 Not Found\n');
			response.end();
			console.log('[404] Could not find bootcode!');
			return;
		}
		fs.readFile(filename, 'binary', function(err, file) {
			if(err) {
				response.writeHead(500, {
					'Content-Type': 'text/plain'
				});
				response.write(err + '\n');
				response.end();
			}
            var type = mime.lookup(filename);
            response.writeHead(200, {
                'Content-Type': type
            });
            response.write(file, 'binary');
            response.end();
		});
	});
}
server.http.handleURI = function(request, response, uri, realuri, get, post, isJSP, config){
	switch(uri){
		case '/':
			var file = server.http.loadFile('index.html', response, function(file){
				var isLoggedIn = function(){return request.session && request.session.user;};
				if(isLoggedIn()){
					filename = 'loggedin.html';
					loggedinFunc = function(response, content){
						if(isLoggedIn() && request.session.user.username){
							content = content.replace('{USERNAME}', request.session.user.username);
						}
						if(isLoggedIn() && request.session.user.rabbits){
							content = content.replace('{COUNT}', Object.keys(request.session.user.rabbits).length);
						}
						response.writeHead(200, {});
						response.end(content, 'binary');
					};
				}else{
					filename = 'loggedout.html';
				}
				server.http.loadFile(filename, response, function(content){
					file = file.replace('{CONTENT}', content);
					var total = 0;
					db.users.find({ rabbits: { "$gt": {} } }, function(err, doc){
						if(doc){
							total = Object.keys(doc).length;
						}
						file = file.replace('{TOTAL}', total);
						if(typeof loggedinFunc !== 'undefined'){
							loggedinFunc(response, file);
						}else{
							response.writeHead(200, {});
							response.end(file, 'binary');
						}
					});
				});
			});
		break;
		/* TODO: Handle resources better */
		/* Maybe put a regex to detect valid file names? */
		case '/css/reset.css':
		case '/css/text.css':
		case '/css/site.css':
		case '/js/N1.min.js':
		case '/js/site.js':
		case '/nabaztag.png':
			var file = server.http.loadFile(uri, response, function(file){
				if(!file) {
					response.writeHeader(404, {});
					response.write('/* 404 Not Found */\n');
					console.log('[404] ' + uri);
					response.end();
				}
				var type = mime.lookup('./public/'+uri)
				response.writeHead(200, {'Content-type': type});
				response.end(file, 'binary');
			});
		break;
		case '/vl':
		case '/api':
			response.writeHead(200, {});
			response.end('Huh?');
		break;
		case '/rabbit':
			if(get && get.sn){
				sn = get.sn;
				var file = server.http.loadFile('index.html', response, function(file){
				var isLoggedIn = function(){return request.session && request.session.user;};
				response.writeHead(200, {});
				if(isLoggedIn()){
					loggedinFunc = function(response, content){
						content = content.replace(/({SN})/ig, sn);
						response.writeHead(200, {});
						response.end(content, 'binary');
					};
					server.http.loadFile('rabbit.html', response, function(content){
						file = file.replace('{CONTENT}', content);
						var total = 0;
						db.users.find({ rabbits: { "$gt": {} } }, function(err, doc){
							if(doc){
								total = Object.keys(doc).length;
							}
							file = file.replace('{TOTAL}', total);
							if(typeof loggedinFunc !== 'undefined'){
								loggedinFunc(response, file);
							}else{
								response.writeHead(200, {});
								response.end(file, 'binary');
							}
						});
					});
				}else{
					response.end();
				}
			});
			}else{
				response.writeHead(302, {'Location' : '/rabbits'});
				response.end();
			}
		break;
		case '/rabbits':
			var file = server.http.loadFile('index.html', response, function(file){
				var isLoggedIn = function(){return request.session && request.session.user;};
				if(isLoggedIn()){
					server.http.loadFile('rabbits.html', response, function(content){
						file = file.replace('{CONTENT}', content);
						var total = 0;
						db.users.find({ rabbits: { "$gt": {} } }, function(err, doc){
							if(doc){
								total = Object.keys(doc).length;
							}
							file = file.replace('{TOTAL}', total);
							if(typeof loggedinFunc !== 'undefined'){
								loggedinFunc(response, file);
							}else{
								response.writeHead(200, {});
								response.end(file, 'binary');
							}
						});
					});
					loggedinFunc = function(response, content){
						if(isLoggedIn() && request.session.user.rabbits){
							session_rabbits = request.session.user.rabbits;
							var out = '', o = session_rabbits;
							for (var p in o) {
								out += '<li><a href="/rabbit?sn=' + o[p]['sn'] + ' "> ' + o[p]['name'] + '</a> - ' + o[p]['sn'] + '</li>';
							}
							content = content.replace('{RABBITS}', out);
						}
						response.writeHead(200, {});
						response.end(content, 'binary');
					};
				}else{
					response.writeHead(200, {});
					response.end('You are not logged in!');
				}
			});
		break;
		case '/addBunny':
			var result = {};
			response.writeHead(200, {});
			if(!request.session || !request.session.user){
				response.end('Your not logged in!');
				return;
			}
			if(!post){
				response.end('No values sent!');
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
			request.session.user.rabbits = rabbits = {0: result};
			db.users.findOne({username: request.session.user.username}, function(err, doc){
				if(doc){
					doc.rabbits = rabbits;					db.users.update({username: request.session.user.username}, doc, true);
				}
			});
			response.end('Updated!');
		break;
		case '/api/ambient':
			response.writeHead(200, {});
			if(post){
				var result = {};
				if(!request.session || !request.session.user){
					response.end('Your not logged in!');
					return;
				}
				if(request.session && request.session.user && request.session.user.rabbits[0] && post.sn && request.session.user.rabbits[0].sn !== post.sn){
					response.end('This is not your rabbit!');
					return;
				}
				if(post.type){
					type = post.type;
				}else{
					type = 0;
				}
				if(post.color){
					color = post.color;
				}else{
					color = Math.floor((Math.random()*18)+1);
				}
				if(post.sn){
					sn = post.sn;
				}else{
					sn = '01234abcd';
				}
				result.color = color;
				result.action = 'ambient';
				result.type = type;
				result.sn = sn;
				db.actions.save(result);
			}
			response.end('Changed!');
		break;
		case '/api/ears':
			response.writeHead(200, {});
			if(post){
				var result = {};
				if(!request.session || !request.session.user){
					response.end('Your not logged in!');
					return;
				}
				if(request.session && request.session.user && request.session.user.rabbits[0] && post.sn && request.session.user.rabbits[0].sn !== post.sn){
					response.end('This is not your rabbit!');
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
			response.end('Changed!');
		break;
		case '/api/clear':
			var result = {};
			response.writeHead(200, {});
			if(!request.session || !request.session.user){
				response.end('Your not logged in!');
				return;
			}
			if(request.session && request.session.user && request.session.user.rabbits[0] && post.sn && request.session.user.rabbits[0].sn !== post.sn){
				response.end('This is not your rabbit!');
				return;
			}
			if(get && post.sn){
				sn = post.sn;
			}else{
				sn = '01234abcd';
			}
			result.action = 'clear';
			result.sn = sn;
			db.actions.save(result);
			response.end('Cleared!');
		break;
		case '/login':
			response.writeHead(200, {});
			if(post && post.username && post.password){
				User.login(post.username, post.password, function(answer){
					if(answer){
						request.session.user = answer;
						response.writeHead(302, {
							'Location': '/'
						});
						response.end();
					}else{
						response.end('Wrong username or password.');
					}
				});
			}else{
				response.end('Please fill out all fields.\n');
			}
		break;
		case '/logout':
			if(request.session && request.session.user){
				delete request.session.user;
				response.writeHead(302, {
					'Location': '/'
				});
			}else{
				response.writeHead(500, {});
			}
			response.end();
		break;
		case '/register':
			response.writeHead(200, {'Content-Type': 'text/plain'});
			if(post && post.username && post.password && post.email){
				User.register(post.username, post.password, post.email, function(answer){
					if(answer){
						request.session.user = answer;
						response.writeHead(302, {
							'Location': '/'
						});
						response.end();
					}else{
						response.end('User already exists!');
					}
				});
			}else{
				response.end('Please fill out all fields.\n');
			}
		break;
		default: 
			/* 
				If it ends with .jsp, use handleJSP, else show 404.
			*/
			// TODO: Use regex
			isJSP && console.log('[JSP] ' + uri);
			if(realuri && server.http.handleJSP(realuri, get, post, response, config)){
			}else{
				console.log('[404] ' + uri);
				response.writeHead(404, {'Content-Type': 'text/plain'});
				response.end('404 Not Found\n');
				return;
			}
		break;
	}
	!isJSP && console.log('[URI] ' + uri);
}
server.http.handleJSP = function(uri, get, post, response, config){
	switch(uri){
		case 'bc':
			server.http.getBootcode(response);
		break;
		case 'record':
			fs.writeFile("./media/"+get.sn+"-audio.wav", post[0], function(err) {
				if(err){
					throw err;
				}else{
					console.log("The file was saved!");
				}
			}); 
			response.writeHead(200, {});
			response.end();
		break;
		case 'p4':
			// [ 127, 3, 0, 0, 1, 10, 4, 0, 0, 6, 0, 0, 0, 0, 1, 8, 255, 10 ]
			// Get from database
			db.actions.findOne({sn: get.sn}, function(err, doc){
				var ambient = [], isAmbient = 0;
				// Handle ping
				console.log('[PINGED]');
				var data = [0x7f];
				// encode ping interval block
				data.push(0x03, 0x00, 0x00, 0x01, 10);
				if(!err){
					// build up an ambient block
					if(doc && doc.action && doc.action == 'ambient' && doc.color){
						type = parseInt(doc.type, 10);
						encode.set_ambient(ambient, type, parseInt(doc.color, 10));
						isAmbient = 1;
					}
					if(doc && doc.action && doc.action == 'ears' && doc.left && doc.right){
						encode.left_ear(ambient, doc.left);
						encode.right_ear(ambient, doc.right);
						isAmbient = 1;
					}
					// Dont blink if cleared
					if(doc && doc.action && doc.action == 'clear'){
						encode.clear_ambient(ambient, 1);
						isAmbient = 1;
					}
					if(isAmbient){
						data.push(4);
						encode.length(data, ambient.length + 4);
						data.push(0, 0, 0, 0);
						[].forEach.call(ambient, function(e, i){
							data.push(e);
						});
					}
				}
				// encode end of data
				data.push(0xff, 0x0a);
				encoded = encode.array(data);
				response.writeHead(200, {});
				response.write(encoded, 'binary');
				response.end();
			});
			db.actions.remove({sn: get.sn});
		break;
		case 'locate':
			response.writeHead(200, {});
			response.write('ping '+config.server.host+':'+config.server.port+' \r\n');
			response.write('broad '+config.server.host+':'+config.server.port+' \r\n');
			response.end();
		break;
		default:
			return false;
		break;
	}
	return true;
}
server.http.start = function(config){
	http.createServer(function(request, response) {
		session(request, response, function(request, response){
			var parsed = url.parse(request.url, true);
			var uri = parsed.pathname;
			var get = parsed.query;
			//console.log(request.url);
			var isJSP = uri.match('.jsp') ? !!uri.match('.jsp')[0] : false;					var realuri = isJSP ? uri.replace('.jsp', '').replace('/vl/', '') : '';
			var get;
			// HandleURI, if its post, wait for post data to end
			if (request.method == 'POST') {
				var body = '';
				request.on('data', function (data) {
					body += data;
				});
				request.on('end', function () {
					post = qs.parse(body);
					server.http.handleURI(request, response, uri, realuri, get, post, isJSP, config);
				});
 	   		}else{
				server.http.handleURI(request, response, uri, realuri, get, false, isJSP, config);
 	   		}
		});
	}).listen(config.server.port, config.server.host);
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
		}
	}
	// Connect to db
	db = db.connect(config.db.database, ['rabbits', 'users', 'actions']);
	console.log('nodetag started on ' + config.server.host + ':' + config.server.port);
	User = new User(db, encode);
	server.http.start(config);
}
exports.server = server;