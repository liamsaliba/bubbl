var socket = io.connect("http://bubbl.chat/");
socket.emit('join');

var typing = false; //TODO

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

// bubbl logo
var bubbl = "<object data=\"/assets/i/bubbl.svg\" type=\"image/svg+xml\" height=\"10px\" style=\"padding-left: 2px;\"></object>";

var colours = {}; // these are defined in the colour section.

// Talking TO server

if(getCookie("hue") !== "")
	change_color(getCookie("hue"));
else
	change_color(280);

// send leave receipt to server
window.onbeforeunload = function() {
	if(active)
		socket.emit('leave');
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

// Chat box parsing
$('#sendbtn').click(function(){
	if(typeof window.orientation !== "undefined")
		parseChatBox();
	else {
		$("#m").emojiPicker('toggle');
	}
});

// button does nothing
$('#input').submit(function(){
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
			msg('n d', "successfully changed your hue to " + m.substring(3));
		} // !c
		else if (m.charAt(1) === "c" && m.substring(3) !== ""){
			switch (m.substring(3)){
				case 'purple':
				case 'reset':
				case 'default':
					change_color(280);
					//msg('n d', "successfully changed your colour to purple");
					break;
				case 'red':
					change_color(0);
					//msg('n d', "successfully changed your colour to red");
					break;
				case 'orange':
					change_color(25);
					//msg('n d', "successfully changed your colour to orange");
					break;
				case 'gold':
					change_color(45);
					//msg('n d', "successfully changed your colour to gold");
					break;
				case 'yellow':
					change_color(60);
					//msg('n d', "successfully changed your colour to yellow");
					break;
				case 'lime':
					change_color(80);
					//msg('n d', "successfully changed your colour to lime");
					break;
				case 'green':
					change_color(100);
					//msg('n d', "successfully changed your colour to green");
					break;
				case 'turquoise':
					change_color(150);
					//msg('n d', "successfully changed your colour to turquoise");
					break;
				case 'aqua': 
					change_color(175);
					//msg('n d', "successfully changed your colour to aqua");
					break;
				case 'sky':
					change_color(200);
					//msg('n d', "successfully changed your colour to sky");
					break;
				case 'blue':
					change_color(240);
					//msg('n d', "successfully changed your colour to blue");
					break;
				case 'magenta':
					change_color(310);
					//msg('n d', "successfully changed your colour to magenta");
					break;
				case 'pink':
					change_color(330);
					//msg('n d', "successfully changed your colour to pink");
					break;
				default:
					msg('error', "invalid colour. try a number or colour name.");
						break;
			}
			$("#hue-slider").slider("value", user_hue);
		}
		else
			msg('error', "invalid command. use \\ to escape ! commands.");
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

socket.on('join', function(data){
	msg('n j', data.username + " joined " + bubbl);
	$('#online-count').html(data.numUsers + " active");
});

socket.on('leave', function(data){
	msg('n l', data.username + " left " + bubbl);
	$('#online-count').html(data.numUsers + " active");
});

socket.on('error', function(data){
	msg('error', data);
	//$("#messages").scrollTop($("#messages")[0].scrollHeight); // scroll to bottom on error
});

socket.on('fr', function(){
	location.reload(true);
});

socket.on('setname', function(data){
	if(data.success){
		$("#messages").empty();
		if(username === "")
			msg('n d', "you, " + data.username + ", joined " + bubbl);
		else
			msg('n d', "you are now " + data.username);

		username = data.username;
		$('#float-username').animate({right: 0}, "slow");
		setTimeout("$('#float-username').html(username);", 400);
		document.title = 'bubbl. ' + username;
		$('#float-username').animate({right: '130px'}, "slow");;
		$('#online-count').html(data.numUsers + " active");
	}
	else {
		msg('error', "you need to wait a minute to change your username")
	}
});

// Disconnect error boxes
socket.on('disconnect', function(){
	if(active){
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

$("#inactive > .rejoin").click(function(){
	socket = io.connect("http://bubbl.chat/");
	$("#modal").fadeOut();
	$("#disconnect, #inactive").animate({bottom: "-150px"}, "fast");
	$(".rejoin").animate({left: "-100px"}, "fast");
	socket.emit("join");
	change_color(user_hue);
	active = true;
});

$("#disconnect > .rejoin").click(function(){
	location.reload(true);
})

// when username change is available, change bg colour
socket.on("change available", function(){
	$("#float-username").css({"background-color": colours.fifty, "color": idealTextColor(colours.fifty)}); //40
	setTimeout("$('#change-tip').animate({right: 140}, 800);", 500);
	$('#change-tip').fadeIn();
})


// message into client
function msg(id, m){
	if (id === 'error'){
		$('#notifications').append($('<div class="error">').text(m));
		$('.error:last').animate({bottom: 50}, 400);
		$('#messages').animate({bottom: 80}, 400);

		setTimeout("$('.error:not(:last)').remove();", 400)
		clearTimeout(error_timeout)
		error_timeout = setTimeout(function() {
			$('.error:last').animate({bottom: 0}, 400);
			$('#messages').animate({bottom: 50}, 400);
		}, 3000);
	}
	else {
		var offset = $("#messages")[0].scrollHeight;
		$('#messages').append($('<li>').append($('<div class="' + id + '">').html(m)));

		if(isEnabled(id)) //disable
			$('#messages div:last').fadeIn(300);
		
		scroll(offset);
	}
}
// replies
function msgm(m, user, hue){
	var offset = $("#messages")[0].scrollHeight;

	if (~m.indexOf("@"+username)){
		$('#messages').append($('<li>').append($('<div class="u">').html(user + '<span class="invisible"> </span>')).append($('<div class="i">').html(twemoji.parse(m))).append($('<div class="time">').html(getTime())));
		if(prev_msg_username === user)
			$(".i:last, .u:last").addClass("same");
		$('.i:last').css("background-color", colours.seventyf).css("color", idealTextColor(colours.eighty)).fadeIn(300);
	}
	else {
		$('#messages').append($('<li>').append($('<div class="u">').html(user + '<span class="invisible"> </span>')).append($('<div class="m">').html(twemoji.parse(m))).append($('<div class="time">').html(getTime())));
		if(prev_msg_username === user)
			$(".m:last, .u:last").addClass("same");
		$('.m:last').css("background-color", "hsl(" + hue + ", 100%, 90%").css("color", idealTextColor("hsl(" + hue + ", 100%, 95%)")).fadeIn(300);
	}

	$('.u:last').fadeIn(300);
	prev_msg_username = user;
	scroll(offset);

	$(".u:last").click(function() {
		$("#m").val($("#m").val() + '@' +$(this).text());
		$("#input #m").focus();
	});

	$(".m:last").click(function() {
		$(this).parent().find('.time').fadeToggle(300);
	});

	notifications++;
	if(!document.hasFocus())
		Tinycon.setBubble(notifications);
}

$(window).on('focus', function() {
	notifications = 0;
	Tinycon.setBubble();
});

// message to server
function send_msg(m){
	fixm = fix(m.trim());
	if (is_legal(fixm) === 0) {
		socket.emit('chat message', m);
		d = new Date();
		$('#messages').append($('<li>').append($('<div class="u user">').html(username + '<span class="invisible"> </span>')).append($('<div class="o">').html(twemoji.parse(fixm))).append($('<div class="time">').html(getTime())));
		if(prev_msg_username === username)
			$(".u:last, .o:last").addClass("same");
		$('.o:last').css("background-color", colours.fifty).css("color", idealTextColor(colours.fifty)).fadeIn(300);
		$('.u:last').fadeIn(300);

		prev_msg_username = username;
		prev_msg = fixm;

		$(".u:last").click(function() {
			$("#m").val($("#m").val()+"@" + $(this).text());
			$("#input #m").focus();
		});

		$(".o:last").click(function() {
			$(this).parent().find('.time').fadeToggle(300);
		});
	}
	else if (is_legal(fixm) === 1)
		msg('error', "you need to type something to say something");
	else if (is_legal(fixm) === 2)
		msg('error', "you already said that");
	else if (is_legal(fixm) === 3)
		msg('error', "you're sending messages too fast")
	else
		msg('error', "you sent illegal text")

	prev_msg_time = new Date();
}

// TODO: spam protection in this.
// CLIENT SIDED spam protection, only for client messages
// If you break this, please responsibly report it to me.
function is_legal(m){
	if (m === "") // if nothing entered
		return 1;
	else if (m === prev_msg)
		return 2;
	else if (new Date() - prev_msg_time < 1000) // make sure this matches server
		return 3;
	else
		return 0;
}

function fix(string) {
	var entityMap = {"&": "&amp;","<": "&lt;",">": "&gt;",'"': '&quot;',"'": '&#39;',"/": '&#x2F;'};

	var str = String(string).replace(/[&<>"'\/]/g, function (s) {
		returerrorntityMap[s];
	});
	str = str.replace(/\n\s*\n/g, '\n');
	str = str.replace(/(?:\r\n|\r|\n)/g, '<br/>');
	// rich text
	return str;
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
	}
});

// Autoscroll
function scroll(offset){
	if($(window).height()-50 < $("#messages")[0].scrollHeight) { // if scrolled to bottom
		if(offset - $("#messages").scrollTop() == $("#messages").outerHeight())
			$("#messages").scrollTop($("#messages")[0].scrollHeight);
		else {
			$("#newmsg").animate({bottom: "60px"}, "fast"); //new message indicator
		}
	}
}

// click on indicator = scroll bottom
$("#newmsg").click(function(){
	$("#messages").scrollTop($("#messages")[0].scrollHeight);
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