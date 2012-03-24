/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var API_DIR = "../api/";
var CHARACTERS_DIR = "../characters/";
var CHARACTER_WIDTH = 300;
var CHARACTER_HEIGHT = 300;
var CHARACTER_DURATION = 20; // sec

// Maximum number of "old" characters to show. That is, we always show newly
// added characters, even if 100 come it at one time.
// We apply this threshold and drop characters when:
// * Characters have been shown the minimum number of times, or
// * When getting the initial list of characters from the server (for characters
//   that have already been displayed in the past).
var NUM_CHARACTERS_THRESHOLD = 25;

// Number of times to show a character before shrinking/fading it
var NUM_ITERATIONS_AT_FULL_SIZE = 2;

// Minimum number of times to show a character shrunk or faded before it can be
// dropped
var MIN_NUM_ITERATIONS_AT_REDUCED_SIZE = 1;

var Main = {

  init: function() {
    Main.timebase = document.getElementById("time-base");
    // Each time we repeat, mark each character as not yet appended
    // (characters are removed from the scene after they complete each
    // animation)
    Main.timebase.addEventListener("repeatEvent", function(e) {
      for (var i = 0, n = Main.characters.length; i < n; i++) {
        Main.characters[i].isAppended = false;
      }
    }, true);

    Main.main_layer = document.getElementById("main-layer");
    Main.main_layer_path = document.getElementById("main-layer-path");
    Main.currentSimpleTime = 0;
    Main.start();
  },

  start: function() {
    Main.loadAllCharacters(function() {
      Main.idle();
      Main.loadUncompletedCharacters();
    });
  },

  idle: function() {
    var currentActiveTime = Main.timebase.getCurrentTime();
    var simpleDuration = Main.timebase.getSimpleDuration();
    // Get the time within the current repeat iteration
    var currentSimpleTime = currentActiveTime % simpleDuration;
    Main.currentSimpleTime = currentSimpleTime;
    // Get simple time as a ratio of the simple duration (i.e. how far are we
    // through the current iteration)
    var currentRate = currentSimpleTime/simpleDuration;
    var ANIMATE_RANGE = 0.5;

    // Start is the offset into the motion path at which to start animations for
    // the current time. We set it to -1 and then calculate it for the first
    // animation that is ready to be appended. After that, we just re-use the
    // same value.
    var start = -1;
    // Start diff is the amount of tweaking we have to do to get a start value
    // that's off the screen.
    var startdiff = 0;

    // Go through and add waiting characters
    for (var i = 0, n = Main.characters.length; i < n; i++) {
      var character = Main.characters[i];

      // If the character is not ready to appear or has already been added
      // skip it
      if (character.x >= currentSimpleTime || character.isAppended) {
        continue;
      }

      // If the number of characters exceeds the threshold then drop characters
      // from the array that have already run their course
      var minRepeatCount =
        NUM_ITERATIONS_AT_FULL_SIZE + MIN_NUM_ITERATIONS_AT_REDUCED_SIZE;
      if (n > NUM_CHARACTERS_THRESHOLD &&
          character.repeatCount >= minRepeatCount)
      {
        Main.characters.splice(i,1);
        --n;
        --i;
        continue;
      }

      // Create a group to wrap the character and its animation
      var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("id", character.id);

      // Create the character image
      var image =
        document.createElementNS("http://www.w3.org/2000/svg", "image");
      var imageid = character.id+"i";
      image.setAttribute("id", imageid);
      image.setAttributeNS("http://www.w3.org/1999/xlink", "href",
        CHARACTERS_DIR+character.id+".svg");
      image.setAttribute("width", CHARACTER_WIDTH);
      image.setAttribute("height", CHARACTER_HEIGHT);
      var imageTransform = "";
      if (character.repeatCount >= NUM_ITERATIONS_AT_FULL_SIZE) {
        // Shrink character in half
        var actualWidth  = CHARACTER_WIDTH  / 2;
        var actualHeight = CHARACTER_HEIGHT / 2;
        imageTransform =
          "translate(-" + actualWidth/2 + " -"+(actualHeight-20)+") " +
          "scale(0.5)";
      } else {
        imageTransform =
          "translate(-"+CHARACTER_WIDTH/2+" -"+(CHARACTER_HEIGHT-20)+")";
      }
      image.setAttribute("transform", imageTransform);
      g.appendChild(image);

      // Add a shadow to the character
      var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttribute("transform", "matrix(1 0 0 -0.5 0 0)");
      use.setAttribute("filter", "url(#shadow)");
      use.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#"+imageid);
      g.appendChild(use);

      // Create the animation
      var animateMotion =
        document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
      animateMotion.setAttribute("dur", CHARACTER_DURATION+"s");
      animateMotion.setAttribute("rotate", "auto");
      animateMotion.setAttribute("begin", currentActiveTime+"s");
      animateMotion.setAttribute("calcMode", "linear");
      var mpath =
        document.createElementNS("http://www.w3.org/2000/svg", "mpath");
      mpath.setAttributeNS("http://www.w3.org/1999/xlink", "href",
        "#main-layer-path");
      animateMotion.appendChild(mpath);

      // When the animation finishes, remove the character
      animateMotion.addEventListener("endEvent", function(e) {
        var gElement = e.originalTarget.parentNode;
        gElement.parentNode.removeChild(gElement);
      }, true);

      // Find the point on the path to start the animation so that it will
      // appear just off-screen
      if (start == -1) {
        start = (1-currentRate);
        var matrix = Main.main_layer_path.getScreenCTM();
        for (;;) {
          var point =
            Main.main_layer_path.getPointAtLength(start).
            matrixTransform(matrix);
//          console.log("-- "+start+" : "+point.x+","+point.y+" --");
          if (point.x > window.innerWidth) {
            break;
          }
          start += 0.01;
          startdiff += 0.01;
          if (start > 1) {
            start -= 1;
          }
        }
      }
      // Since we animate in the opposite direction to the path, we subtract the
      // range of the animation from the start value.
      var end = start-ANIMATE_RANGE + startdiff;
      if (end >= 0) {
        //console.log(start+";"+end);
        animateMotion.setAttribute("keyPoints", start+";"+end);
        animateMotion.setAttribute("keyTimes", "0;1");
      } else {
        var startRate = start*(1/ANIMATE_RANGE);
        //console.log(start+";0;1;"+(end+1));
        //console.log("0;"+startRate+";"+startRate+";1");
        animateMotion.setAttribute("keyPoints", start+";0;1;"+(end+1));
        animateMotion.setAttribute("keyTimes",
          "0;"+startRate+";"+startRate+";1");
      }

      // Add the animation to the group, then add the group to the scene
      g.appendChild(animateMotion);
      Main.main_layer.appendChild(g);

      // Update the character's status so we don't add it again
      character.isAppended = true;
      character.repeatCount++;
    }

    Main.timeout_id = setTimeout(Main.idle, 100);
  },

  // Get the characters that have not yet been assigned an x value
  loadUncompletedCharacters: function() {
    var url = API_DIR+"get_uncompleted_characters.php?x="+
              Main.currentSimpleTime+"&"+(new Date()).getTime();
    $.getJSON(url, function(json) {
      Main.appendCharacters(json);
      setTimeout(Main.loadUncompletedCharacters, 1000);
    });
  },

  // Get all characters that have already been assigned an x value (i.e. have
  // already made their debut on the stage)
  loadAllCharacters: function(callback) {
    var url = API_DIR+"get_all_characters_before_restart.php?threshold="+
              NUM_CHARACTERS_THRESHOLD+"&"+(new Date()).getTime();
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
//    console.log(this.x);
    this.id = json.id;
    this.repeatCount = 0;
    this.isAppended = false;
  }
}
