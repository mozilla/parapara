/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var GraphicalRadioGroup = function(form, radioname) {

  this.items = new Array();
  this.radioname = null;

  this.init = function(form, radioname) {
    this.radioname = radioname;

    // Populate list of radio buttons
    // (In future when Mutation Observers are more widely implemented we'll make
    //  this list reflect changes to the doc.)
    var radio =
      form.querySelectorAll("input[type=radio][name=\""+radioname+"\"]");
    for (var i = 0; i < radio.length; i++) {
      this.items.push(new GraphicalRadio(radio[i]));
    }
    this.update();

    // Register event handlers
    form.addEventListener('change', this.change.bind(this), false);
    form.addEventListener('reset', this.reset.bind(this), false);
  };

  this.change = function(evt) {
    if (evt.target.type && evt.target.type === 'radio' &&
        evt.target.name && evt.target.name === this.radioname) {
      this.update();
    }
  };
  this.reset = function(evt) {
    // The reset event fires *before* the resetting of the form actually occurs
    // but our update routine relies on syncing with the state of the form so we
    // delay calling it a moment.
    window.setTimeout(this.update.bind(this), 1);
    return true;
  };

  this.update = function() {
    for (var i = 0;i < this.items.length; i++) {
      this.items[i].update();
    }
  };

  this.init(form, radioname);
};

var GraphicalRadio = function(radio) {

  this.radio = radio;
  this.thumb = null;

  this.init = function() {
    this.thumb = this.getThumbForRadio(this.radio);
  };

  this.update = function() {
    if (this.radio.checked) {
      this.thumb.select();
    } else {
      this.thumb.unselect();
    }
  };

  this.getThumbForRadio = function(radio) {
    if (radio.thumb)
      return radio.thumb;

    // The basic arrangement is:
    //   <label>
    //     <input type="radio">
    //     <div class="designThumb"></div>
    //   </thumb>
    //
    // So we navigate up to the parent label and then down to the thumb
    var node = radio;
    while (node && node.tagName !== "LABEL") {
      node = node.parentNode;
    }
    var label = node;
    if (!label)
      return null;

    var thumbElem = label.querySelector(".designThumb");
    if (!thumbElem)
      return null;

    // For now we only support animated thumbs. In future we might support
    // other types and switch on class attribute.
    var thumb = new AnimatedThumb(thumbElem);
    radio.thumb = thumb;

    return thumb;
  };

  this.init();
};

// An element representing a thumbnail that is animated on selection or
// mouseover.
var AnimatedThumb = function(thumbElem) {

  this.thumbElem = thumbElem;
  this.anim      = null;

  this.init = function() {
    this.thumbElem.addEventListener('mouseover', this.mouseover.bind(this),
                                    false);
    this.thumbElem.addEventListener('mouseout', this.mouseout.bind(this),
                                    false);
    this.initAnim();
  };

  this.select = function() {
    this.thumbElem.classList.add("selected");
    this.unpause();
  };
  this.unselect = function() {
    this.thumbElem.classList.remove("selected");
    this.pause();
  };
  this.isSelected = function() {
    return this.thumbElem.classList.contains("selected");
  };

  this.pause = function() {
    if (this.anim) {
      this.anim.pauseAnimations();
    }
  };
  this.unpause = function() {
    if (this.anim) {
      this.anim.unpauseAnimations();
    }
  };

  this.mouseover = function() {
    this.unpause();
  };
  this.mouseout = function() {
    if (!this.isSelected())
      this.pause();
  };

  this.initAnim = function() {
    // Inside the thumb element we expect to find an <object> containing an
    // (animated) SVG element.
    var objects = this.thumbElem.getElementsByTagName("object");
    if (!objects.length)
      return;

    // Check if the content document has actually loaded yet
    // (Not sure what the correct behaviour here should be but some browsers
    // dispatch the load event before these documents are loaded.)
    var object = objects[0];
    if (!object.contentDocument ||
        object.contentDocument.readyState !== "complete") {
      object.addEventListener("load", this.initAnim.bind(this), false);
    } else {
      this.anim = object.contentDocument.documentElement;
      this.pause();
    }
  };

  this.init();
};
