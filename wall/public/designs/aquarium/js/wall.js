/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function initialize(Wall, wallData, design, $) {

  var AquariumWall = Wall.extend({
    getTemplateFields: function(character) {
      var fields = this._super(character);

      var frontSize = 0.6;
      var backSize = 0.4;
      var yOfCharacter = (800 - character.height * frontSize) * Math.random();

      fields.frontCharTransform =
        "translate(0, " + yOfCharacter + ") scale(" +frontSize+ ")";
      fields.backCharTransform =
        "translate(0, " + yOfCharacter + ") scale("+backSize+ ") scale(-1, 1)";

      var frontDur = 0.1 + 0.3 * Math.random();
      var backDur = frontDur * 1.2;
      fields.frontDurKey = frontDur;
      fields.backDurKey = 0.5 + backDur;

      // Extra positioning value so we make sure the animation continues until
      // at least the end of the screen
      fields.rightEdge = 1200 + character.width * frontSize;

      return fields;
    },
  });

  return AquariumWall;
}

document.initialize = initialize;
