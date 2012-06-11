/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var API_DIR = "../api/";
var CHARACTERS_DIR = "../characters/";

var Database = {

  start: function(timebase, characterListener) {
    Database.characters = [];
    Database.listener = characterListener;
    Database.timebase = timebase;
    Database.timebase.addEventListener("repeatEvent", function(e) {
      for (var i = 0, n = Database.characters.length; i < n; i++) {
        Database.characters[i].sent = false;
      }
    }, true);

    //changes animate duration. [dur]
    Database.duration_rate = Utility.applyDuration(Database.timebase, BASE_TIME, BEGIN_TIME+(new Date()).getTime()-BEFORE_LOADED_TIME);

    Database.loadAllCharacters();
  },

  idle: function() {
    var currentActiveTime = Main.timebase.getCurrentTime();
    var simpleDuration = Main.timebase.getSimpleDuration();
    // Get the time within the current repeat iteration
    var currentSimpleTime = currentActiveTime % simpleDuration;
    // Get simple time as a ratio of the simple duration (i.e. how far are we
    // through the current iteration)
    var currentRate = currentSimpleTime/simpleDuration;
    Database.current_rate = currentRate;
    
    // Go through and add waiting characters
    for (var i = 0, n = Database.characters.length; i < n; i++) {
      var character = Database.characters[i];
      // If the character is not ready to appear or has already been added
      // skip it
      
      var rate = character.x;
      if (rate < currentRate && !character.sent) {
        Database.listener(character, currentActiveTime, currentSimpleTime, currentRate, Database.duration_rate);
        character.sent = true;
      }
    }
    
    Database.timeout_id = setTimeout(Database.idle, 100);
  },
  
  // Get all characters that have already been assigned an x value (i.e. have
  // already made their debut on the stage)
  loadAllCharacters: function(callback) {
    var url = API_DIR+"get_all_characters.php?threshold="+
              NUM_CHARACTERS_THRESHOLD+"&"+(new Date()).getTime();
    $.getJSON(url, function(json) {
      Database.append(json);
      Database.idle();
    });
  },

  append: function(json) {
    for (var i = 0, n = json.length; i < n; i++) {
      var characterOfJson = json[i];
      var character = new Character();
      character.setup(characterOfJson);
      Database.characters.push(character);
    }
  }
}

function Character() {
}

Character.prototype = {
  setup: function(json) {
    this.x = parseInt(json.x)/1000;
    this.id = json.id;
    this.sent = false;
    this.uri = CHARACTERS_DIR+this.id+".svg";
  }
}
