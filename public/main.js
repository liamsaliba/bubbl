var socket = io.connect("localhost:8080"); //http://bubbl.chat/ OR localhost:8080
socket.emit('join');

var typing = false;
var users_typing = [];

// set username
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

// get colour from cookie
var user_gamma = getCookie("gamma");
var user_hue = getCookie("hue");
if(user_hue == "")
	user_hue = 280;
if(user_gamma == "")
	user_gamma = 0;

var gammaColour = "hsl(0, 0%, " + (100 - user_gamma) + "%)";


function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split('; ');
    console.log(document.cookie);
    console.log(document.cookie.split("; "));
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}

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
	setTitle();
});

$(window).on('blur', function() {
	socket.emit('typing stop');
})

// tips
setTimeout("$('#change-tip').animate({right: 140}, 800);", 500);
setTimeout("$('#change-tip').animate({right: -140}, 800);", 10000);
$('#float-panel').stop(true, true).animate({top: -10 - ($("#float-panel").height())}, 600);

// logo click menu
$('#logo').click(function(){
	$('#logo').stop(true, true).animate({height: '30px'}, "fast");
	 $('#change-tip').stop(true, true).animate({opacity: 0}, 800);
	if($('#float-panel').css('display') == 'none'){
		$('#float-panel').stop(true, true).css({"display": "inline-block"}).animate({top: 0}, 600);
		$('#float-room').stop(true, true).animate({top: 60 + $("#float-panel").height()}, 600);
	} else {
    	$('#float-panel').stop(true, true).animate({top: -10 - ($("#float-panel").height())}, 600);
    	$('#float-room').stop(true, true).animate({top: 50}, 600);
    	setTimeout('$("#float-panel").css({"display": "none"});', 800);
    }
    $('#logo').animate({height: '35px'}, "fast");
});

// set new username when click on username box
$('#float-username').click(function(){
	socket.emit("rejoin");
	$("#float-username").css("background-color", colours.fortyf); //45
});


// room textbox
$("#room-name").keydown(function(e){
	if (e.keyCode == 13){
		e.preventDefault();
		parseRoomBox();
	}
});

//TODO: auto refill room name textbox upon blur
$("#room-name").on('blur', function(e){
	$("#room-name").val("global")
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

function parseRoomBox(){
	$("#m").focus();
}

function parseChatBox(){
	// remove white space, make html safe.
	var m = $('#m').val()//.trim();

	// ! commands
	if (m.charAt(0) === "!"){
		prev_msg_username = false;

		if(m === "!clear" || m === "!c")
			$("#messages").empty();
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
	//msg('n j', data.username + " joined " + bubbl);
	$('#current-count').html(data.numUsers);
	joinBadge(data.username);
});

socket.on('leave', function(data){
	//msg('n l', data.username + " left " + bubbl);
	$('#current-count').html(data.numUsers);
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
		setTitle();
		$('#float-username').animate({right: '130px'}, "slow");;
		$('#current-count').html(data.numUsers);
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
	$("#float-username").css({"background-color": colours.fifty, "color": idealTextColour(colours.fifty)}); //40
	setTimeout("$('#change-tip').animate({right: 140}, 800);", 500);
	$('#change-tip').fadeIn();
})

// red error messages on screen bottom
function error(m){
	if(m == ""){
		return;
	} 
	$('#notifications').append($('<div class="error">').text(m));

	$('#messages').stop().animate({bottom: 50, scrollTop: $("#messages")[0].scrollHeight}, 200);
	$('#users').animate({bottom: 50}, 200);
	$('.error:last').animate({bottom: 50 + typing_offset}, 200);

	clear_timeout = setTimeout("$('.error:not(:last)').remove();", 200)
	error_timeout = setTimeout(function() {
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
			$('#messages').animate({bottom: 50 + typing_offset}, 200);
		$('#users').stop().animate({bottom: 50 + typing_offset + newmsg_offset/2}, 200);
	}
}

function updateAnimation(){
	$('#messages').animate({bottom: 50 + typing_offset}, 200);
	   $('#users').animate({bottom: 50 + typing_offset + newmsg_offset}, 200);
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
	}).fadeIn(300)).append($('<div class="' + id + '">').html(twemoji.parse(m)).css("background-color", colour).css("color", idealTextColour(colour)).fadeIn(300)).append($('<div class="time">').html(getTime())));
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

	$(".u").css({"color": idealTextColour(gammaColour)});

	if(user !== username && !document.hasFocus()){
		notifications++;
		Tinycon.setBubble(notifications);
		setTitle();
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
	$("#newmsg").animate({bottom: 0}, "slow");
});

function change_gamma(gamma){
	user_gamma = gamma;
	gammaColour = "hsl(0, 0%, " + (100 - user_gamma) + "%)";

	$("html").css({"background-color": gammaColour, "color": idealTextColour(gammaColour)});
	$(".u").css({"color": idealTextColour(gammaColour)});
	$("#top-gradient").css({"background": "-moz-linear-gradient(top, hsla(0, 0%, " + (100 - user_gamma) + ", 1) 0%, hsla(0, 0%, " + (100 - user_gamma) + ", 0) 100%)"})
	$("#top-gradient").css({"background": "-webkit-gradient(left top, left bottom, color-stop(0%, hsla(0, 0%, " + (100 - user_gamma) + ", 1)), color-stop(100%, hsla(0, 0%, " + (100 - user_gamma) + ", 0)))"})
	document.cookie=("gamma=" + user_gamma);
}

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
		fortys: "hsl(" + (user_hue) + ", 100%, 42%)",
		fortyf: "hsl(" + (user_hue) + ", 100%, 45%)",
		forty: "hsl(" + (user_hue) + ", 100%, 40%)",
		thirty: "hsl(" + (user_hue) + ", 100%, 30%)",
		twenty: "hsl(" + (user_hue) + ", 100%, 20%)"
	};

	$("#input #m").css({"background-color": colours.ninetyf, "color": idealTextColour(colours.ninetyf)}); //95
	$("#float-logo, #sendbtn").css({"background-color": colours.fifty, "color": idealTextColour(colours.fifty)}); //50
	$("#float-panel").css({"background-color": colours.fortys, "color": idealTextColour(colours.fifty)}); //45
	$("#float-username").css({"background-color": colours.fortyf, "color": idealTextColour(colours.fifty)}); //40
	$("#float-room").css({"background-color": colours.fortyf, "color": idealTextColour(colours.fifty)}); //40
	$("#input").css({"background-color": colours.forty, "color": idealTextColour(colours.forty)}); //20
	$("#room-name").css({"color": idealTextColour(colours.fifty), "border-color": idealTextColour(colours.fifty)});
	// Text colour
	$("#float-panel > h2, #users li, .version").css("color", idealTextColour(colours.fifty));

	// Logo colour
	if($("#float-logo").css("color") === "rgb(240, 240, 240)")
		$("#logo").attr('src', "/assets/i/bubbl.png")
	else
		$("#logo").attr('src', "/assets/i/bubbl_b.png")

	$('meta[name=theme-color]').remove();
    $('head').append('<meta name="theme-color" content="' + color2color(colours.fifty, "hex") + '">' );

	socket.emit('change colour', user_hue);
	document.cookie=("hue=" + user_hue);
}

// text colour functions : input background colour, returns hex text colour
function idealTextColour(bgColorhsl) {
	bgColor = color2color(bgColorhsl, "hex");
   	var nThreshold = 110;
   	var components = getRGBComponents(bgColor);
   	var bgDelta = (components.R * 0.299) + (components.G * 0.587) + (components.B * 0.114);

   	return ((255 - bgDelta) < nThreshold) ? "#000000" : "#F0F0F0";   
}

// takes hex colour and returns RGB value
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
	$("#hue-slider .ui-slider-handle").css("background", colours.fifty);
});

function refreshSwatch() {
	change_color($("#hue-slider").slider("value"));
}

// darkness slider
$(function(){
	$('#gamma-slider').slider({
		orientation: "horizontal",
		range: "min",
		max: 100,
		value: 0,
		slide: refreshGamma,
		change: refreshGamma
	});
	$("#gamma-slider").slider("value", user_gamma);
	$("#gamma-slider .ui-slider-handle").css("background", gammaColour);
});

function refreshGamma(){
	change_gamma($("#gamma-slider").slider("value"));
}


// time formatted as HH:MM
function getTime() {
	d = new Date();
	if (d.getMinutes() < 10) 
    	return d.getHours() + ":0" + d.getMinutes();
    else
    	return d.getHours() + ":" + d.getMinutes();
}


// join/leave badges show
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

// set document title / tab name
function setTitle(){
	if(notifications > 0)
		document.title = "(" + notifications + ") " + username + '@bubbl.';
	else
		document.title = username + '@bubbl.';
}