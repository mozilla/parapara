/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var API_DIR = "../api/";
var CHARACTERS_DIR = "/characters/";

var Database = {

  start: function(timebase, characterListener) {
    Database.characters = [];
    Database.listener = characterListener;
    Database.timebase = timebase;
    Database.loadAllCharacters();
  },

  next: function(index) {
    if (index == Database.characters.length) {
      index = 0;
    }
    var currentActiveTime = Main.timebase.getCurrentTime();
    var simpleDuration = Main.timebase.getSimpleDuration();
    // Get the time within the current repeat iteration
    var currentSimpleTime = currentActiveTime % simpleDuration;
    // Get simple time as a ratio of the simple duration (i.e. how far are we
    // through the current iteration)
    var currentRate = currentSimpleTime/simpleDuration;
    // Go through and add waiting characters
    var character = Database.characters[index];
    Database.listener(character, currentActiveTime, currentSimpleTime, currentRate);
    Database.timeout_id = setTimeout(Database.next, Math.round(4000+Math.random()*3000), index+1);
  },
  
  // Get all characters that have already been assigned an x value (i.e. have
  // already made their debut on the stage)
  loadAllCharacters: function(callback) {
    var url = API_DIR+"get_all_characters.php?threshold="+
              NUM_CHARACTERS_THRESHOLD+"&"+(new Date()).getTime();
    ParaPara.getUrl(url,
      function(response) {
        Database.append(response);
        Database.next(0);
      },
      function (key, detail) {
        console.log("Couldn't get characters: " + key + ": " + detail);
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
    this.groundOffset = json.groundOffset;
    this.width = json.width;
    this.height = json.height;
  }
}
