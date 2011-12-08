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
		
		Main.initScenes();
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
	},
	
	drawBackground: function(processing) {
		processing.translate(processing.width/2, processing.height);
		Main.background_angle += 0.02;
		var radian = Main.background_angle * processing.PI/180
		processing.rotate(radian);
		processing.image(Main.background, -Main.background.width/2, -Main.background.height/2);
	},
	
	drawPlanet: function(processing) {
		processing.translate(processing.width/2, processing.height+Main.planet.height/4);
		Main.planet_angle += 0.1;
		var radian = Main.planet_angle * processing.PI/180
		processing.rotate(radian);
		processing.image(Main.planet, -Main.planet.width/2, -Main.planet.height/2);
	},
	
	drawCharacters: function(processing) {
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
			for (var i = 0, n = json.length; i < n; i++) {
				var characterOfJson = json[i];
				var character = new Character();
				character.setup(Main.processing, characterOfJson);
				Main.characters.push(character);
			}
			Main.start_time = (new Date()).getTime();
			Main.current_x = 0;
			callback();
		});
	},
	
	initScenes: function() {
		Main.scenes = [];
		Main.current_scene_index = 0;
	}	
}

function Character() {
}

Character.prototype = {
	setup: function(processing, json) {
	}
}

function Scene() {
}

Scene.prototype = {
	setupLayer1: function(processing, imagename) {
		this.layer1 = processing.loadImage(imagename);
	},
	setupLayer2: function(processing, imagename, speed) {
		this.layer2 = processing.loadImage(imagename);
		this.layer2_speed = speed;
	},
	setupLayer3: function(processing, imagename, speed) {
		this.layer3 = processing.loadImage(imagename);
		this.layer3_speed = speed;
	},
	
	drawLayer1: function(processing, x) {
		processing.image(this.layer1, x, 0);
	},
	
	drawLayer2: function(processing, x) {
		processing.image(this.layer2, x, processing.height-this.layer2.height);
	},
	
	drawLayer3: function(processing, x) {
		processing.image(this.layer3, x, processing.height-this.layer3.height);
	}
	
	
}

$(document).ready(function(){
	Main.init();
});
