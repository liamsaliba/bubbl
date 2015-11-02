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

var onStartup = true;

// socket.io: user connection
io.on('connection', function(socket){  // listening socket

	// if user has a username and is in the chat room.
	var userJoined = false;

	if(onStartup){
		io.emit('fr');
		onStartup = false;
	}

	// emit chat message with username and message to other clients
	socket.on('chat message', function(data){
		socket.lastActive = new Date();
		socket.broadcast.emit('chat message', {
			username: socket.username,
			colour: socket.colour,
			message: data,
			time: socket.lastActive
		});

	});

	socket.on('join', function(){
		socket.username = genUser(); //store username in socket session for client
		socket.colour = 280;
		socket.lastActive = new Date();
		socket.active = true;
		usernames[socket.id] = {username: socket.username, colour: socket.colour, timeJoined: socket.lastActive, active: socket.active}; // store username in temporary db
		print("+ " + socket.id + " : " + usernames[socket.id].username + " : h" + usernames[socket.id].colour);
		++users_active;

		userJoined = true;

		io.to(socket.id).emit("setname", {
			username: socket.username,
			numUsers: users_active,
			success: true
		});

		socket.broadcast.emit('join', {
			username: socket.username,
			numUsers: users_active
		});
	});

	socket.on('leave', function(){
		if(userJoined){
			print("- " + socket.id + " : " + usernames[socket.id].username + " : h" + usernames[socket.id].colour);
			delete usernames[socket.id]

			--users_active;

			socket.broadcast.emit('leave', {
				username: socket.username,
				numUsers: users_active
			});
		}
	});

	socket.on('rejoin', function(){
		print("* " + socket.id + " : " + usernames[socket.id].username + " : t" + Math.floor((new Date() - usernames[socket.id].timeJoined) / 60000));
		if (Math.floor((new Date() - usernames[socket.id].timeJoined) / 60000) > 0) {
			socket.prevUsername = socket.username;
			socket.username = genUser();

			usernames[socket.id].username = socket.username;
			usernames[socket.id].timeJoined = new Date();

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
		}
		else {
			io.to(socket.id).emit("setname", {
				username: socket.username,
				numUsers: users_active,
				success: false
			});
		}
	});

	// force refresh
	socket.on('fr', function(){
		io.emit('fr');
	});

	socket.on('change colour', function(colour) {
		socket.colour = colour;
		usernames[socket.id].colour = colour;
		print("! " + socket.id + " : " + usernames[socket.id].username + " : h" + usernames[socket.id].colour);
	});

	socket.on('typing', function(msg){
		//socket.broadcast.emit('back', socket.username); //TODO
	});

	socket.on('typing stop', function(){

	});
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