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
var users_connected = 0;

// socket.io: user connection
io.on('connection', function(socket){  // listening socket

	// if user has a username and is in the chat room.
	var userJoined = false;

	// emit chat message with username and message to other clients
	socket.on('chat message', function(data){
		socket.broadcast.emit('chat message', {
			username: socket.username,
			colour: socket.colour,
			message: data
		});
	});

	socket.on('join', function(){
		if(typeof usernames[socket.id] !== "")
		socket.username = genUser(); //store username in socket session for client
		socket.colour = 280;
		usernames[socket.id] = {username: socket.username, colour: socket.colour, status: "online"}; // store username in temporary db
		print("+ " + socket.id + " : " + usernames[socket.id].username + " : h" + usernames[socket.id].colour);
		++users_connected;

		userJoined = true;

		io.to(socket.id).emit("setname", socket.username)
		io.to(socket.id).emit("update names", {
			usernames: usernames,
			numUsers: users_connected
		});

		socket.broadcast.emit('join', {
			username: socket.username,
			numUsers: users_connected
		});
	});

	socket.on('leave', function(){
		print("- " + socket.id + " : " + usernames[socket.id].username + " : h" + usernames[socket.id].colour);
		if(userJoined){
			delete usernames[socket.id]

			--users_connected;

			socket.broadcast.emit('leave', {
				username: socket.username,
				numUsers: users_connected
			});
		}
	});

	// force refresh
	socket.on('fr', function(){
		io.emit('fr');
	});

	socket.on('away', function(){
		socket.broadcast.emit('away', socket.username);
	});

	socket.on('back', function(){
		socket.broadcast.emit('back', socket.username);
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
	print("Listening on *:80")
});

function print(str){
	var d = new Date();
	console.log(d.toISOString() + ' | ' + str);
}

// generate username : TODO
function genUser() {
	var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var name = [];
    for(var i = 0; i < (Math.ceil(Math.random()*6) + 4); i++)
    	name.push(possible.charAt(Math.floor(Math.random() * possible.length)));

	return name.join('');
}