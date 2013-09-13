/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function initialize(Wall, wallData, design, $) {

  var WaWall = Wall.extend({
    getTemplateFields: function(character) {
      var fields = this._super(character);

      // Position character
      var yOfCharacter = 700 - 700 * character.groundOffset - character.height;
      fields.charTransform = "translate(0, " + yOfCharacter + ")";

      // Position shadow
      var ymat = character.height * 1.5 - 2;
      fields.useTransform = "matrix(1 0 0 -0.5 0 " + ymat + ")";

      // Extra positioning value so we make sure the animation continues until
      // at least the end of the screen
      fields.rightEdge = 1280 + character.width;

      return fields;
    },
  });

  return WaWall;
}

document.initialize = initialize;
