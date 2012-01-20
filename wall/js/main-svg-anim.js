var API_DIR = "../api/";
var CHARACTERS_DIR = "../characters/";
var CHARACTER_WIDTH = 296;
var CHARACTER_HEIGHT = 345;
var SVG_NS = "http://www.w3.org/2000/svg";
var XLINK_NS = "http://www.w3.org/1999/xlink";

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
//      for (var i = 0, n = json.length; i < n; i++) {
      for (var i = 0, n = 3; i < n; i++) {
        var characterOfJson = json[i];
        characterOfJson = new Object();
        characterOfJson.appearance_x = 100;
        characterOfJson.appearance_y = 100;

        var character = new Character();
        character.setup(characterOfJson, i*50);
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
  setup: function(json, angle) {
    this.angle = angle;
    this.ui = document.createElementNS(SVG_NS, "image");
    this.ui.setAttributeNS(XLINK_NS, "xlink:href", "../characters/smiley.svg");
    this.ui.setAttribute("x", json.appearance_x);
    this.ui.setAttribute("y", json.appearance_y);
    this.ui.setAttribute("width", "300");
    this.ui.setAttribute("height", "300");
    this.ui.setAttribute("image-rendering", "optimizeSpeed");

    var x_offset = 100 + 300/2;
    var y_offset = 100*2 + 300;
    var x = document.documentElement.clientWidth/2 - x_offset;
    var y = document.documentElement.clientHeight - y_offset;

    this.ui.setAttribute("transform", "translate(" + [x,y].join(" ") + ")");
    this.anim = document.createElementNS(SVG_NS, "animateTransform");
    this.anim.setAttribute("attributeName", "transform");
    this.anim.setAttribute("type", "rotate");
    this.anim.setAttribute("from", [this.angle, x_offset, y_offset].join(" "));
    this.anim.setAttribute("dur", "24s");
    this.anim.setAttribute("to",
                           [this.angle+360, x_offset, y_offset].join(" "));
    this.anim.setAttribute("additive", "sum");
    this.anim.setAttribute("repeatDur", "indefinite");
    this.ui.appendChild(this.anim);
  },
}

$(document).ready(function(){
  Main.init();
});
