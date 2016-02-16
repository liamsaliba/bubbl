// function handler : express
var express = require('express');
var app = express();
// http server made from function handler 'app'
var http = require('http').Server(app);
// socket io
var io = require('socket.io')(http);

var fs = require('fs');
// Route handler, sends index.html when root address is hit.
app.use(express.static(__dirname + '/public'));

// HTTP server, listen for activity on port 3000
http.listen(8080, function(){
	console.log("Public server started, listening on port 8080 (public: 80)");
});

// object storing usernames
var usernames = {};
var usersOnline = 0;
// count of users logged in: Object.keys(usernames).length

// words for username generation
var words;
fs.readFile(__dirname + "/public/assets/words.txt", function(err, data) {
    if(err) throw err;
    words = data.toString().split("\n");
});

// socket.io: user connection
// TODO: rewrite a lot of this so most of the code is outside of io.on
io.on('connection', function(socket){  // listening socket

	var firstJoin = true;

	// TODO: IP Blocking

	// emit chat message with username and message to other clients
	socket.on('chat message', function(data){
		msg = fix(data.trim());
		time = new Date();
		if(usernames[socket.id].userJoined) {
			if(msg === "") { // they didn't type anything, silent error
				io.to(socket.id).emit('error', "");
				log('error', socket.id, "blank");
			}
			else if(msg === usernames[socket.id].prevMsg && (time - usernames[socket.id].prevMsgTime < 3000)) {
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
				log('msg', socket.id, msg);
				usernames[socket.id].prevMsg = msg;
			}
		}
		usernames[socket.id].prevMsgTime = time;
	});

	socket.on('join', function(){
		if(typeof usernames[socket.id] === 'undefined'){

			++usersOnline;

			join();

			if(firstJoin)
				io.to(socket.id).emit("change available");

			log('join', socket.id, 'join');
		}
	});

	socket.on('rejoin', function(){
		clearTimeout(socket.inactiveTimeout);
		if ((Math.floor((new Date() - usernames[socket.id].timeJoined) / 60000) > 0 || firstJoin) && usernames[socket.id].userJoined) {
			
			usernames[socket.id].prevUsername = usernames[socket.id].username;

			socket.broadcast.emit('leave', {
				username: usernames[socket.id].username,
				numUsers: usersOnline
			});

			log('leave', socket.id, 'rejoin');
			join();
			log('join', socket.id, 'rejoin');

			firstJoin = false;
			//msg to client when change username is available
			setTimeout(function(){
				io.to(socket.id).emit("change available");
				log('avchange', socket.id);
			}, 60000);

		}
		else {
			io.to(socket.id).emit("setname", {
				username: usernames[socket.id].username,
				numUsers: usersOnline,
				success: false
			});
		}
		socket.inactiveTimeout = setTimeout(function(){leave('inactive');}, 300000);
	});

	socket.on('leave', function(){
		if(typeof usernames[socket.id] !== "undefined")
			leave('leave');
	});
	
	socket.on('change colour', function(colour) {
		if(usernames[socket.id].userJoined)
			usernames[socket.id].colour = colour;
	});

	socket.on('typing', function(msg){
		//socket.broadcast.emit('back', socket.username); //TODO
		//resetTimeout(true);
		usernames[socket.id].typing = true;
		log('typing', socket.id, 'on');
		socket.broadcast.emit('typing', usernames[socket.id].username);
	});

	socket.on('typing stop', function(){
		usernames[socket.id].typing = false;
		log('typing', socket.id, 'off');
		socket.broadcast.emit('typing stop', usernames[socket.id].username);
	});

	function join(){
		usernames[socket.id] = {
			username: genUser(),
			colour: 280,
			timeJoined: new Date(),
			userJoined: true,
			ip: socket.request.socket.remoteAddress,
			prevMsg: '',
			prevMsgTime: '',
			typing: true
		};
		resetTimeout(true);

		socket.broadcast.emit('join', {
			username: usernames[socket.id].username,
			numUsers: usersOnline
		});
	 
		io.to(socket.id).emit("setname", {
			username: usernames[socket.id].username,
			numUsers: usersOnline,
			success: true
		});
	}

	// probably put these log statements in context.

	function leave(reason){
		if(usernames[socket.id].userJoined){
			--usersOnline;
			log('leave', socket.id, reason);

			resetTimeout(false);

			socket.userJoined = false;

			socket.broadcast.emit('leave', {
				username: usernames[socket.id].username,
				numUsers: usersOnline
			});

			if(reason === 'inactive') {
				io.to(socket.id).emit("inactive");
				socket.disconnect();
			}
		}
	}

	function resetTimeout(set) {
		clearTimeout(socket.inactiveTimeout);
		if(set)
			socket.inactiveTimeout = setTimeout(function(){leave('inactive');}, 3000000);
	}
});

// generate username : TODO
function genUser() {
	var text = "";
	var word = words[Math.floor(Math.random()*words.length)].trim();
	var name = [];
	for(var i = 0; i <= 7-word.length; i++){
		name.push(Math.floor(Math.random() * 10));
	}
	return word + name.join('');

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
	socket.emit('update', {
		usernames: usernames,
		online: usersOnline
	});

	socket.on('restart', function(){

	})
});

function log(id, user, data){
	mio.sockets.emit('log', {
		id: id,
		user: user,
		data: data,
		date: new Date(),
		time: new Date().toLocaleTimeString(),
		usernames: usernames,
		usersOnline: usersOnline
	});
}