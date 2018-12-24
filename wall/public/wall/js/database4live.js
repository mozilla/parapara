/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var API_DIR = "/api/";
var CHARACTERS_DIR = "/characters/";

var Database = {

  start: function(timebase, characterListener) {
    Database.current_rate = 0;
    Database.latest_character_id = 0;
    Database.characters = [];
    Database.listener = characterListener;
    Database.timebase = timebase;
    // Changes animate duration. [dur]
    Database.duration_rate =
      Utility.applyDuration(Database.timebase, BASE_TIME,
        BEGIN_TIME+(new Date()).getTime()-BEFORE_LOADED_TIME);
    Database.begin_rate = BEGIN_TIME/BASE_TIME;
    Database.loadAllCharacters(function() {
    });
  },

  preidle: function() {
    var currentActiveTime = Main.timebase.getCurrentTime();
    var simpleDuration = Main.timebase.getSimpleDuration();
    // Get the time within the current repeat iteration
    var currentSimpleTime = currentActiveTime % simpleDuration;
    // Get simple time as a ratio of the simple duration (i.e. how far are we
    // through the current iteration)
    var currentRate = currentSimpleTime/simpleDuration;
    currentRate += Database.begin_rate;
    if (currentRate > 1) {
        currentRate = currentRate-1;
    }
    if (currentRate < Database.current_rate) {
      for (var i = 0, n = Database.characters.length; i < n; i++) {
        Database.characters[i].sent = false;
      }
    }
    Database.current_rate = currentRate;
    Database.timeout_id = setTimeout(Database.idle, 100);
  },

  idle: function() {
    var currentActiveTime = Main.timebase.getCurrentTime();
    var simpleDuration = Main.timebase.getSimpleDuration();
    // Get the time within the current repeat iteration
    var currentSimpleTime = currentActiveTime % simpleDuration;
    // Get simple time as a ratio of the simple duration (i.e. how far are we
    // through the current iteration)
    var currentRate = currentSimpleTime/simpleDuration;
    currentRate += Database.begin_rate;
    if (currentRate > 1) {
        currentRate = currentRate-1;
    }
    if (currentRate < Database.current_rate) {
      for (var i = 0, n = Database.characters.length; i < n; i++) {
        var character = Database.characters[i];
        character.sent = false;
        character.isNew = false;
      }
    }
    var previousRate = Database.current_rate;
    Database.current_rate = currentRate;
    // Go through and add waiting characters
    for (var i = 0, n = Database.characters.length; i < n; i++) {
      var character = Database.characters[i];
      // If the character is not ready to appear or has already been added
      // skip it
      var rate = character.x;
      if (character.sent != true && rate < currentRate && (character.isNew == true || previousRate < rate)) {
//      if (character.sent != true) { //for debug
//      console.error("******"+rate+":"+currentRate+" "+previousRate);

        Database.listener(character, currentActiveTime, currentSimpleTime,
                          currentRate, Database.duration_rate);
        character.sent = true;
      }
    }
    Database.timeout_id = setTimeout(Database.idle, 100);
  },

  // Get the characters that have not yet been assigned an x value
  loadUncompletedCharacters: function() {
    // Send ratio in the duration.
    var lastChar = Database.latest_character_id;
    var url = API_DIR+"get_uncompleted_characters.php"
            + "?charId=" + lastChar
            + "&wallId=" + WALL_ID
            + "&sessionId=" + SESSION_ID
            + "&" +(new Date()).getTime();
    ParaPara.getUrl(url,
      function(response) {
        Database.append(response, true);
        setTimeout(Database.loadUncompletedCharacters, 1000);
      },
      function(key, detail) {
        // Got an error, but just keep going anyway
        setTimeout(Database.loadUncompletedCharacters, 1000);
      }
    );
  },

  // Get all characters that have already been assigned an x value (i.e. have
  // already made their debut on the stage)
  loadAllCharacters: function(callback) {
    var url = API_DIR+"get_all_characters.php"
            + "?threshold=" + NUM_CHARACTERS_THRESHOLD
            + "&wallId=" + WALL_ID
            + "&sessionId=" + SESSION_ID
            + "&" +(new Date()).getTime();
    ParaPara.getUrl(url,
      function(response) {
        Database.append(response, false);
        Database.preidle();
        Database.loadUncompletedCharacters();
        callback();
      },
      function (key, detail) {
        console.log("Couldn't get characters: " + key + ": " + detail);
      }
    );
  },

  append: function(characters, isNew) {
    for (var i = 0, n = characters.length; i < n; i++) {
      var characterOfJson = characters[i];
      var character = new Character();
      character.setup(characterOfJson);
      character.isNew = isNew;
      Database.latest_character_id =
        Math.max(Database.latest_character_id, character.id);
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
    this.author = json.author;
    this.title = json.title;
    this.uri = CHARACTERS_DIR+this.id+".svg";
    this.groundOffset = json.groundOffset;
    this.width = json.width;
    this.height = json.height;
  }
}
