/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function initialize(wall, wallData, design, $) {
  var SpaceWall = function() {
      this.addCharacter = function(character) {
        // XXX
        return wall.addCharacter(character);
      };
    };
  SpaceWall.prototype = wall;

  return new SpaceWall();
}

document.initialize = initialize;
