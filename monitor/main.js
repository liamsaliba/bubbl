var socket = io.connect("localhost:3000");

var usernames = {};

$('#time-current').text(new Date().toLocaleString());

setInterval(function() {
	$('#time-current').text(new Date().toLocaleString());
}, 1000);

socket.on('connect', function(data){
	$('#connect-current').addClass("online").removeClass('offline').text("connected");
});

socket.on('disconnect', function(data){
	$('#connect-current').addClass("offline").removeClass('online').text("not connected");
})

socket.on('log', function(data){
	usernames = data.usernames;
	usersOnline = data.usersOnline
	$('#users-current').text(usersOnline + " active");

	if(data.id === 'msg')
		display("", data, 0);
	if(data.id === 'error')
		display("error", data, 1);
	if(data.id === 'join') {
		display('online', data, 1);
		display('online', data, 2)
	}
	if(data.id === 'leave') {
		display('offline', data, 1);
		display('offline', data, 2);
	}
});

socket.on('update', function(data) {
	usernames = data.usernames;
	$('#users-current').text(data.online + " active");
	$('#users').empty();
});

function display(type, data, c){
	var col = "#users";
	if (c === 2){
		if(type === 'offline'){
			$('#users > .online > .user').each(function () {
			    if ($(this).text() == usernames[data.user].username) {
			        $(this).parent().addClass("error").removeClass('online').append($('<span class="time">').text(" " + new Date().toLocaleTimeString()));
			        updateTable($(this).parent(), data);
			    }
			});
		}
		else {
			$('#users').append($("<li class='" + type + "'>").append($('<span class="time">').text(data.time + " ")).append($('<span class="user">').text(usernames[data.user].username)).click(function(){
					if(typeof window.getSelection !== "undefined") {
						if(!($(this).find(".info").length))
							createTable(this, data);
						else{
							updateTable(this, data);
							$(this).find(".info").fadeToggle();
						}
					}
				}));
		}
	}
	else {
		if (c === 0)
			col = '#messages';
		else if (c === 1)
			col = '#log-messages';

		var offset = $(col)[0].scrollHeight;

		$(col).append($("<li class='" + type + "'>").append($('<span class="time">').text(data.time + " ")).append($('<span class="user">').text(usernames[data.user].username)).append($('<span class="msg">').text(" > " + data.data)).click(function(){
				if(typeof window.getSelection !== "undefined") {
					if(!($(this).find(".info").length))
						createTable(this, data);
					else{
						$(this).find(".info").fadeToggle();
					}
				}
			}));
	}
	scroll(offset, col);
}

function createTable(pos, data) {
	info = $("<div class='info'>");
	info.append("<tr><td><b>time</b></td><td>" + data.date + "</td></tr>");
	info.append("<tr><td><b>username</b></td><td>" + usernames[data.user].username + "</td></tr>");
	info.append("<tr><td><b>colour</b></td><td>" + usernames[data.user].colour + "</td></tr>");
	info.append("<tr><td><b>timeJoined</b></td><td>" + usernames[data.user].timeJoined + "</td></tr>");
	info.append("<tr><td><b>userJoined</b</td><td>" + usernames[data.user].userJoined + "</td></tr>");
	info.append("<tr><td><b>ip address</b></td><td>" + usernames[data.user].ip + "</td></tr>");
	info.append("<tr><td><b>prevMsg</b></td><td>" + usernames[data.user].prevMsg + "</td></tr>");
	info.append("<tr><td><b>prevMsgTime</b></td><td>" + usernames[data.user].prevMsgTime + "</td></tr>");

	$(pos).append(info);
}

function updateTable(pos, data) {
	info = $(pos).find(".info");
	info.empty();
	info.append("<tr><td><b>time</b></td><td>" + data.date + "</td></tr>");
	info.append("<tr><td><b>username</b></td><td>" + usernames[data.user].username + "</td></tr>");
	info.append("<tr><td><b>colour</b></td><td>" + usernames[data.user].colour + "</td></tr>");
	info.append("<tr><td><b>timeJoined</b></td><td>" + usernames[data.user].timeJoined + "</td></tr>");
	info.append("<tr><td><b>userJoined</b</td><td>" + usernames[data.user].userJoined + "</td></tr>");
	info.append("<tr><td><b>ip address</b></td><td>" + usernames[data.user].ip + "</td></tr>");
	info.append("<tr><td><b>prevMsg</b></td><td>" + usernames[data.user].prevMsg + "</td></tr>");
	info.append("<tr><td><b>prevMsgTime</b></td><td>" + usernames[data.user].prevMsgTime + "</td></tr>");
}

function scroll(offset, col){
	if($(window).height()-50 < $(col)[0].scrollHeight) { // if scrolled to bottom
		if(offset - $(col).scrollTop() == $(col).outerHeight())
			$(col).scrollTop($(col)[0].scrollHeight);
	}
}

// when enter on command box
$("#m").keydown(function(e){
    if (e.keyCode == 13) {
        parseCommand();
    }
});

function parseCommand(){
	var m = $('#m').val().trim();

	if (m === "restart"){
		socket.emit('restart');
	}
	else if (m === "clear"){
		$("#messages, #log-messages, #usersOnline").empty();
	}
	$('#m').val('');
}