/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery' ],
function ($) {
  return function (doc, wallData)
  {
    this.doc      = doc;
    this.wallData = wallData;

    this.startSession = function() {
      console.log("start-session");
      // XXX Remove all characters
    };

    this.addCharacter = function(character) {
      console.log("add-character");
      console.log(character);
      // XXX Add
    };

    this.removeCharacter = function(charId) {
      // XXX Fade out
    };

    this.changeDuration = function(duration) {
      // XXX ???
    };

    this.changeDesign = function() {
      // XXX Refresh
    };

    this.removeWall = function(duration) {
      // XXX Handle this further up the chain?
    };
  }
});
