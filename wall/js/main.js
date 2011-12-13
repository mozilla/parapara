var API_DIR = "../api/";
var CHARACTERS_DIR = "../characters/";
var CHARACTER_WIDTH = 296;
var CHARACTER_HEIGHT = 345;

var Main = {

	init: function() {
		var canvas = document.getElementById("main-canvas");
		new Processing(canvas, Main.start);  
   	},
	
	start: function(processing) {
		Main.processing = processing;
		Main.processing.draw = Main.idle;
		Main.processing.size(1024, 768);
		Main.processing.frameRate(60);
        Main.processing.noStroke();
		Main.onResize();
		$(window).resize(Main.onResize);

		Main.background = processing.loadImage("images/stars.jpg");
		Main.background_angle = 0;
		
		Main.planet = processing.loadImage("images/planet.png");
		Main.planet_angle = 0;

		Main.loadAllCharactersBeforeRestart(function() {
			Main.processing.draw = Main.draw;
		});
	},

	idle: function() {
	},

	draw: function() {
		var processing = Main.processing;
        processing.background(0, 0);
        processing.noStroke();

		Main.drawBackground(processing);
		Main.processing.resetMatrix();
		Main.drawPlanet(processing);
		
		
		Main.drawCharacters(processing);
	},
	
	drawBackground: function(processing) {
		processing.translate(processing.width/2, processing.height);
		Main.background_angle += 0.02;
		var radian = Main.background_angle * processing.PI/180
		processing.rotate(radian);
		processing.image(Main.background, -Main.background.width/2, -Main.background.height/2);
	},
	
	drawPlanet: function(processing) {
		processing.translate(processing.width/2, processing.height);
		Main.planet_angle += 0.1;
		var radian = Main.planet_angle * processing.PI/180
		processing.rotate(radian);
		processing.image(Main.planet, -Main.planet.width/2, -Main.planet.height/2);
	},
	
	drawCharacters: function(processing) {
		for (var i = 0, n = Main.characters.length; i < n; i++) {
			var character = Main.characters[i];
			character.angle += 1;
			character.updateTransform();
		}
	},
	
	onResize: function() {
		var win = $(window);
		//Main.processing.size(win.width(), win.height());
		$("#main-canvas").css({"top":"0px", "left":"0px", "width":win.width()+"px", "height": win.height()+"px"});
	},
	
	loadAllCharactersBeforeRestart: function(callback) {
		var url = API_DIR+"get_all_characters_before_restart.php?type="+TYPE+"&"+(new Date()).getTime();
		$.getJSON(url, function(json) {
			Main.characters = [];
			var container = $("#characters-canvas");
//			for (var i = 0, n = json.length; i < n; i++) {
			for (var i = 0, n = 3; i < n; i++) {
				var characterOfJson = json[i];
				var character = new Character();
				character.setup(characterOfJson);
				character.angle = i*50;
				Main.characters.push(character);
				container.append(character.ui);
			}
			callback();
		});
	}
}

function Character() {
}

Character.prototype = {
	setup: function(json) {
		this.angle = 0;
		this.x = json.appearance_x;
		this.y = json.appearance_y;
		this.ui = $(document.createElement("img"));
		this.ui.attr("src", "../characters/smiley.svg");
		this.ui.addClass("character");
	},
	updateTransform: function() {
		var style = "rotate("+this.angle+"deg) translate(-"+(this.ui.width()/2)+"px, -"+(this.y+this.ui.height())+"px)";
		StyleController.transform(this.ui, style);
	},
}

var StyleController = {
	transform: function(target, value) {
		StyleController.apply(target, "transform", value);
	},
	duration: function(target, value) {
		StyleController.apply(target, "transition-duration", value);
	},
	origin: function(target, value) {
		StyleController.apply(target, "transform-origin", value);
	},
	apply: function(target, property, value) {
		target.css("-moz-"+property, value);
		target.css("-webkit-"+property, value);
		target.css("-o-"+property, value);
		target.css("-ms-"+property, value);
	}
}

$(document).ready(function(){
	Main.init();
});
