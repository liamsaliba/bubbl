var socket = io();
socket.emit('join');

var typing = false; //TODO

// set username
var user_hue = 280;
var username;
var prev_msg_username; // used for '.same'
var prev_msg = "."; // to be used for spam protection

// bubbl logo
var bubbl = "<object data=\"/assets/i/bubbl.svg\" type=\"image/svg+xml\" height=\"10px\" style=\"padding-left: 2px;\"></object>";

var colours = {}; // these are defined in the colour section.

// Talking TO server
msg('n d', "you joined " + bubbl);

change_color(280); // maybe use a cookie to change colour?

// send leave receipt to server
window.onbeforeunload = function() { 
	socket.emit('leave');
} 

// TODO
$(window).blur(function(){
	socket.emit('away');
});
$(window).focus(function(){
  	socket.emit('back');
});

$('#change-tip').animate({right: 140}, 800);
$('#menu-tip').animate({right: 40}, 800);
setTimeout("$('#change-tip').animate({right: -140}, 800);", 10000);
setTimeout("$('#menu-tip').animate({right: -140}, 800);", 10000);

// logo click menu
$('#logo').click(function(){
	$('#logo').animate({height: '30px'}, "fast");
	 $('#menu-tip').animate({opacity: 0}, 800);
	if($('#float-panel').css('display') === 'none'){
		$('#float-panel').stop(true, true).fadeIn({ duration: 400, queue: false }).css('display', 'none').slideDown(400);
	} else
    	$('#float-panel').stop(true, true).fadeOut({ duration: 400, queue: false }).slideUp(400);
    $('#logo').animate({height: '35px'}, "fast");
});


// on document load
$(document).ready(function(){
	 if(typeof window.orientation === "undefined"){
	 	$("#sendbtn").text("☺");
	 	$('#m').attr("placeholder", "type a message here and press enter or shift-enter for a new line")
	 	$('#m').emojiPicker({
			width: '260px',
			height: '250px',
			button: false,
			position: 'top'
		});
	 }
});

// set new username when click on username box
$('#float-username').click(function(){
	$('#float-username').animate({right: 0}, "slow");
	$('#change-tip').animate({opacity: 0}, "fast");
	$('#users li:contains(' + username + ')').remove();
	socket.emit("leave");
	socket.emit("join");
});

// expanding text area, shift-enter
$("#m").keydown(function(e){
    // Enter was pressed without shift key
    if (e.keyCode == 13 && !e.shiftKey) {
        // prevent default behavior
        e.preventDefault();
        parseChatBox();
    }
});

// Chat box parsing
$('#sendbtn').click(function(){
	if(typeof window.orientation !== "undefined")
		parseChatBox();
	else {
		$("#m").emojiPicker('toggle');
	}
});

$('#input').submit(function(){
		return false;
});

function parseChatBox(){
	// remove white space, make html safe.
	var m = fix($('#m').val().trim());

	// ! commands
	if (m.charAt(0) === "!"){
		prev_msg_username = false;

		if(m === "!clear")
			$("#messages").empty();
		// !h
		else if ((m.charAt(1) === "h" && m.substring(2) === " ") && !isNaN(m.substring(3))){
			change_color(m.substring(3));
			msg('n d', "successfully changed your hue to " + m.substring(3));
		} // !c
		else if (m.charAt(1) === "c" && m.substring(3) !== ""){
			switch (m.substring(3)){
				case 'purple':
				case 'reset':
				case 'default':
					change_color(280);
					msg('n d', "successfully changed your colour to purple");
					break;
				case 'red':
					change_color(0);
					msg('n d', "successfully changed your colour to red");
					break;
				case 'orange':
					change_color(25);
					msg('n d', "successfully changed your colour to orange");
					break;
				case 'gold':
					change_color(45);
					msg('n d', "successfully changed your colour to gold");
					break;
				case 'yellow':
					change_color(60);
					msg('n d', "successfully changed your colour to yellow");
					break;
				case 'lime':
					change_color(80);
					msg('n d', "successfully changed your colour to lime");
					break;
				case 'green':
					change_color(100);
					msg('n d', "successfully changed your colour to green");
					break;
				case 'turquoise':
					change_color(150);
					msg('n d', "successfully changed your colour to turquoise");
					break;
				case 'aqua': 
					change_color(175);
					msg('n d', "successfully changed your colour to aqua");
					break;
				case 'sky':
					change_color(200);
					msg('n d', "successfully changed your colour to sky");
					break;
				case 'blue':
					change_color(240);
					msg('n d', "successfully changed your colour to blue");
					break;
				case 'magenta':
					change_color(310);
					msg('n d', "successfully changed your colour to magenta");
					break;
				case 'pink':
					change_color(330);
					msg('n d', "successfully changed your colour to pink");
					break;
				default:
					msg('n e', "invalid colour. try a number or colour name.");
						break;
			}
			
		}
		else if (m.substring(1,3) === "fr"){
			socket.emit('fr');
		}
		else
			msg('n e', "invalid command. use \\ to escape ! commands.");
	} 
	// escape \
	else if (m.charAt(0) === "\\") 
		send_msg(m.substring(1));
	else
		send_msg(m);
	
	// scroll to bottom
	$("#messages").scrollTop($("#messages")[0].scrollHeight);
	$("#newmsg").animate({bottom: "0px"}, "fast");

	// reset box
	$('#m').val('');
	$("#m").focus();
};



// Socket recieve responses
socket.on('chat message', function(data){
	msgm(data.message, data.username, data.colour);
});

socket.on('update names', function(data){
	$('#users').empty();
	$('#users').append($('<li class="user">').html(username + "  <span class=\"online\">&#9679;</span>"));
	$("#users li:last").click(function() {
		$("#m").val($("#m").val()+ "@" + username + " ");
		$("#input #m").focus();
	});
	for(var key in data.usernames){
		if(data.usernames[key].username !== username){
			if(data.usernames[key].status === "online")
				$('#users').append($('<li>').html(data.usernames[key].username + "  <span class=\"online\">&#9679;</span>"));
			else if(data.usernames[key].status === "away")
				$('#users').append($('<li>').html(data.usernames[key].username + "  <span class=\"away\">&#9679;</span>"));
			$("#users li:last").click(function() {
				$("#m").val($("#m").val()+ "@" + $(this).text().substring(0, $(this).text().length - 2));
				$("#input #m").focus();
			});
		}
	}
	$('#online-count').html(data.numUsers + " online");
});

socket.on('join', function(data){
	msg('n j', data.username + " joined " + bubbl);
	$('#users').append($('<li>').html(data.username + "  <span class=\"online\">&#9679;</span>"));
	$('#online-count').html(data.numUsers + " online");
	$("#users li:last").click(function() {
		$("#m").val($("#m").val()+ "@" + $(this).text().substring(0, $(this).text().length - 2));
		$("#input #m").focus();
	});
});

socket.on('leave', function(data){
	msg('n l', data.username + " left " + bubbl);
	$('#users li:contains(' + data.username + ')').remove();
	$('#online-count').html(data.numUsers + " online");
});

socket.on('fr', function(){
	location.reload(true);
});

socket.on('setname', function(m){
	username = m;
	setTimeout("$('#float-username').html(username);", 400);
	document.title = 'bubbl. ' + username;
	$('#float-username').animate({right: '130px'}, "slow");;
});

// message into client
function msg(id, m){	  			
	var offset = $("#messages")[0].scrollHeight;
	$('#messages').append($('<li>').append($('<div class="' + id + '">').html(m)));

	if(isEnabled(id)) //disable
		$('#messages div:last').fadeIn(300);

	if(id !== "n e")
		scroll(offset);

	prev_msg_username = false;
}
// replies
function msgm(m, user, hue){
	var offset = $("#messages")[0].scrollHeight;
	if (~m.indexOf("@"+username)){
		$('#messages').append($('<li>').append($('<div class="u">').html(user + '<span class="invisible"> </span>')).append($('<div class="i">').html(m)));
		if(prev_msg_username === user)
			$(".i:last, .u:last").addClass("same");
		$('.i:last').css("background-color", colours.eighty).css("color", idealTextColor(colours.eighty)).fadeIn(300);
	}
	else {
		$('#messages').append($('<li>').append($('<div class="u">').html(user + '<span class="invisible"> </span>')).append($('<div class="m">').html(m)));
		if(prev_msg_username === user)
			$(".m:last, .u:last").addClass("same");
		$('.m:last').css("background-color", "hsl(" + hue + ", 100%, 95%").css("color", idealTextColor("hsl(" + hue + ", 100%, 95%)")).fadeIn(300);
	}

	$('.u:last').fadeIn(300);

	prev_msg_username = user;

	scroll(offset);
	$(".u:last").click(function() {
		$("#m").val($("#m").val() + '@' +$(this).text());
		$("#input #m").focus();
	});
}

// message to server
function send_msg(m){
	if (is_legal(m) === 0) {
		socket.emit('chat message', m);
		$('#messages').append($('<li>').append($('<div class="u user">').html(username + '<span class="invisible"> </span>')).append($('<div class="o">').html(m)))
		if(prev_msg_username === username)
			$(".u:last, .o:last").addClass("same");
		$('.o:last').css("background-color", colours.fifty).css("color", idealTextColor(colours.fifty)).fadeIn(300);
		$('.u:last').fadeIn(300);
		prev_msg_username = username;
		prev_msg = m;
	}
	else if (is_legal(m) === 1)
		msg('n e', "you need to type something to say something");
	else if (is_legal(m) === 2)
		msg('n e', "you already said that");
	else if (is_legal(m) === 3)
		msg('n e', "you already said that, cheeky.")

	$(".u:last").click(function() {
		$("#m").val($("#m").val()+"@" + $(this).text());
		$("#input #m").focus();
	});	
}

// TODO: spam protection in this.
function is_legal(m){
	if (m === prev_msg) // if nothing entered
		return 2;
	else if (m === "")
		return 1;
	else if (m.split(" ") === prev_msg.split(" ")){
		console.log()
		return 3;
	}
	else
		return 0;
}

// TODO: make this a setting in menu... enables / disables certain messages
function isEnabled(id){
	switch (id) {
		case "n j":
			return false;
		case "n l":
			return false;
		default:
			return true;
	}
}

$("#messages").scroll(function(){
	if($("#messages")[0].scrollHeight - $("#messages").scrollTop() - $("#messages").outerHeight() < 1){
		$("#newmsg").animate({bottom: "0px"}, "fast");
	}
});

// Autoscroll
function scroll(offset){
	if($(window).height()-50 < $("#messages")[0].scrollHeight) { // if scrolled to bottom
		if(offset - $("#messages").scrollTop() == $("#messages").outerHeight())
			$("#messages").scrollTop($("#messages")[0].scrollHeight);
		else {
			$("#newmsg").animate({bottom: "60px"}, "fast");
		}
	}
}

// for fix string
var entityMap = {"&": "&amp;","<": "&lt;",">": "&gt;",'"': '&quot;',"'": '&#39;',"/": '&#x2F;'};

function fix(string) {
	var str = String(string).replace(/[&<>"'\/]/g, function (s) {
		return entityMap[s];
	});
	str = str.replace(/(?:\r\n|\r|\n)/g, '<br />');
	// rich text
	return str;
}

// manage colour
function change_color(hue, silent){

	user_hue = hue;

	colours = {
		ninetyf: "hsl(" + (user_hue) + ", 100%, 90%)",
		eighty: "hsl(" + (user_hue) + ", 100%, 80%)",
		seventyf: "hsl(" + (user_hue) + ", 100%, 75%)",
		seventy: "hsl(" + (user_hue) + ", 100%, 70%)",
		sixty: "hsl(" + (user_hue) + ", 100%, 60%)",
		fifty: "hsl(" + (user_hue) + ", 100%, 50%)",
		fortyf: "hsl(" + (user_hue) + ", 100%, 45%)",
		forty: "hsl(" + (user_hue) + ", 100%, 40%)",
		thirty: "hsl(" + (user_hue) + ", 100%, 30%)",
		twenty: "hsl(" + (user_hue) + ", 100%, 20%)"
	};

	$("#input #m").css({"background-color": colours.ninetyf, "color": idealTextColor(colours.ninetyf)}); //95
	$("#float-logo, #sendbtn").css({"background-color": colours.fifty, "color": idealTextColor(colours.fifty)}); //50
	$("#float-panel").css({"background-color": colours.fortyf, "color": idealTextColor(colours.fortyf)}); //45
	$("#float-username").css({"background-color": colours.fortyf, "color": idealTextColor(colours.forty)}); //40
	$("#input").css({"background-color": colours.twenty, "color": idealTextColor(colours.twenty)}); //20

	// Text colour
	$("#float-panel > h2, #users li, .version").css("color", idealTextColor(colours.fortyf));

	// Logo colour
	if($("#float-logo").css("color") === "rgb(245, 245, 245)")
		$("#logo").attr('src', "/assets/i/bubbl.png")
	else
		$("#logo").attr('src', "/assets/i/bubbl_b.png")

	socket.emit('change colour', user_hue);
}

// text colour functions
function idealTextColor(bgColorhsl) {
	bgColor = color2color(bgColorhsl, "hex");
   	var nThreshold = 105;
   	var components = getRGBComponents(bgColor);
   	var bgDelta = (components.R * 0.299) + (components.G * 0.587) + (components.B * 0.114);

   	return ((255 - bgDelta) < nThreshold) ? "#000000" : "#F5F5F5";   
}

function getRGBComponents(color) {       

    var r = color.substring(1, 3);
    var g = color.substring(3, 5);
    var b = color.substring(5, 7);

    return {
       R: parseInt(r, 16),
       G: parseInt(g, 16),
       B: parseInt(b, 16)
    };
}