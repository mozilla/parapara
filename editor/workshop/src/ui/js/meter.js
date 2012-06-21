/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Javascript to drive the meter.svg file.
//
// We'd like to embed this in the SVG file itself but Fennec (version 9-ish)
// doesn't seem to dispatch touch events to the content inside <object> elements
// (although it does for mouse events) so we're left with two options:
// a) Move the SVG into the HTML
// b) Catch touch events on the <object> element itself and use them to drive
//    the SVG file.
//
// Since the events we're dealing with are very simple, (b) is feasible and
// neater than (a).
//
// Inside the SVG file we define the following methods on the document itself.
//
//   getLeft
//   getWidth
//   depressNeedle
//   releaseNeedle
//   moveNeedle
//
// Ultimately, this should probably be just rewritten along the lines of
// svgslider.js which is where this started anyway

Meter = function(min, max, step, object, onChangeHandler) {
  this.min             = min;
  this.max             = max;
  this.step            = step;
  this.range           = max - min;
  this.prevX           = undefined;
  this.value           = undefined;
  this.prevValue       = undefined;
  this.rawValue        = undefined;
  this.touchIdentifier = null;
  this.object          = object;
  this.svgDoc          = object.contentDocument;
  this.onChangeHandler = onChangeHandler;
  this.enabled         = true;

  // Register for events
  var seekListener = this.onSeekStart.bind(this);
  // Not sure if this is a bug in Fennec but it seems we need to register mouse
  // events on the contentDocument and touch events on the <object> element
  this.svgDoc.addEventListener('mousedown', seekListener, true);
  this.object.addEventListener('touchstart', seekListener, true);

  // Prepare listeners for later registration
  this.dragListener = this.onDrag.bind(this);
  this.dragEndListener = this.onDragEnd.bind(this);

  this.update();
}

Meter.prototype.disable = function() {
  this.enabled = false;
}

Meter.prototype.enable = function() {
  this.enabled = true;
}

Meter.prototype.setValue = function(value) {
  this.value = value;
  this.update();
}

Meter.prototype.getValue = function(value) {
  return this.value;
}

Meter.prototype.onDragStart = function(e) {
  if (e.button)
    return;
  e.preventDefault();

  var localX = this.getLocalX(e);
  if (localX === null)
    return;

  this.svgDoc.depressNeedle();
  this.rawValue = this.value;
  this.prevX = localX;

  this.svgDoc.addEventListener('mousemove', this.dragListener, true);
  this.object.addEventListener('touchmove', this.dragListener, true);
  this.svgDoc.addEventListener('mouseup', this.dragEndListener, true);
  this.object.addEventListener('touchend', this.dragEndListener, true);
}

Meter.prototype.onDrag = function(e) {
  e.preventDefault();
  var multiplier = this.svgDoc.getWidth() / this.range;
  if (!multiplier)
    return;

  var localX = this.getLocalX(e);
  if (localX === null)
    return;

  this.rawValue += (localX - this.prevX) / multiplier;
  this.prevX = localX;
  this.value = this.rawValue;
  this.update();
}

Meter.prototype.onDragEnd = function(e) {
  e.preventDefault();

  if (e.changedTouches) {
    for (var i = 0; i < e.changedTouches.length; ++i) {
      var touch = e.changedTouches[i];
      if (touch.identifier == this.touchIdentifier) {
        this.touchIdentifier = null;
        break;
      }
    }
    if (this.touchIdentifier)
      return;
  }

  this.svgDoc.releaseNeedle();

  this.svgDoc.removeEventListener('mousemove', this.dragListener, true);
  this.object.removeEventListener('touchmove', this.dragListener, true);
  this.svgDoc.removeEventListener('mouseup', this.dragEndListener, true);
  this.object.removeEventListener('touchend', this.dragEndListener, true);
}

Meter.prototype.onSeekStart = function(e) {
  if (!this.enabled || e.button)
    return;
  var multiplier = this.svgDoc.getWidth() / this.range;
  if (!multiplier)
    return;
  var localX = this.getLocalX(e);
  if (localX === null)
    return;
  var dev =
    localX - this.svgDoc.getLeft() - (this.value - this.min) * multiplier;
  // move needle to click location
  if (Math.abs(dev) > 20) {
    this.value -= -dev / multiplier;
    this.update();
  }
  this.onDragStart(e);
}

// Gets the x coord from either a MouseEvent or TouchEvent in the coordinate
// space of the root <svg> element
//
// For TouchEvents we further check if the identifier matches the touch we're
// tracking. If we're not tracking any touches then we start tracking the
// first one in the list.
//
// If the event doesn't correspond to a touch we're tracking, returns null.
Meter.prototype.getLocalX = function(e) {
  // First get the appropriate value from the event
  var clientX = null;
  if (e.changedTouches) {
    if (e.changedTouches.length && this.touchIdentifier === null) {
      var touch = e.changedTouches[0];
      clientX = touch.clientX;
      this.touchIdentifier = touch.identifier;
    } else {
      for (var i = 0; i < e.changedTouches.length; ++i) {
        var touch = e.changedTouches[i];
        if (touch.identifier == this.touchIdentifier) {
          clientX = touch.clientX;
          break;
        }
      }
    }
  } else {
    clientX = e.clientX;
  }
  if (!clientX)
    return clientX;
  // Then convert to local coordinate system
  var pt = this.svgDoc.documentElement.createSVGPoint();
  pt.x = clientX;
  pt.y = 0;
  var nodeMx = this.svgDoc.documentElement.getScreenCTM();
  var transformedPt = pt.matrixTransform(nodeMx.inverse());
  return transformedPt.x;
}

Meter.prototype.update = function() {
  this.calc();
  if (this.value == this.prevValue)
    return;
  var position = this.range ? (this.value - this.min) / this.range : 0;
  this.svgDoc.moveNeedle(position);
  if (this.onChangeHandler)
    this.onChangeHandler(this.value);
  this.prevValue = this.value;
}

// recalculates value property
Meter.prototype.calc = function() {
  if (this.value === undefined)
    this.value = (this.min + this.max) / 2;
  // snap to step intervals (WebKit sometimes does not - bug?)
  this.value =
    Math.round((this.value - this.min) / this.step) * this.step + this.min;
  if (this.value < this.min)
    this.value = this.min;
  else if (this.value > this.max)
    this.value = this.min + ~~(this.range / this.step) * this.step;
}
