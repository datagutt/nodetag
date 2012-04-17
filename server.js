/**
	© 2012 nodetag, see LICENSE.txt for license.
**/
var util = require("util"),
http = require("http"),
path = require("path"),
url = require("url"),
fs = require("fs"),
mime = require("mime"),
session = require('sesh').session;
var server = {}, config = {};
// default config
config = {
	server: {
		host: "192.168.0.10",
		port: 8080
	}
}
server.http = {};
server.http.loadFile = function(uri, response){
	var filename = "./public/" + uri;
	fs.exists(filename, function(exists) {
		if(!exists) {
			response.writeHeader(404, {"Content-Type": "text/plain"});
			response.write("404 Not Found\n");
			console.log("[404] " + uri);
			response.end();
			return;
		}
		fs.readFile(filename, "binary", function(err, file) {
			if(err) {
				response.writeHead(500, {"Content-Type": "text/plain"});
				response.end(err + "\n");
 				return;
			}
			response.writeHead(200, {});
			response.end(file, "binary");
		});
	});
}
server.http.getBootcode = function(response){
	var filename = "./firmware/bootcode.bin";
	fs.exists(filename, function(exists) {
		if(!exists) {
			response.writeHeader(404);
			response.write("404 Not Found\n");
			response.end();
			console.log("[404] Could not find bootcode!");
			return;
		}
		fs.readFile(filename, "binary", function(err, file) {
			if(err) {
				response.writeHead(500, {
					"Content-Type": "text/plain"
				});
				response.write(err + "\n");
				response.end();
			}
            var type = mime.lookup(filename);
            response.writeHead(200, {
                "Content-Type": type
            });
            response.write(file, "binary");
            response.end();
		});
	});
}
server.http.handleJSP = function(uri, post, request, response){
	post && console.log(post);
	switch(uri){
		case "bc":
			server.http.getBootcode(response);
		break;
		case "p4":
			// Not sure if this works
			console.log(post);
			var a = new Buffer(8), b;
			a[0] = 0x7f;
			a[1] = 0x03;
			a[2] = 0x00;
			a[3] = 0x00;
			a[5] = 0x01;
			a[6] = 0x10;
			a[7] = 0xff;
			a[8] = 0x0a;
			b = new Buffer(a.toString());
			response.writeHead(200, {});
			response.write(b, "binary");
			response.end();
		break;
		case "locate":
			response.end("ping "+config.server.host+" \r\nbroad "+config.server.host+" \r\n");
		break;
		default:
			return false;
		break;
	}
	return true;
}
server.http.start = function(){
	http.createServer(function(request, response) {
		session(request, response, function(request, response){
			var uri = url.parse(request.url).pathname;
			console.log(request.url);
			var isJSP = uri.match(".jsp") ? !!uri.match(".jsp")[0] : false;
			var post;
			if (request.method == 'POST') {
				var body = '';
				request.on('data', function (data) {
					body += data;
				});
				request.on('end', function () {
					post = qs.parse(body);
				});
 	   		}
			switch(uri){
				case "/":
					server.http.loadFile("index.html", response);
				return;
				case "/vl":
					response.writeHead(200, {});
					response.end();
				return;
				default: 
					/* 
						If it ends with .jsp, do more processing. 
						If it doesnt, return 404.
					*/
					// TODO: Use regex
					var realuri = isJSP ? uri.replace(".jsp", "").replace("/", "") : "";
					isJSP && console.log("[JSP] " + uri);
					if(realuri && server.http.handleJSP(realuri, post, request, response)){
					}else{
						console.log("[404] " + uri);
						response.writeHeader(404, {"Content-Type": "text/plain"});
						response.end("404 Not Found\n");
					}
				break;
			}
			!isJSP && console.log("[URI] " + uri);
		});
	}).listen(config.server.port, config.server.host);
}
server.start = function(){
	server.http.start();
}
console.log("nodetag started on " + config.server.host + ":" + config.server.port)
exports.server = server;