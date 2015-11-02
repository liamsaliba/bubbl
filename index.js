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

	// if user has a username and is in the chat room.
	var userJoined = false;
	var firstJoin = true;
	var awayTime = 300000

	// emit chat message with username and message to other clients
	socket.on('chat message', function(data){
		if(typeof socket.username !== "undefined"){
			clearTimeout(socket.inactiveTimeout);
			socket.inactiveTimeout = setTimeout(function(){leave(socket.id);}, awayTime);
			socket.broadcast.emit('chat message', {
				username: socket.username,
				colour: socket.colour,
				message: data,
				time: socket.lastActive
			});
		}
	});

	socket.on('join', function(){
		clearTimeout(socket.inactiveTimeout);
		socket.inactiveTimeout = setTimeout(function(){leave(socket.id);}, awayTime);

		socket.username = genUser(); //store username in socket session for client
		socket.colour = 280;
		socket.lastActive = new Date();

		usernames[socket.id] = {username: socket.username, colour: socket.colour, timeJoined: socket.lastActive, active: socket.active}; // store username in temporary db
		print("+ " + socket.id + " : " + usernames[socket.id].username + " : h" + usernames[socket.id].colour);
		
		++users_active;

		userJoined = true;

		socket.broadcast.emit('join', {
			username: socket.username,
			numUsers: users_active
		});
	
		io.to(socket.id).emit("setname", {
			username: socket.username,
			numUsers: users_active,
			success: true
		});
		if(userJoined)
			io.to(socket.id).emit("change available");
	});

	socket.on('leave', function(){
		leave(socket.id);
	});

	socket.on('rejoin', function(){
		clearTimeout(socket.inactiveTimeout);
		if (Math.floor((new Date() - usernames[socket.id].timeJoined) / 60000) > 0 || firstJoin) {
			socket.prevUsername = socket.username;
			socket.username = genUser();
			socket.lastActive = new Date();

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
		socket.inactiveTimeout = setTimeout(function(){leave(socket.id);}, awayTime);
	});
	
	socket.on('change colour', function(colour) {
		socket.colour = colour;
		usernames[socket.id].colour = colour;
		print("h " + socket.id + " : " + usernames[socket.id].username + " : h" + usernames[socket.id].colour);
	});

	socket.on('typing', function(msg){
		//socket.broadcast.emit('back', socket.username); //TODO
	});

	socket.on('typing stop', function(){

	});

	function leave(id){
		if(userJoined){
			print("- " + id);
			delete usernames[id]

			--users_active;

			socket.broadcast.emit('leave', {
				username: socket.username,
				numUsers: users_active
			});

			io.to(socket.id).emit("inactive");
		}
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
    var possible = " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var name = [];
    for(var i = 0; i <= 6; i++){
		var ch = possible.charAt(Math.random() * possible.length);
		if(ch !== " ")
    		name.push(ch);
    }
	return name.join('');
}