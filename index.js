// function handler : express
var express = require('express');
var app = express();
// http server made from function handler 'app'
var http = require('http').Server(app);
// socket io
var io = require('socket.io')(http);

// Route handler, sends index.html when root address is hit.
app.use(express.static(__dirname + '/public'));

// HTTP server, listen for activity on port 3000
http.listen(8080, function(){
	console.log("Public server started, listening on port 8080 (public: 80)");
});

// holds usernames
var usernames = {};
// count of users logged in: Object.keys(usernames).length

// socket.io: user connection
// TODO: rewrite a lot of this so most of the code is outside of io.on
io.on('connection', function(socket){  // listening socket

	var firstJoin = true;
	//usernames[socket.id] = {};

	// TODO: IP Blocking

	// emit chat message with username and message to other clients
	socket.on('chat message', function(data){
		msg = fix(data.trim());
		time = new Date();
		if(usernames[socket.id].userJoined) {
			if(msg === "") {
				io.to(socket.id).emit('error', "you need to type something to say something");
				log('error', socket.id, "blank");
			}
			else if(msg === usernames[socket.id].prevMsg && (time - usernames[socket.id].prevMsgTime < 4000)) {
				io.to(socket.id).emit('error', "you just said that");
				log('error', socket.id, "repeat");
			}
			else if(time - usernames[socket.id].prevMsgTime < 1000) {
				io.to(socket.id).emit('error', "you're talking too fast");
				log('error', socket.id, "fast");
			}
			else {
				resetTimeout(true);
				io.emit('chat message', {
					username: usernames[socket.id].username,
					colour: usernames[socket.id].colour,
					message: msg //nope... no XSS here
				});
				usernames[socket.id].prevMsg = msg;
				log('msg', socket.id, msg);
			}
		}
		usernames[socket.id].prevMsgTime = time;
	});

	socket.on('join', function(){
		if(typeof usernames[socket.id] === 'undefined'){
			join();

			if(firstJoin)
				io.to(socket.id).emit("change available");

			log('join', socket.id);
		}
	});

	socket.on('rejoin', function(){
		clearTimeout(usernames[socket.id].inactiveTimeout);
		if ((Math.floor((new Date() - usernames[socket.id].timeJoined) / 60000) > 0 || firstJoin) && usernames[socket.id].userJoined) {
			
			socket.broadcast.emit('leave', {
				username: usernames[socket.id].prevUsername,
				numUsers: Object.keys(usernames).length
			});

			join();

			firstJoin = false;
			//msg to client when change username is available
			setTimeout(function(){
				io.to(socket.id).emit("change available");
				log('avchange', socket.id);
			}, 60000);

			log('rejoin', socket.id);
		}
		else {
			io.to(socket.id).emit("setname", {
				username: usernames[socket.id].username,
				numUsers: Object.keys(usernames).length,
				success: false
			});
		}
		usernames[socket.id].inactiveTimeout = setTimeout(function(){leave();}, 500000);
	});

	socket.on('leave', function(){
		leave();
	});
	
	socket.on('change colour', function(colour) {
		if(usernames[socket.id].userJoined)
			usernames[socket.id].colour = colour;
	});

	socket.on('typing', function(msg){
		//socket.broadcast.emit('back', socket.username); //TODO
		resetTimeout(true);
	});

	socket.on('typing stop', function(){

	});

	function join(){
		usernames[socket.id] = {
			username: genUser(),
			colour: 280,
			timeJoined: new Date(),
			userJoined: true,
			ip: socket.request.socket.remoteAddress
		};
		resetTimeout(true);

		socket.broadcast.emit('join', {
			username: usernames[socket.id].username,
			numUsers: Object.keys(usernames).length
		});
	
		io.to(socket.id).emit("setname", {
			username: usernames[socket.id].username,
			numUsers: Object.keys(usernames).length,
			success: true
		});
	}

	// probably put these log statements in context.

	function leave(){
		if(usernames[socket.id].userJoined){
			log('leave', socket.id);

			resetTimeout(false);

			delete usernames[socket.id];

			socket.userJoined = false;

			socket.broadcast.emit('leave', {
				username: socket.username,
				numUsers: Object.keys(usernames).length
			});

			io.to(socket.id).emit("inactive");
			socket.disconnect();
		}
	}

	function resetTimeout(set) {
		clearTimeout(usernames[socket.id].inactiveTimeout);
		if(set)
			usernames[socket.id].inactiveTimeout = setTimeout(function(){leave();}, 500000);
	}
});

// generate username : TODO
function genUser() {
	var text = "";
	var possible = "     abcdefghijklmnopqrstuvwxyz0123456789";
	var name = [];
	for(var i = 0; i <= 6; i++){
		var ch = possible.charAt(Math.random() * possible.length);
		if(ch !== " ")
			name.push(ch);
	}
	return name.join('');
}

// message legitimacy functions
function fix(string) {
	var entityMap = {"&": "&amp;","<": "&lt;",">": "&gt;",'"': '&quot;',"'": '&#39;',"/": '&#x2F;'};

	var str = String(string).replace(/[&<>"'\/]/g, function (s) {
		return entityMap[s];
	});

	str = str.replace(/\n\s*\n/g, '\n');
	// TODO: \n detection: add '...'
	str = str.replace(/(?:\r\n|\r|\n)/g, '<br />');
	// rich text
	return str;
}


//////// MONITORING /////////
var mapp = express();
var mhttp = require('http').Server(mapp);
var mio = require('socket.io')(mhttp);

mapp.use(express.static(__dirname + '/monitor'));

mhttp.listen(3000, function(){
	console.log("Monitoring server started, listening on port 3000");
});


mio.on('connection', function(socket){
	setInterval(function() {
		socket.volatile.emit(usernames);
	}, 1000);
});

function log(id, user, data){
	mio.sockets.emit(id, {
		user: user,
		data: data,
		time: new Date()
	});
}