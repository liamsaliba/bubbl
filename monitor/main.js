var socket = io.connect("localhost:3000");

var usernames = {};

setInterval(function() {
	$('#time-current').text(new Date().toLocaleTimeString());
}, 1000);

socket.on('log', function(data){
	usernames = data.usernames;
	$('#users-current').text(Object.keys(usernames).length + " active");
	console.log(usernames)
	console.log(data.user)
	if(data.id === 'msg'){
	}
});

socket.on('update', function(names) {
	usernames = names;
	$('#users-current').text(Object.keys(usernames).length + " active");
});