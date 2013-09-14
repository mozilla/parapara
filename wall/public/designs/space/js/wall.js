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
      // Or, replacing 'character.x' with just 'x', and
      // 'this.wallData.defaultDuration' with just 'planetDuration' we have:
      //
      //   begin = x * planetDuration
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
      //   x * (characterDuration / planetDuration) * planetDuration
      //
      // Let's call the rate of the character movement to the rate of the
      // planet, simply the "rate" as follows:
      //
      var rate = this.charDurationMs / this.planetDurationMs;
      //
      // Then, the amount we need to subtract is just:
      //
      //   x * rate * planetDuration
      //
      // So our begin time is:
      //
      //   begin = x * planetDuration - x * rate * planetDuration
      //         = x * planetDuration * (1 - rate)
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
      // Call this the start delay:
      //
      var startDelay = 0.008;
      //
      // All that gives us:
      //
      fields.begin = (character.x + startDelay) *
                     this.planetDurationMs *
                     (1 - rate);
      fields.beginStr = fields.begin / 1000 + "s";

      // Expose a few other constants to templates
      fields.planetDurStr = this.planetDurationMs / 1000 + "s";
      fields.charDurStr   = this.charDurationMs   / 1000 + "s";

      // Now to calculate the range where an individual animation should be
      // turned on.
      //
      // I did all sorts of complex maths for this an some how it all cancelled
      // out to something really simply.
      //
      // Basically, we have the follow two constants which are empirically
      // derived based on the shape of the path. If you change the ratio of the
      // character animation to the planet these will likely need fixing.
      //
      // Firstly, in some sections of the path the characters need to be turned
      // on a bit sooner since the path is irregular. This is the shift forwards
      // factor:
      var shiftForwards = 0.04;

      // That lets us calculate when the character is ready to hit the stage as
      // follows:
      var debut = Math.max((character.x - shiftForwards) * rate, 0);

      // Then we have to decide how long to keep them there and the following
      // seems to be about right:
      var displayLength = 0.08;

      // Then just set up the key times:
      fields.displayKeyTimes =
          "0; " +
          debut.toFixed(3) + "; " +
          Number(debut + displayLength).toFixed(3);

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
