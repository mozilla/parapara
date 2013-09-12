/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function initialize(Wall, wallData, design, $) {
  var SpaceWall = Wall.extend({
    instantiateTemplate: function(template, character) {
      var elem = this._super(template, character);

      // Apply additional transform to image
      var image = elem.querySelector("image");
      image.setAttribute("transform",
        "translate(-" + (character.width / 2) +
                   " -" + (character.height + 20) +")");

      return elem;
    },
    getTemplateFields: function(character) {
      var fields = this._super(character);
      fields.charDur = fields.dur / 6;
      fields.charDurStr = fields.charDur / 1000 + "s";
      return fields;
    },
  });
  return SpaceWall;
}

document.initialize = initialize;
