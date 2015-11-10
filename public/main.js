var socket = io.connect("http://bubbl.chat/");
socket.emit('join');

var typing = false;
var users_typing = [];

// set username
var user_hue = 280;
var username = "";
var prev_msg_username; // used for '.same'
var prev_msg = "."; // to be used for spam protection
var prev_msg_time;
var room; //TODO
var active = true;
var notifications = 0; //for favicon
var error_timeout; // for error animation
var clear_timeout;
var typing_offset = 0; // when typing, for animation (error())
var error_offset = 0;
var newmsg_offset = 0;
// bubbl logo
var bubbl = "<object data=\"/assets/i/bubbl.svg\" type=\"image/svg+xml\" height=\"10px\" style=\"padding-left: 2px;\"></object>";

var colours = {}; // these are defined in the colour section.

// Talking TO server

// get colour from cookie
if(getCookie("hue") !== "")
	change_color(getCookie("hue"));
else
	change_color(280);

// send leave receipt to server # only for cleanliness
window.onbeforeunload = function() {
	if(active) {
		active = false;
		socket.emit('leave');
		socket.disconnect();
	}
}

// on document load
$(document).ready(function(){
	 if(typeof window.orientation === "undefined"){ //detect desktop only
	 	$("#sendbtn").text("☺");
	 	$('#m').attr("placeholder", "type a message here and press enter")
	 	$('#m').emojiPicker({
			width: '260px',
			height: '250px',
			button: false,
			position: 'top'
		});
	 }
});

// favicon notifications reset on window focus
$(window).on('focus', function() {
	notifications = 0;
	Tinycon.setBubble();
});

$(window).on('blur', function() {
	socket.emit('typing stop');
})

// tips
setTimeout("$('#change-tip').animate({right: 140}, 800);", 500);
setTimeout("$('#menu-tip').animate({right: 40}, 800);", 500);
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

// set new username when click on username box
$('#float-username').click(function(){
	socket.emit("rejoin");
	$('#change-tip').fadeOut();
	$("#float-username").css("background-color", colours.forty); //40
});

// expanding text area, shift-enter
$("#m").keydown(function(e){
    // Enter was pressed without shift key
    if (e.keyCode == 13 && !e.shiftKey) {
        // prevent default behavior
        e.preventDefault();
        parseChatBox();
    }
    if(e.keyCode == 13 && e.shiftKey && $(this).val().split("\n").length >= 12) { 
        return false;
    }
});

$('#m').keyup(function(e){
	if($('#m').val() === "" && typing){
		typing = false;
	    socket.emit('typing stop');
	}
	else if($('#m').val() !== "" && !typing){
		typing = true;
	    socket.emit('typing');
	}
});

// Chat box parsing / emoji picker on button press
$('#sendbtn').click(function(){
	if(typeof window.orientation !== "undefined")
		parseChatBox();
	else {
		$("#m").emojiPicker('toggle');
	}
});

// button does nothing
$('#input').submit(function(){
	socket.emit('typing stop');
	return false;
});

function parseChatBox(){
	// remove white space, make html safe.
	var m = $('#m').val()//.trim();

	// ! commands
	if (m.charAt(0) === "!"){
		prev_msg_username = false;

		if(m === "!clear")
			$("#messages").empty();
		// !h
		else if ((m.charAt(1) === "h" && m.substring(2) === " ") && !isNaN(m.substring(3))){
			change_color(m.substring(3));
			info("successfully changed your hue to " + m.substring(3));
		} // !c
		else if (m.charAt(1) === "c" && m.substring(3) !== ""){
			switch (m.substring(3)){
				case 'purple':
				case 'reset':
				case 'default':
					change_color(280);
					//info("successfully changed your colour to purple");
					break;
				case 'red':
					change_color(0);
					//info("successfully changed your colour to red");
					break;
				case 'orange':
					change_color(25);
					//info("successfully changed your colour to orange");
					break;
				case 'gold':
					change_color(45);
					//info("successfully changed your colour to gold");
					break;
				case 'yellow':
					change_color(60);
					//info("successfully changed your colour to yellow");
					break;
				case 'lime':
					change_color(80);
					//info("successfully changed your colour to lime");
					break;
				case 'green':
					change_color(100);
					//info("successfully changed your colour to green");
					break;
				case 'turquoise':
					change_color(150);
					//info("successfully changed your colour to turquoise");
					break;
				case 'aqua': 
					change_color(175);
					//info("successfully changed your colour to aqua");
					break;
				case 'sky':
					change_color(200);
					//info("successfully changed your colour to sky");
					break;
				case 'blue':
					change_color(240);
					//info("successfully changed your colour to blue");
					break;
				case 'magenta':
					change_color(310);
					//info("successfully changed your colour to magenta");
					break;
				case 'pink':
					change_color(330);
					//info("successfully changed your colour to pink");
					break;
				default:
					error("invalid colour. try a number or colour name.");
						break;
			}
			$("#hue-slider").slider("value", user_hue);
		}
		else
			error("invalid command. use \\ to escape ! commands.");
	} 
	// escape \
	else if (m.charAt(0) === "\\") 
		socket.emit('chat message', m.substring(1));  //TODO make more verification?
	else
		socket.emit('chat message', m);
	
	// scroll to bottom
	$("#messages").stop().animate({scrollTop: $("#messages")[0].scrollHeight }, "fast");
	$("#newmsg").animate({bottom: "0px"}, "fast");
	newmsg_offset = 0;
	updateAnimation();

	// reset box
	$('#m').val('');
	$("#m").focus();
};



// Socket recieve responses
socket.on('chat message', function(data){
	msg(data.message, data.username, data.colour);
});

socket.on('join', function(data){
	//msg('n j', data.username + " joined " + bubbl);  //TODO, add join / leave users under bubbl logo
	$('#online-count').html(data.numUsers + " active");
	joinBadge(data.username);
});

socket.on('leave', function(data){
	//msg('n l', data.username + " left " + bubbl);
	$('#online-count').html(data.numUsers + " active");
	typing_change(false, data.username)
	leaveBadge(data.username);
});

socket.on('error', function(data){
	error(data);
});

socket.on('typing', function(user){
	typing_change(true, user);
});

socket.on('typing stop', function(user){
	typing_change(false, user);
});

socket.on('fr', function(){
	location.reload(true);
});

socket.on('setname', function(data){
	if(data.success){
		$("#messages").empty();
		if(username === "")
			info("you joined " + bubbl);
		else
			info("you are now " + data.username);
		username = data.username;
		$('#float-username').animate({right: 0}, "slow");
		setTimeout("$('#float-username').html(username);", 400);
		document.title = 'bubbl. ' + username;
		$('#float-username').animate({right: '130px'}, "slow");;
		$('#online-count').html(data.numUsers + " active");
	}
	else {
		error("you need to wait a minute to change your username")
	}
});

// Disconnect error boxes
socket.on('disconnect', function(){
	if(active){
		active = false;
		$("#inactive").animate({bottom: "-150px"}, "fast");
		$(".rejoin").animate({left: "-100px"}, "fast");
		$("#modal").fadeIn();
		$("#disconnect").animate({bottom: "50px"}, "fast");
		socket.on('connect', function(){
			$(".rejoin").animate({left: "15px"}, "fast");
		});
	}
});

// away error box
socket.on("inactive", function(){
	active = false;
	$("#modal").fadeIn();
	$("#inactive").animate({bottom: "50px"}, "fast");
	$(".rejoin").animate({left: "15px"}, "fast");

})

// see patch 0.1.025 for old animation code
$(".rejoin").click(function(){
	location.reload(true); //
});

// when username change is available, change bg colour
socket.on("change available", function(){
	$("#float-username").css({"background-color": colours.fifty, "color": idealTextColor(colours.fifty)}); //40
	setTimeout("$('#change-tip').animate({right: 140}, 800);", 500);
	$('#change-tip').fadeIn();
})

// red error messages on screen bottom
function error(m){
	$('#notifications').append($('<div class="error">').text(m));
	clearTimeout(error_timeout);
	clearTimeout(clear_timeout);

	error_offset = 30;
	$('#messages').stop().animate({bottom: 50 + error_offset + typing_offset, scrollTop: $("#messages")[0].scrollHeight}, 200);
	$('#users').animate({bottom: 50 + error_offset + typing_offset + newmsg_offset}, 200);
	$('.error:last').animate({bottom: 50 + typing_offset}, 200);

	clear_timeout = setTimeout("$('.error:not(:last)').remove();", 200)
	error_timeout = setTimeout(function() {
		error_offset = 0;
		$('.error:last').animate({bottom: 0}, 200);
		updateAnimation();
	}, 3000);
}

function typing_change(state, user){
	var typing_str;
	if(state){
		users_typing.push(user);
	}
	if(!state){
		users_typing.splice(users_typing.indexOf(user));
	}
	if(users_typing.length === 0){
	}
	else if(users_typing.length === 1)
		typing_str = users_typing[0];
	else if(users_typing.length === 2)
		typing_str = users_typing[0] + " and " + users_typing[1];
	else {
		typing_str = users_typing[0];
		for(i=1; i < users_typing.length - 1; i++){
			typing_str +=  ", " + users_typing[i]
		}
		typing_str += " and " + users_typing[users_typing.length - 1];
	}
	
	$('#typing-users').text(typing_str);

	if(users_typing.length === 0){
		typing_offset = 0;
		$('#typing').animate({bottom: 0}, 200);
		updateAnimation();
	}
	else{
		typing_offset = 25;
		$('#typing').animate({bottom: 50}, 200);
		if(!($(window).height()-50 < $("#messages")[0].scrollHeight))
			$('#messages').animate({bottom: 50 + typing_offset + error_offset}, 200);
		$('#users').stop().animate({bottom: 50 + typing_offset + error_offset + newmsg_offset/2}, 200);
	}
}

function updateAnimation(){
	$('#messages').animate({bottom: 50 + typing_offset + error_offset}, 200);
	   $('#users').animate({bottom: 50 + typing_offset + error_offset + newmsg_offset}, 200);
}

// black info messages
function info(m){
	$('#messages').append($('<li>').append($('<div class="info">').html(m).fadeIn(300)));
}

// replies
function msg(m, user, hue){
	var offset = $("#messages")[0].scrollHeight;
	var u = 'u'
	var id = 'm';
	var colour = "hsl(" + hue + ", 100%, 90%)";
	if (user === username){
		u = 'u user';
		id = 'o';
		colour = colours.fifty;
	}
	else if (~m.indexOf("@"+username)){
		id = 'i';
		colour = colours.seventyf;
	}

	$('#messages').append($('<li>').append($('<div class="' + u + '">').html(user).click(function() {
		$("#m").val($("#m").val() + '@' + $(this).text() + " ");
		$("#input #m").focus(); // username append to input
	}).fadeIn(300)).append($('<div class="' + id + '">').html(twemoji.parse(m)).css("background-color", colour).css("color", idealTextColor(colour)).fadeIn(300)).append($('<div class="time">').html(getTime())));
	/* append li -> append username -> click on username add to input -> fade username on entrance -> append message -> parse emoji -> set background & text colour -> fade message on entrance -> append time */

	// blank username when multiple messages from same person
	if(prev_msg_username === user)
		$("." + id + ":last, .u:last").addClass("same");

	// time on click
	$("." + id + ":last").click(function() {
		$(this).parent().find('.time').fadeToggle(300);
	});

	prev_msg_username = user;
	scroll(offset);

	if(user !== username && !document.hasFocus()){
		notifications++;
		Tinycon.setBubble(notifications);
	}
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

// hide new messages when scroll to bottom
$("#messages").scroll(function(){
	if($("#messages")[0].scrollHeight - $("#messages").scrollTop() - $("#messages").outerHeight() < 1){
		$("#newmsg").animate({bottom: "0px"}, "fast");
		newmsg_offset = 0;
		updateAnimation();
	}
});

// Autoscroll
function scroll(offset){
	if($(window).height()-50 < $("#messages")[0].scrollHeight) { // if scrolled to bottom
		if(offset - $("#messages").scrollTop() == $("#messages").outerHeight())
			$("#messages").animate({scrollTop: $("#messages")[0].scrollHeight }, "slow");
		else {
			$("#newmsg").animate({bottom: 60}, "fast"); //new message indicator
			newmsg_offset = 50;
			updateAnimation();
		}
	}
}

// click on indicator = scroll bottom
$("#newmsg").click(function(){
	$("#messages").animate({scrollTop: $("#messages")[0].scrollHeight }, "slow");
});

// manage colour
function change_color(hue){

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
	$("#float-panel").css({"background-color": colours.fortyf, "color": idealTextColor(colours.fifty)}); //45
	$("#float-username").css({"background-color": colours.forty, "color": idealTextColor(colours.fifty)}); //40
	$("#input").css({"background-color": colours.twenty, "color": idealTextColor(colours.twenty)}); //20

	// Text colour
	$("#float-panel > h2, #users li, .version").css("color", idealTextColor(colours.fifty));

	// Logo colour
	if($("#float-logo").css("color") === "rgb(245, 245, 245)")
		$("#logo").attr('src', "/assets/i/bubbl.png")
	else
		$("#logo").attr('src', "/assets/i/bubbl_b.png")

	$('meta[name=theme-color]').remove();
    $('head').append('<meta name="theme-color" content="' + color2color(colours.fifty, "hex") + '">' );

	socket.emit('change colour', user_hue);
	document.cookie=("hue=" + user_hue);
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

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}

// Hue Slider
$(function() {
    $("#hue-slider").slider({
      orientation: "horizontal",
      range: "min",
      max: 360,
      value: 280,
      slide: refreshSwatch,
      change: refreshSwatch
    });
    $("#hue-slider").slider( "value", user_hue );
	$(".ui-slider-handle").css( "background", colours.fifty);
});

function refreshSwatch() {
	change_color($("#hue-slider").slider("value"));
	$(".ui-slider-handle").css( "background", colours.fifty);
}

function getTime() {
	d = new Date();
	if (d.getMinutes() < 10) 
    	return d.getHours() + ":0" + d.getMinutes();
    else
    	return d.getHours() + ":" + d.getMinutes();
}

function joinBadge(username) {
	$('#user-list').prepend($('<li class="online">').html("+ " + username).animate({right: 140}, 'fast'));

	setTimeout(
		function(){
			$('.online:contains("' + username + '")').animate({
				right: '-150px'
			}, 	{
				duration: 400,
				complete: function() {
					$(this).remove();
				}
			});
		}, 5000);
}

function leaveBadge(username) {
	$('#user-list').prepend($('<li class="offline">').html("&minus; " + username).animate({right: 140}, 'fast'));

	setTimeout(
		function(){
			$('.offline:contains("' + username + '")').animate({
				right: '-150px'
			}, 	{
				duration: 400,
				complete: function() {
					$(this).remove();
				}
			});
		}, 5000);
}