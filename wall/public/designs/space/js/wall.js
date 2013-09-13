/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function initialize(Wall, wallData, design, $) {

  var SpaceWall = Wall.extend({
    // The time taken for the planet to do a full rotation (before any duration
    // scaling).
    //
    // This needs to be kept in sync with wall.svg
    planetDurationMs: 240 * 1000,

    // The time taken for a character do a full loop of its track.
    charDurationMs: 40 * 1000,

    // Debug wall
    //
    // Shows wall progress for debugging positioning
    debug: false,

    init: function(doc, wallData) {
      // Add debugging output if necessary
      if (this.debug) {
        updateProgress(this, doc);
      }
      this._super(doc, wallData);
    },

    getTemplateFields: function(character) {
      var fields = this._super(character);

      // Calculate the timing for when the character should make its debut. This
      // is a bit tricky because we have two animations going in different
      // directions: the spinning planet and the walking characters.
      //
      // Normally we set the begin time as follows:
      //
      //   begin = character.x * this.wallData.defaultDuration
      //
      // HOWEVER, that fails to take into account that the path we're putting
      // the characters on to is moving in the opposite direction. In effect we
      // have to push the characters out "sooner" to compensate for the opposing
      // rotation of the path.
      //
      // How much sooner? Basically, we subtract the amount of time the planet
      // would have moved in the opposite direction while the character was
      // waiting to start which is basically:
      //
      //   characterDuration / planetDuration * planetDuration
      //
      // Then, finally, we have to make some slight tweaks so that the character
      // is ready for its debut. When the server receives a new character it
      // records the current position of the wall as the character's x position.
      //
      // However, it may take a second or two from that point until we receive
      // the character and finish downloading the SVG character. So, we add
      // a little to the character's x value to allow time for the character to
      // get ready.
      //
      // All that gives us:
      //
      fields.begin =
        (character.x + 0.008) *
        this.planetDurationMs *
        (1 - this.charDurationMs / this.planetDurationMs);
      fields.beginStr = fields.begin / 1000 + "s";

      // Expose a few other constants to templates
      fields.planetDurStr = this.planetDurationMs / 1000 + "s";
      fields.charDurStr   = this.charDurationMs   / 1000 + "s";

      return fields;
    },
  });

  /*
   * Debugging functionality to show the current wall progress
   */
  function updateProgress(wall, doc) {
    var progress = doc.getElementById("progress-debug");
    if (progress) {
      progress.setAttribute("display", "block");
      progress.textContent = Number(wall.getWallProgress() * 1000).toFixed(0);
    }
    window.setTimeout(function() { updateProgress(wall, doc); }, 500);
  }

  return SpaceWall;
}

document.initialize = initialize;
