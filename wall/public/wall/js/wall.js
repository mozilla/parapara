/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery' ],
function ($) {
  return function (doc, wallData)
  {
    // Store the passed in data so subclasses can access it
    this.doc      = doc;
    this.wallData = wallData;

    // Calculate the effective duration in milliseconds
    this.durationMs = wallData.duration || wallData.defaultDuration;

    // A number in the range [0,1) representing the difference between the
    // unit progress of the wall if left untouched and the unit progress of the
    // wall as defined by the server.
    //
    // This value is used to adjust the begin times of animations so that they
    // are in sync with the server.
    this.timeShift = 0;

    this.syncProgress = function(progress) {
      console.log("syncProgress: " + progress);
      console.log("getWallProgress: " + this.getWallProgress());

      // Calculate the difference between where the wall *currently* is and
      // where it *should* be.
      var progressDiff = this.getWallProgress() - progress;
      console.log("progressDiff: " + progressDiff);

      // Adjust the timeshift
      this.timeShift += progressDiff;
      console.log("timeShift: " + this.timeShift);

      // Apply adjustments
      this.scaleAnimations();
    };

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

    // Helper methods
    //
    // These are split out and public so that subclasses can selectively
    // override parts as needed

    this.getWallProgress = function() {
      return $('svg', doc)[0].getCurrentTime() / this.durationMs;
    };

    this.scaleAnimations = function() {
      // How much do we scale by?
      var scaleAmount = this.durationMs / wallData.defaultDuration;
      console.log("scaleAmount: " + scaleAmount);

      // How much do we need to shift begin times by?
      var seekAmountMs = this.timeShift * this.durationMs;
      console.log("seekAmountMs: " + seekAmountMs);

      // Scale each animation
      var wall = this;
      Array.prototype.forEach.call(this.getAnimations(),
        function(anim) {
          console.log("Scaling: " + anim);

          // Get unscaled begin time
          var origBegin = anim.getAttribute("data-begin");
          console.log("origBegin: " + origBegin);
          if (!origBegin) {
            origBegin = anim.getAttribute("begin") || "0s";
            console.log("origBegin(2): " + origBegin);
            anim.setAttribute("data-begin", origBegin);
          }
          console.log("origBegin(3): " + origBegin);
          var origBeginMs = wall.parseTime(origBegin);
          console.log("origBeginMs: " + origBeginMs);

          // Calculate scaled begin time that incorporates:
          //  - seek offsets to sync up with the wall time defined on the server
          //  - scaling due to changes in the duration
          if (origBeginMs !== null) {
            var newBeginMs = (origBeginMs + seekAmountMs) * scaleAmount;
            console.log("newBeginMs: " + newBeginMs);
            wall.updateBeginTime(anim, newBeginMs);
          }
       });
    };

    // Get all animations that are candidates for automatic scaling.
    this.getAnimations = function() {
      // Get all animations that loop indefinitely. Animations that don't look
      // indefinitely are likely "effects"--things like fading characters out or
      // temporarily showing things that shouldn't be scaled.
      //
      // In future we'll probably need to distinguish between animations where
      // we want to scale the duration only or the start time only etc.
      return doc.querySelectorAll('animate[repeatCount=indefinite],'
                                + 'animate[repeatDur=indefinite],'
                                + 'animateTransform[repeatCount=indefinite],'
                                + 'animateTransform[repeatDur=indefinite],'
                                + 'animateMotion[repeatCount=indefinite],'
                                + 'animateMotion[repeatDur=indefinite]');

    };

    // Very simple time parsing: Only supports 's' and 'ms' times.
    // Returns a value in milliseconds
    this.parseTime = function(str) {
      var matches = str.match(/^\s*(-?[0-9.]+)(m?s)\s*$/);
      return matches
        ? parseFloat(matches[1]) * (matches[2] == "s" ? 1000 : 1)
        : null;
    };

    this.updateBeginTime = function(anim, newBeginTimeMs) {
      // This operation is quite expensive so make sure its necessary
      if ((anim.hasAttribute("begin") &&
           this.parseTime(anim.getAttribute("begin")) == newBeginTimeMs) ||
          !anim.hasAttribute("begin") && newBeginTimeMs == 0) {
        return;
      }

      // Clone the animation and update
      // (See comment in animationClone as to why this is necessary)
      var clone = this.animationClone(anim);
      clone.setAttribute("begin", (newBeginTimeMs / 1000) + "s");

      // Put this animation in the same place
      anim.parentNode.insertBefore(clone, anim);
      anim.parentNode.removeChild(anim);
    }

    this.animationClone = function(elem) {
      // SMIL says that once a begin time is resolved its fixed. That's
      // a problem if you want to seek an item that is already playing backwards
      // because you won't be able to create a begin time earlier than the
      // current one.
      //
      // In Firefox this is easy to work around--just temporarily detach the
      // animation element from the document, updates its begin time, re-attach
      // and everything works as expected.
      //
      // In Chrome, however, that won't clear the previously resolved begin
      // times. In fact, even calling *cloneNode* causes the previously resolved
      // begin times to be cloned! So, for Chrome we have to manually build up
      // an exact replica of the animation so we can change its begin time!
      //
      // If anyone is using syncbase timing then all this extra cloning is sure
      // to cause havoc.
      var clone =
        elem.ownerDocument.createElementNS(elem.namespaceURI, elem.tagName);
      for (var i = 0; i < elem.attributes.length; i++) {
        var attrib = elem.attributes[i];
        if (attrib.specified) {
          if (attrib.namespaceURI) {
            clone.setAttributeNS(attrib.namespaceURI, attrib.name,
                                 attrib.value);
          } else {
            clone.setAttribute(attrib.name, attrib.value);
          }
        }
      }
      return clone;
    }
  }
});
