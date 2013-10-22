/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery', 'walls/subclass' ],
function ($) {
  return Class.extend({
    // Convenience definitions
    SVG_NS: "http://www.w3.org/2000/svg",
    XLINK_NS: "http://www.w3.org/1999/xlink",

    init: function(doc, wallData) {
      // Store the passed in data so subclasses can access it
      this.doc      = doc;
      this.wallData = wallData;

      // Calculate the effective duration in milliseconds
      this.durationMs = wallData.duration || wallData.defaultDuration;

      // A number in the range [0,1) representing the difference between the
      // unit progress of the wall if left untouched and the unit progress of
      // the wall as defined by the server.
      //
      // This value is used to adjust the begin times of animations so that they
      // are in sync with the server.
      this.timeShift = 0;

      // Do an initial scale to make sure the background is running at the right
      // duration
      this.scaleAnimations();
    },

    syncProgress: function(progress) {
      // Calculate the difference between where the wall *currently* is and
      // where it *should* be.
      var progressDiff = this.getClockProgress() - progress;

      // Adjust the timeshift
      this.timeShift = progressDiff;

      // Apply adjustments
      this.scaleAnimations(this.getAnimations());
    },

    startSession: function() {
      // Get all characters in the document
      var characters = this.doc.querySelectorAll(".character");

      // Don't include characters that are actually templates
      characters = Array.prototype.filter.call(characters, isNotTemplateChild);

      // Remove each character
      var wall = this;
      characters.forEach(function(character) {
        wall.removeCharacter(character);
      });
    },

    addCharacter: function(character) {
      // Find character templates
      var templates = this.getCharacterTemplates();

      // Instantiate each template
      var wall = this;
      var elems = [];
      Array.prototype.forEach.call(templates,
        function(template) {
          // Create the elements
          var characterElem = wall.instantiateTemplate(template, character);

          // Scale timing
          wall.scaleAnimations(wall.getAnimations(characterElem));

          // Append to document
          if (characterElem.hasAttribute("data-target")) {
            container =
              wall.doc.getElementById(
                characterElem.getAttribute("data-target"));
            if (container) {
              container.appendChild(characterElem);
              // wall.kickStartSafari(characterElem);
            }
          }

          elems.push(characterElem);
        }
      );

      // Return the list so subclasses can make last-minute changes
      return elems;
    },

    removeCharacter: function(character) {
      // See if character is:
      //  - an element
      //  - an array of elements
      //  - an ID
      var characters;
      if (character.tagName) {
        characters = new Array(character);
      } else if (Object.prototype.toString.call(character) ===
                 '[object Array]') {
        characters = character;
      } else if (typeof character === 'string' ||
                 typeof character === 'number') {
        var nodelist =
          this.doc.querySelectorAll('[data-char-id="' + character + '"]');
        characters = Array.prototype.slice.call(nodelist);
      }
      console.log(characters);
      if (!characters || !characters.length)
        return;

      // Fade out and remove each character
      var wall = this;
      characters.forEach(function(charElem) {
        // Add a fade out animation
        var fadeOut = document.createElementNS(wall.SVG_NS, "animate");
        fadeOut.setAttribute("attributeName", "opacity");
        fadeOut.setAttribute("to", "0");
        fadeOut.setAttribute("dur", "0.5s");
        fadeOut.setAttribute("begin", "indefinite");
        fadeOut.setAttribute("fill", "freeze");

        // Attach event handler to actually remove the character
        // (TODO: Use a timeout as a fallback since some UAs don't support these
        // animation events very well.)
        fadeOut.addEventListener("endEvent", function(e) {
          charElem.parentNode.removeChild(charElem);
        }, true);

        // Add and trigger the animation
        charElem.appendChild(fadeOut);
        fadeOut.beginElement();
      });
    },

    changeDuration: function(duration) {
      this.durationMs = duration;
      this.scaleAnimations(this.getAnimations());
    },

    changeDesign: function() {
      // XXX Refresh
    },

    removeWall: function(duration) {
      // XXX Handle this further up the chain?
    },

    // Helper methods
    //
    // These are split out and public so that subclasses can selectively
    // override parts as needed

    getClockProgress: function() {
      var svg = $('svg', this.doc)[0];
      if (!svg)
        return 0;

      var progress = svg.getCurrentTime() * 1000 / this.durationMs;
      return progress ? progress % 1 : 0;
    },

    getWallProgress: function() {
      var progress = this.getClockProgress() - this.timeShift;
      return progress >= 1 ? progress - 1 : progress;
    },

    scaleAnimations: function(animations) {
      // animations is a NodeList or similar
      if (typeof animations === "undefined")
        animations = this.getAnimations();

      // How much do we scale by?
      var scaleAmount = this.durationMs / this.wallData.defaultDuration;

      // How much do we need to shift begin times by?
      var seekAmountMs = this.timeShift * this.durationMs;

      // Scale each animation
      var wall = this;
      Array.prototype.forEach.call(animations,
        function(anim) {
          wall.scaleAnimation(anim, scaleAmount, seekAmountMs);
        });
    },

    scaleAnimation: function(anim, scaleAmount, seekAmountMs) {
      // Get unscaled begin time
      var origBegin = anim.getAttribute("data-begin");
      if (!origBegin) {
        origBegin = anim.getAttribute("begin") || "0s";
        anim.setAttribute("data-begin", origBegin);
      }
      var origBeginMs = this.parseTime(origBegin);

      // Calculate scaled begin time that incorporates:
      //  - seek offsets to sync up with the wall time defined on the server
      //  - scaling due to changes in the duration
      if (origBeginMs !== null) {
        var newBeginMs = origBeginMs * scaleAmount + seekAmountMs;
        anim = this.updateBeginTime(anim, newBeginMs);
      }

      // Get original duration
      var origDur = anim.getAttribute("data-dur");
      if (!origDur) {
        origDur = anim.getAttribute("dur");
        anim.setAttribute("data-dur", origDur);
      }
      var origDurMs = this.parseTime(origDur);

      // Update duration
      if (origDurMs !== null) {
        var newDurMs = origDurMs * scaleAmount;
        var newDurValue = newDurMs / 1000 + "s";
        if (anim.getAttribute("dur") != newDurValue) {
          anim.setAttribute("dur", newDurValue);
        }
      }
    },

    // Get all animations that are candidates for automatic scaling.
    getAnimations: function(contextNode) {
      if (typeof contextNode === "undefined")
        contextNode = this.doc;

      // Get all animations that loop indefinitely. Animations that don't look
      // indefinitely are likely "effects"--things like fading characters out or
      // temporarily showing things that shouldn't be scaled.
      //
      // In future we'll probably need to distinguish between animations where
      // we want to scale the duration only or the start time only etc.
      var candidates = contextNode.querySelectorAll(
                    'animate[repeatCount=indefinite],'
                  + 'animate[repeatDur=indefinite],'
                  + 'animateTransform[repeatCount=indefinite],'
                  + 'animateTransform[repeatDur=indefinite],'
                  + 'animateMotion[repeatCount=indefinite],'
                  + 'animateMotion[repeatDur=indefinite]');

      return Array.prototype.filter.call(candidates, isNotTemplateChild);
    },

    // Very simple time parsing: Only supports 's' and 'ms' times.
    // Returns a value in milliseconds
    parseTime: function(str) {
      if (!str)
        return null;
      var matches = str.match(/^\s*(-?[0-9.]+)(m?s)\s*$/);
      return matches
        ? parseFloat(matches[1]) * (matches[2] == "s" ? 1000 : 1)
        : null;
    },

    updateBeginTime: function(anim, newBeginTimeMs) {
      // This operation is quite expensive so make sure its necessary
      if ((anim.hasAttribute("begin") &&
           this.parseTime(anim.getAttribute("begin")) == newBeginTimeMs) ||
          !anim.hasAttribute("begin") && newBeginTimeMs == 0) {
        return anim;
      }

      var beginValue = (newBeginTimeMs / 1000) + "s";
      var isAttached = false;
      try {
        isAttached = !!anim.ownerSVGElement;
      } catch (e) { /* do nothing */ }
      if (isAttached) {
        // Clone the animation and update
        // (See comment in animationClone as to why this is necessary)
        var clone = this.animationClone(anim);
        clone.setAttribute("begin", beginValue);

        // Put this animation in the same place
        anim.parentNode.insertBefore(clone, anim);
        anim.parentNode.removeChild(anim);
        // XXX Need to kick-start Safari

        return clone;
      }

      // We haven't put the animation in the document yet so we can just
      // update the begin attribute directly.
      // (We're assuming here that we haven't just been temporarily removed
      // from the document.)
      anim.setAttribute("begin", beginValue);

      return anim;
    },

    animationClone: function(elem) {
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
        if (attrib.namespaceURI) {
          clone.setAttributeNS(attrib.namespaceURI, attrib.name,
                               attrib.value);
        } else {
          clone.setAttribute(attrib.name, attrib.value);
        }
      }

      // Clone children--generally animation elements don't have interesting
      // children so we can just clone them blindly
      for (var i = 0; i < elem.childNodes.length; i++) {
        clone.appendChild(elem.childNodes[i].cloneNode());
      }
      return clone;
    },

    getCharacterTemplates: function() {
      return this.doc.querySelectorAll('template .character,'
                                     + 'template.character');
    },

    instantiateTemplate: function(template, character) {
      // Clone node
      var instance = template.cloneNode(true /*deep*/);

      // Get fields to fill in
      var templateFields = this.getTemplateFields(character);

      // Walk through subtree and update fields
      var nodeIterator =
        document.createNodeIterator(instance, NodeFilter.SHOW_ELEMENT, null);
      var elem;
      while (elem = nodeIterator.nextNode()) {
        this.applyTemplateFields(elem, templateFields);
      }

      return instance;
    },

    getTemplateFields: function(character) {
      var beginTime = (character.x ? (character.x - 1) : 0) *
                      this.wallData.defaultDuration;
      return {
        id: character.charId,
        width: character.width,
        height: character.height,
        title: character.title,
        author: character.author,
        x: character.x,
        uri: character.rawUrl,
        dur: this.wallData.defaultDuration,
        durStr: (this.wallData.defaultDuration / 1000) + "s",
        begin: beginTime,
        beginStr: (beginTime / 1000) + "s"
      };
    },

    templateKeyRegex: new RegExp("{{(.+?)}}", "g"),

    applyTemplateFields: function(elem, fields) {
      var substitute = function(match, key) {
        return fields[key] || "";
      };

      for (var i = elem.attributes.length - 1; i >= 0; i--) {
        var attrib = elem.attributes[i];
        if (attrib.name.substring(0, 10) == 'data-tmpl-') {
          var name  = attrib.name.substring(10);
          var value = attrib.value.replace(this.templateKeyRegex, substitute);
          if (elem.namespaceURI == this.SVG_NS && name == "href") {
            elem.setAttributeNS(this.XLINK_NS, name, value);
          } else {
            elem.setAttribute(name, value);
          }
        }
      }
      // Remove template attributes
      for (var i = elem.attributes.length - 1; i >= 0; i--) {
        var attrib = elem.attributes[i];
        if (attrib.name.substring(0, 10) == 'data-tmpl-') {
        }
      }
      return elem;
    },

    // Safari has a bug where animations added dynamically don't get started so
    // we have to kick-start them
    kickStartSafari: function(instance) {
      console.assert(instance.ownerDocument,
        "Instance should be attached before this is called");
      var animations =
        instance.querySelectorAll("animate, animateMotion, animateTransform"
                                  + ", set");
      var wall = this;
      Array.prototype.forEach.call(animations,
        function(animation) {
          try {
            if (animation.getStartTime() === Infinity) {
              var startTime =
                wall.parseTime(animation.getAttribute("begin")) / 1000;
              if (startTime === null)
                startTime = 0;
              // XXX We might only need a call to beginElement here
              animation.beginElementAt(
                startTime - animation.ownerSVGElement.getCurrentTime());
            }
          } catch (e) { }
        });
    }
  });

  // Helpers

  // Don't apply to animations that are templates
  function isNotTemplateChild(candidate) {
    while (candidate = candidate.parentNode) {
      if (candidate.tagName == "template") {
        return false;
      }
    }
    return true;
  }
});
