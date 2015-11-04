// function handler : express
var express = require('express');
var app = express();
// http server made from function handler 'app'
var http = require('http').Server(app);
// socket io
var io = require('socket.io')(http);

// Route handler, sends index.html when root address is hit.
app.use(express.static(__dirname + '/public'));

// holds usernames
var usernames = {};
var users_active = 0;

// socket.io: user connection
io.on('connection', function(socket){  // listening socket

	var firstJoin = true;
	var awayTime = 300000;

	// TODO: IP Blocking


	// emit chat message with username and message to other clients
	socket.on('chat message', function(data){
		msg = fix(data.trim());
		if(socket.userJoined) {
			if(is_legal(msg) === 0){
				clearTimeout(socket.inactiveTimeout);
				socket.inactiveTimeout = setTimeout(function(){leave();}, awayTime);
				io.emit('chat message', {
					username: socket.username,
					colour: socket.colour,
					message: fix(data.trim()), //nope... no XSS here
				});
				socket.prevMsg = msg;
				print("m " + socket.id + " : " + socket.request.socket.remoteAddress + " : '" + msg.substring(0, 15) + "'");
			}
			else if(is_legal(msg) === 1) {
				io.to(socket.id).emit('error', "you need to type something to say something");
				print("e " + socket.id + " : " + socket.request.socket.remoteAddress + " : attempted blank message");
			}
			else if(is_legal(msg) === 2) {
				io.to(socket.id).emit('error', "you just said that");
				print("e " + socket.id + " : " + socket.request.socket.remoteAddress + " : attempted repeat message");
			}
			else if(is_legal(msg) === 3) {
				io.to(socket.id).emit('error', "you're talking too fast");
				print("e " + socket.id + " : " + socket.request.socket.remoteAddress + " : attempted fast message");
			}
			else {
				io.to(socket.id).emit('error', "you sent something we couldn't handle");
				print("e " + socket.id + " : " + socket.request.socket.remoteAddress + " : did something unknown");
			}
		}
		socket.prevMsgTime = new Date();
	});

	socket.on('join', function(){
		if(!socket.userJoined){
			clearTimeout(socket.inactiveTimeout);
			socket.inactiveTimeout = setTimeout(function(){leave();}, awayTime);

			socket.username = genUser(); //store username in socket session for client
			socket.colour = 280;
			socket.lastActive = new Date();
			socket.userJoined = true;

			usernames[socket.id] = {username: socket.username, colour: socket.colour, timeJoined: socket.lastActive, active: socket.active}; // store username in temporary db
			print("+ " + socket.id + " : " + socket.request.socket.remoteAddress + " : " + usernames[socket.id].username + " : h" + usernames[socket.id].colour);
			
			++users_active;

			socket.broadcast.emit('join', {
				username: socket.username,
				numUsers: users_active
			});
		
			io.to(socket.id).emit("setname", {
				username: socket.username,
				numUsers: users_active,
				success: true
			});
			if(firstJoin)
				io.to(socket.id).emit("change available");
		}
	});

	socket.on('leave', function(){
		leave();
	});

	socket.on('rejoin', function(){
		clearTimeout(socket.inactiveTimeout);
		if ((Math.floor((new Date() - usernames[socket.id].timeJoined) / 60000) > 0 || firstJoin) && socket.userJoined) {
			socket.prevUsername = socket.username;
			socket.username = genUser();
			socket.lastActive = new Date();
			socket.userJoined = true;

			firstJoin = false;

			usernames[socket.id].username = socket.username;
			usernames[socket.id].timeJoined = socket.lastActive;

			socket.broadcast.emit('leave', {
				username: socket.prevUsername,
				numUsers: users_active
			});
			socket.broadcast.emit('join', {
				username: socket.username,
				numUsers: users_active
			});

			io.to(socket.id).emit("setname", {
				username: socket.username,
				numUsers: users_active,
				success: true
			});
			print("* " + socket.id + " : " + socket.prevUsername + " -> " + usernames[socket.id].username);

			//msg to client when change username is available
			setTimeout(function(){
				io.to(socket.id).emit("change available");
				print("c " + socket.id)
			}, 60000);
		}
		else {
			print("* " + socket.id + " : " + usernames[socket.id].username + " : FAIL t" + Math.floor((new Date() - usernames[socket.id].timeJoined) / 60000));
			io.to(socket.id).emit("setname", {
				username: socket.username,
				numUsers: users_active,
				success: false
			});
		}
		socket.inactiveTimeout = setTimeout(function(){leave();}, awayTime);
	});
	
	socket.on('change colour', function(colour) {
		if(socket.userJoined){
			socket.colour = colour;
			usernames[socket.id].colour = colour;
		}
	});

	socket.on('typing', function(msg){
		//socket.broadcast.emit('back', socket.username); //TODO
	});

	socket.on('typing stop', function(){

	});

	function leave(){
		if(socket.userJoined){
			clearTimeout(socket.inactiveTimeout);

			print("- " + socket.id + " : " + socket.request.socket.remoteAddress);
			delete usernames[socket.id]

			--users_active;
			firstJoin = false;
			socket.userJoined = false;

			socket.broadcast.emit('leave', {
				username: socket.username,
				numUsers: users_active
			});

			io.to(socket.id).emit("inactive");
			socket.disconnect();
		}
	}

	function is_legal(m){
		if (m === "")
			return 1;
		else if (m === socket.prevMsg && (new Date() - socket.prevMsgTime < 4000))
			return 2;
		else if (new Date() - socket.prevMsgTime < 1000)
			return 3;
		else
			return 0;
	}
});

// HTTP server, listen for activity on port 3000
http.listen(8080, function(){
	print("Server initialised.")
	print("Listening on *:8080")
});

function print(str){
	var d = new Date();
	console.log(d.toISOString() + ' | ' + str);
}

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