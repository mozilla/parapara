var API_DIR = "../api/";
var CHARACTERS_DIR = "../characters/";
var CHARACTER_WIDTH = 300;
var CHARACTER_HEIGHT = 300;
var CHARACTER_DURATION = 20;//sec

var Main = {

	init: function() {
		Main.timebase = document.getElementById("time-base");
		Main.timebase.addEventListener("repeatEvent", function(e) {
			for (var i = 0, n = Main.characters.length; i < n; i++) {
				var ch = Main.characters[i];
				ch.isAppended = false;
			}
		}, true);
		
		Main.main_layer = document.getElementById("main-layer");
		Main.front_layer = document.getElementById("front-layer");
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
		var originalCurrentTime = Main.timebase.getCurrentTime();
		var currentTime = originalCurrentTime;
		var simpleDuration = Main.timebase.getSimpleDuration();
		currentTime = currentTime - (parseInt(currentTime/simpleDuration)*simpleDuration);
		Main.current_time = currentTime;
		for (var i = 0, n = Main.characters.length; i < n; i++) {
			var character = Main.characters[i];
			if (character.x < currentTime && true != character.isAppended) {
		//		console.log(character.x);
			/*
		<image filter="url(#shadow)" xlink:href="../characters/8.svg" width="300" height="300"
			transform="translate(-150 -280)">
			<animateMotion dur="20s" repeatCount="indefinite" rotate="auto" >
				<mpath xlink:href="#main-layer-path"/>
			</animateMotion>
		</image>
		<image id="7" href="../characters/7.svg" filter="url(#shadow)" width="300" height="300" transform="translate(-150 -280)">
			<animateMotion dur="20s" rotate="auto" repeatCount="1" fill="freeze" begin="indefinite">
		</image>
			*/
				var image = document.createElementNS("http://www.w3.org/2000/svg", "image");
				image.setAttribute("id", character.id);
				image.setAttributeNS("http://www.w3.org/1999/xlink", "href", CHARACTERS_DIR+character.id+".svg");
				image.setAttribute("filter", "url(#shadow)");
				image.setAttribute("width", CHARACTER_WIDTH);
				image.setAttribute("height", CHARACTER_HEIGHT);
				image.setAttribute("transform", "translate(-"+CHARACTER_WIDTH/2+" -"+(CHARACTER_HEIGHT-20)+")");
				var animationMotion = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
				animationMotion.setAttribute("dur", CHARACTER_DURATION+"s");
				animationMotion.setAttribute("rotate", "auto");
				animationMotion.setAttribute("repeatCount", "1");
				animationMotion.setAttribute("fill", "remove");
				animationMotion.setAttribute("begin", originalCurrentTime+"s");
				animationMotion.addEventListener("endEvent", function(e) {
					var imageElement = e.originalTarget.parentNode;
					var id = imageElement.getAttribute("id");
					imageElement.parentNode.removeChild(imageElement);
				}, true);
				var mpath = document.createElementNS("http://www.w3.org/2000/svg", "mpath");
				mpath.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#main-layer-path");
				animationMotion.appendChild(mpath);
				image.appendChild(animationMotion);
				Main.main_layer.appendChild(image);
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
//		console.log(this.x);
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