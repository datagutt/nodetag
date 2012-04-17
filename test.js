  var http = require('http'), 
          session = require('sesh').session;

      // let's create a basic http server!
      http.createServer(function (request, response) {

        // before we process any part of the request, let's use the session middle-ware!
        session(request, response, function(request, response){

          // now we can access request.session

          // after the session middleware has executed, let's finish processing the request
          response.writeHead(200, {'Content-Type': 'text/plain'});
          response.write('request.session: \n' + JSON.stringify(request.session, 2, true));
          response.end();

        });

      }).listen(8080);

      /* server started */  
      console.log('> hello world running on port 8080');