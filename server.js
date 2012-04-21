/**
	© 2012 nodetag, see LICENSE.txt for license.
**/
var util = require('util'),
http = require('http'),
path = require('path'),
url = require('url'),
fs = require('fs'),
mime = require('mime'),
session = require('sesh').session,
encode = require('./encode.js').encode;
var server = {};
var db = require('mongojs');
server.http = {};
server.http.loadFile = function(uri, response){
	var filename = './public/' + uri;
	fs.exists(filename, function(exists) {
		if(!exists) {
			response.writeHeader(404, {'Content-Type': 'text/plain'});
			response.write('404 Not Found\n');
			console.log('[404] ' + uri);
			response.end();
			return;
		}
		fs.readFile(filename, 'binary', function(err, file) {
			if(err) {
				response.writeHead(500, {'Content-Type': 'text/plain'});
				response.end(err + '\n');
 				return;
			}
			response.writeHead(200, {});
			response.end(file, 'binary');
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
server.http.handleURI = function(response, uri, realuri, get, post, isJSP){
	switch(uri){
		case '/':
			server.http.loadFile('index.html', response);
		break;
		case '/css/site.css':
			server.http.loadFile('/css/site.css', response);
		break;
		case '/js/N1.min.js':
			server.http.loadFile('/js/N1.min.js', response);
		break;
		case '/js/site.js':
			server.http.loadFile('/js/site.js', response);
		break;
		case '/vl':
		case '/api':
			response.writeHead(200, {});
			response.end('Huh?');
		return;
		case '/api/ambient':
			if(get){
				var result = {};
				if(get.color){
					color = get.color;
				}else{
					color = Math.floor((Math.random()*18)+1);
				}
				if(get.sn){
					sn = get.sn;
				}else{
					sn = '01234abcd';
				}
				result.color = color;
				result.action = 'ambient';
				result.sn = sn;
				db.actions.save(result);
			}
			response.writeHead(200, {});
			response.end('Changed!');
		break;
		case '/api/clear':
			var result = {};
			if(get && get.sn){
				sn = get.sn;
			}else{
				sn = '01234abcd';
			}
			result.action = 'clear';
			result.sn = sn;
			db.actions.save(result);
			response.writeHead(200, {});
			response.end('Cleared!');
		break;
		case 'login':
		break;
		case 'register':
		break;
		default: 
			/* 
				If it ends with .jsp, use handleJSP, else show 404.
			*/
			// TODO: Use regex
			isJSP && console.log('[JSP] ' + uri);
			if(realuri && server.http.handleJSP(realuri, get, post, response)){
			}else{
				console.log('[404] ' + uri);
				response.writeHead(404, {'Content-Type': 'text/plain'});
				response.end('404 Not Found\n');
			}
		break;
	}
	!isJSP && console.log('[URI] ' + uri);
}
server.http.handleJSP = function(uri, get, post, response){
	switch(uri){
		case 'bc':
			server.http.getBootcode(response);
		break;
		case 'record':
			fs.writeFile("./media/"+get.sn+"-audio.wav", post, function(err) {
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
						encode.set_ambient(ambient, 1, parseInt(doc.color, 10));
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
			console.log(request.url);
			var isJSP = uri.match('.jsp') ? !!uri.match('.jsp')[0] : false;					var realuri = isJSP ? uri.replace('.jsp', '').replace('/vl/', '') : '';
			var get;
			// HandleURI, if its post, wait for post data to end
			if (request.method == 'POST') {
				var body = '';
				request.on('data', function (data) {
					body += data;
				});
				request.on('end', function () {
					post = body;
					server.http.handleURI(response, uri, realuri, get, post, isJSP);
				});
 	   		}else{
				server.http.handleURI(response, uri, realuri, get, false, isJSP);
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
	server.http.start(config);
}
exports.server = server;