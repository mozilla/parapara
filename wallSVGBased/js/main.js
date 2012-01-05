var API_DIR = "../api/";
var CHARACTERS_DIR = "../characters/";
var CHARACTER_WIDTH = 150;
var CHARACTER_HEIGHT = 150;
var CHARACTER_DURATION = 60;//sec
var CHARACTER_HALF_DURATION = CHARACTER_DURATION/2;

var Main = {

	init: function() {
		Main.animation = document.getElementById("planet-rotation");
		Main.main_group = document.getElementById("main-group");
		Main.current_time = 0;
		Main.start();
   	},
	
	start: function() {
		Main.loadAllCharacters(function() {
			Main.idle();
			Main.loadUncompletedCharacters();
		});
	},

	idle: function() {
		var currentTime = Main.animation.getCurrentTime();
		var simpleDuration = Main.animation.getSimpleDuration();
		currentTime = currentTime - (parseInt(currentTime/simpleDuration)*simpleDuration);
		Main.current_time = currentTime;
		var time4character = currentTime/simpleDuration*CHARACTER_DURATION;
		for (var i = 0, n = Main.characters.length; i < n; i++) {
			var character = Main.characters[i];
			if (character.x/10 < currentTime && true != character.isAppended) {
				var image = document.createElementNS("http://www.w3.org/2000/svg", "image");
				image.setAttribute("id", character.id);
				image.setAttributeNS("http://www.w3.org/1999/xlink", "href", CHARACTERS_DIR+character.id+".svg");
				image.setAttribute("width", CHARACTER_WIDTH);
				image.setAttribute("height", CHARACTER_HEIGHT);
				image.setAttribute("transform", "translate(-40 -130)");
				var animationMotion = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
				var duration = 5+CHARACTER_DURATION*Math.random();
				animationMotion.setAttribute("dur", duration+"s");
				animationMotion.setAttribute("rotate", "auto-reverse");
				animationMotion.setAttribute("fill", "freeze");
				animationMotion.setAttribute("begin", "indefinite");
				animationMotion.setAttribute("repeatDur", (duration+time4character)+"s");
				animationMotion.addEventListener("endEvent", function(e) {
					var imageElement = e.originalTarget.parentNode;
					var id = imageElement.getAttribute("id");
					imageElement.parentNode.removeChild(imageElement);
					for (var j = 0, m = Main.characters.length; j < m; j++) {
						var ch = Main.characters[j];
						if (ch.id == id) {
							console.log(id);
							ch.isAppended = false;
							break;
						}
					}
_				}, true);
				var mpath = document.createElementNS("http://www.w3.org/2000/svg", "mpath");
				mpath.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#path1");
				animationMotion.appendChild(mpath);
				image.appendChild(animationMotion);
				Main.main_group.appendChild(image);
				animationMotion.beginElementAt(-time4character);
				character.isAppended = true;
			}
		}
		Main.timeout_id = setTimeout(Main.idle, 100);
	},

	loadUncompletedCharacters: function() {
		var url = API_DIR+"get_uncompleted_characters.php?x="+Main.current_time+"&"+(new Date()).getTime();
		$.getJSON(url, function(json) {
			Main.appendCharacters(json);
			setTimeout(Main.loadUncompletedCharacters, 1000);
		});
	},
	
	loadAllCharacters: function(callback) {
		var url = API_DIR+"get_all_characters_before_restart.php?type="+TYPE+"&"+(new Date()).getTime();
		$.getJSON(url, function(json) {
			Main.characters = [];
			Main.appendCharacters(json);
			callback();
		});
	},
	
	appendCharacters: function(json) {
		for (var i = 0, n = json.length; i < n; i++) {
			var characterOfJson = json[i];
			var character = new Character();
			character.setup(characterOfJson);
			Main.characters.push(character);
		}
	}
}

function Character() {
}

Character.prototype = {
	setup: function(json) {
		this.x = json.x;
		console.log(this.x);
		this.id = json.id;
	},

	show: function(parent) {
	},
	
	hide: function(parent) {
		this.ui.remove();
	}	
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