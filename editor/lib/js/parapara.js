/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var ParaPara = ParaPara || {};

ParaPara.SVG_NS   = "http://www.w3.org/2000/svg";
ParaPara.XLINK_NS = "http://www.w3.org/1999/xlink";

// contentGroup is an empty <g> where ParaPara can add its content
ParaPara.init = function(contentGroup) {
  console.assert(!contentGroup.hasChildNodes(),
                 "Content group should be empty");
  ParaPara.contentGroup  = contentGroup;
  ParaPara.svgRoot       = ParaPara.contentGroup.ownerSVGElement;
  ParaPara.editContent   = document.createElementNS(ParaPara.SVG_NS, "g");
  ParaPara.contentGroup.appendChild(ParaPara.editContent);

  ParaPara.drawControls  = new ParaPara.DrawControls();
  ParaPara.eraseControls = new ParaPara.EraseControls();
  ParaPara.frames        = new ParaPara.FrameList();
  ParaPara.currentStyle  = new ParaPara.Style();
  ParaPara.history       = new ParaPara.HistoryManager();
  ParaPara.currentTool   = null;
}

ParaPara.reset = function() {
  while (ParaPara.contentGroup.hasChildNodes()) {
    ParaPara.contentGroup.removeChild(ParaPara.contentGroup.lastChild);
  }
  ParaPara.init(ParaPara.contentGroup);
}

ParaPara.appendFrame = function() {
  var result = ParaPara.frames.appendFrame();
  ParaPara.currentTool.targetFrame(ParaPara.frames.getCurrentFrame());
  ParaPara.history.add('insert', ParaPara.frames.getCurrentIndex());
  return result;
}

ParaPara.selectFrame = function(index) {
  var result = ParaPara.frames.selectFrame(index);
  ParaPara.currentTool.targetFrame(ParaPara.frames.getCurrentFrame());
  return result;
}

ParaPara.deleteFrame = function(index) {
  ParaPara.history.add('delete', index);
  var result = ParaPara.frames.deleteFrame(index);
  ParaPara.currentTool.targetFrame(ParaPara.frames.getCurrentFrame());
  return result;
}

ParaPara.getCurrentFrame = function(index) {
  var frame = ParaPara.frames.getCurrentFrame();
  var index = ParaPara.frames.getCurrentIndex();
  return { index: index, svg: frame };
}

ParaPara.setDrawMode = function() {
  if (ParaPara.currentTool === ParaPara.drawControls)
    return false;
  if (ParaPara.currentTool) {
    ParaPara.currentTool.disable();
  }
  ParaPara.drawControls.targetFrame(ParaPara.frames.getCurrentFrame());
  ParaPara.currentTool = ParaPara.drawControls;
  return true;
}

ParaPara.setEraseMode = function() {
  if (ParaPara.currentTool === ParaPara.eraseControls)
    return false;
  if (ParaPara.currentTool) {
    ParaPara.currentTool.disable();
  }
  ParaPara.eraseControls.targetFrame(ParaPara.frames.getCurrentFrame());
  ParaPara.currentTool = ParaPara.eraseControls;
  return true;
}

ParaPara.animate = function(fps) {
  if (ParaPara.currentTool) {
    ParaPara.currentTool.disable();
  }
  ParaPara.editContent.setAttribute("display", "none");
  ParaPara.animator = new ParaPara.Animator(fps, ParaPara.contentGroup);
  ParaPara.animator.makeAnimation();
  ParaPara.svgRoot.unpauseAnimations();
}

ParaPara.pauseAnimation = function() {
  if (ParaPara.animator) {
    ParaPara.svgRoot.pauseAnimations();
  }
}

ParaPara.resumeAnimation = function() {
  if (ParaPara.animator) {
    ParaPara.svgRoot.unpauseAnimations();
  }
}

ParaPara.removeAnimation = function() {
  if (ParaPara.animator) {
    ParaPara.animator.removeAnimation();
    ParaPara.animator = null;
    ParaPara.svgRoot.unpauseAnimations();
  }
  ParaPara.editContent.removeAttribute("display");
  if (ParaPara.currentTool) {
    ParaPara.currentTool.targetFrame(ParaPara.frames.getCurrentFrame());
  }
}

// Returns "draw" | "erase" | "animate"
ParaPara.getMode = function() {
  if (ParaPara.currentTool === ParaPara.drawControls)
    return "draw";
  if (ParaPara.currentTool === ParaPara.eraseControls)
    return "erase";
  if (ParaPara.animator)
    return "animate";
  // Must be still initialising, go to draw
  return "draw";
}

ParaPara.send = function(uploadPath, successCallback, failureCallback, metadata)
{
  // Export animation
  console.assert(ParaPara.animator, "No animator found");
  var anim = ParaPara.animator.exportAnimation(metadata.title, metadata.author);
  if (!anim) {
    failureCallback('no-animation');
    return;
  }

  // Prepare payload
  var payload = { metadata: metadata };
  var serializer = new XMLSerializer();
  var serializedAnim = serializer.serializeToString(anim.doc);
  payload.svg = serializedAnim;
  payload.metadata.groundOffset = anim.groundOffset;
  payload.metadata.width        = anim.width;
  payload.metadata.height       = anim.height;

  // Send
  ParaPara.postRequest(uploadPath, payload, successCallback, failureCallback);
}

ParaPara.sendEmail = function(address, url, locale,
                              successCallback, failureCallback) {
  var payload = { address: address, locale: locale };
  ParaPara.postRequest(url, payload, successCallback, failureCallback);
}

ParaPara.fixPrecision = function(x) { return x.toFixed(2); }

ParaPara.notifyGraphicChanged = function() {
  var changeEvent = document.createEvent("CustomEvent");
  changeEvent.initCustomEvent("changegraphic", true, true, {});
  ParaPara.svgRoot.dispatchEvent(changeEvent);
}

ParaPara.notifyHistoryChanged = function(history) {
  var changeEvent = document.createEvent("CustomEvent");
  changeEvent.initCustomEvent("changehistory", true, true, history);
  ParaPara.svgRoot.dispatchEvent(changeEvent);
}

// -------------------- Canvas event handling --------------------

ParaPara.DrawControls = function() {
  this.linesInProgress = new Object;
  this.frame = null;
  this.mouseDownHandler   = this.mouseDown.bind(this);
  this.mouseMoveHandler   = this.mouseMove.bind(this);
  this.mouseUpHandler     = this.mouseUp.bind(this);
  this.touchStartHandler  = this.touchStart.bind(this);
  this.touchMoveHandler   = this.touchMove.bind(this);
  this.touchEndHandler    = this.touchEnd.bind(this);
  this.touchCancelHandler = this.touchCancel.bind(this);
}

ParaPara.DrawControls.prototype.targetFrame = function(frame) {
  this.frame = frame;
  ParaPara.svgRoot.addEventListener("mousedown", this.mouseDownHandler, false);
  ParaPara.svgRoot.addEventListener("mousemove", this.mouseMoveHandler, false);
  ParaPara.svgRoot.addEventListener("mouseup", this.mouseUpHandler, false);
  ParaPara.svgRoot.addEventListener("touchstart", this.touchStartHandler,
                                    false);
  ParaPara.svgRoot.addEventListener("touchmove", this.touchMoveHandler, false);
  ParaPara.svgRoot.addEventListener("touchend", this.touchEndHandler, false);
  ParaPara.svgRoot.addEventListener("touchcancel", this.touchCancelHandler,
                                    false);
}

ParaPara.DrawControls.prototype.disable = function() {
  // For now we just stop listening to all events.
  // This might not be what we really want. For example, we might want to just
  // catch and ignore all events on this canvas (preventDefault) to avoid
  // surprises (e.g. it's probably somewhat counterintuitive if default actions
  // like scrolling suddenly start working).
  ParaPara.svgRoot.removeEventListener("mousedown", this.mouseDownHandler,
                                       false);
  ParaPara.svgRoot.removeEventListener("mousemove", this.mouseMoveHandler,
                                       false);
  ParaPara.svgRoot.removeEventListener("mouseup", this.mouseUpHandler, false);
  ParaPara.svgRoot.removeEventListener("touchstart", this.touchStartHandler,
                                       false);
  ParaPara.svgRoot.removeEventListener("touchmove", this.touchMoveHandler,
                                       false);
  ParaPara.svgRoot.removeEventListener("touchend", this.touchEndHandler, false);
  ParaPara.svgRoot.removeEventListener("touchcancel", this.touchCancelHandler,
                                       false);
}

ParaPara.DrawControls.prototype.mouseDown = function(evt) {
  evt.preventDefault();
  if (evt.button || this.linesInProgress.mouseLine)
    return;
  ParaPara.history.add('update', ParaPara.frames.getCurrentIndex());
  var pt = this.getLocalCoords(evt.clientX, evt.clientY, this.frame);
  this.linesInProgress.mouseLine =
    new ParaPara.FreehandLine(pt.x, pt.y, this.frame);
}

ParaPara.DrawControls.prototype.mouseMove = function(evt) {
  evt.preventDefault();
  if (!this.linesInProgress.mouseLine)
    return;
  var pt = this.getLocalCoords(evt.clientX, evt.clientY, this.frame);
  this.linesInProgress.mouseLine.addPoint(pt.x, pt.y);
}

ParaPara.DrawControls.prototype.mouseUp = function(evt) {
  evt.preventDefault();
  if (!this.linesInProgress.mouseLine)
    return;
  this.linesInProgress.mouseLine.finishLine();
  delete this.linesInProgress.mouseLine;
  ParaPara.notifyGraphicChanged();
}

ParaPara.DrawControls.prototype.touchStart = function(evt) {
  evt.preventDefault();
  ParaPara.history.add('update', ParaPara.frames.getCurrentIndex());
  for (var i = 0; i < evt.changedTouches.length; ++i) {
    var touch = evt.changedTouches[i];
    var pt = this.getLocalCoords(touch.clientX, touch.clientY, this.frame);
    this.linesInProgress[touch.identifier] =
      new ParaPara.FreehandLine(pt.x, pt.y, this.frame);
  }
}

ParaPara.DrawControls.prototype.touchMove = function(evt) {
  evt.preventDefault();
  for (var i = 0; i < evt.changedTouches.length; ++i) {
    var touch = evt.changedTouches[i];
    var pt = this.getLocalCoords(touch.clientX, touch.clientY, this.frame);
    console.assert(this.linesInProgress[touch.identifier],
      "Unexpected touch event");
    this.linesInProgress[touch.identifier].addPoint(pt.x, pt.y);
  }
}

ParaPara.DrawControls.prototype.touchEnd = function(evt) {
  evt.preventDefault();
  for (var i = 0; i < evt.changedTouches.length; ++i) {
    var touch = evt.changedTouches[i];
    console.assert(this.linesInProgress[touch.identifier],
      "Unexpected touch event");
    this.linesInProgress[touch.identifier].finishLine();
    delete this.linesInProgress[touch.identifier];
  }
  ParaPara.notifyGraphicChanged();
}

ParaPara.DrawControls.prototype.touchCancel = function(evt) {
  evt.preventDefault();
  for (var i = 0; i < evt.changedTouches.length; ++i) {
    var touch = evt.changedTouches[i];
    console.assert(this.linesInProgress[touch.identifier],
      "Unexpected touch event");
    this.linesInProgress[touch.identifier].cancelLine();
    delete this.linesInProgress[touch.identifier];
  }
}

ParaPara.DrawControls.prototype.getLocalCoords = function(x, y, elem) {
  var pt = ParaPara.svgRoot.createSVGPoint();
  pt.x = x;
  pt.y = y;

  var nodeMx = elem.parentNode.getScreenCTM();
  return pt.matrixTransform(nodeMx.inverse());
}

// -------------------- Freehand line --------------------

ParaPara.FreehandLine = function(x, y, frame) {
  // Create polyline element
  this.polyline = document.createElementNS(ParaPara.SVG_NS, "polyline");
  ParaPara.currentStyle.styleStroke(this.polyline);
  frame.appendChild(this.polyline);

  // Add an initial point
  var pt = ParaPara.svgRoot.createSVGPoint();
  pt.x = x;
  pt.y = y;
  this.polyline.points.appendItem(pt);
}

ParaPara.FreehandLine.prototype.addPoint = function(x, y) {
  console.assert(this.polyline, "Adding point to finished/cancelled line?")
  var pt = ParaPara.svgRoot.createSVGPoint();
  pt.x = x;
  pt.y = y;
  this.polyline.points.appendItem(pt);
}

ParaPara.FreehandLine.prototype.finishLine = function() {
  console.assert(this.polyline, "Line already finished/cancelled?")
  var path = this.createPathFromPoints(this.polyline.points);
  this.polyline.parentNode.appendChild(path);
  this.polyline.parentNode.removeChild(this.polyline);
  this.polyline = null;
}

ParaPara.FreehandLine.prototype.cancelLine = function() {
  console.assert(this.polyline, "Line already finished/cancelled?")
  this.polyline.parentNode.removeChild(this.polyline);
  this.polyline = null;
}

ParaPara.FreehandLine.prototype.createPathFromPoints = function(points) {
  if (points.numberOfItems == 1) {
    return this.createPoint(points);
  }

  var path = document.createElementNS(ParaPara.SVG_NS, "path");
  ParaPara.currentStyle.styleStroke(path);

  /*const*/ var fixPrecision = ParaPara.fixPrecision;

  if (points.numberOfItems == 2) {
    // Just make a straight-line segment
    var pt0 = points.getItem(0);
    var pt1 = points.getItem(1);
    var d = "M" + [pt0.x,pt0.y].map(fixPrecision).join(" ") +
            "L" + [pt1.x,pt1.y].map(fixPrecision).join(" ");
    path.setAttribute("d", d);
  } else {
    // Filter down the number of points
    points = this.prunePoints(points);
    // Then make it into a curve
    var pt0 = points[0];
    var d =
      "M" + [pt0.x,pt0.y].map(fixPrecision).join(" ") +
      "C" + this.smoothPoints(points).map(fixPrecision).join(" ");
    path.setAttribute("d", d);
  }

  return path;
}

ParaPara.FreehandLine.prototype.createPoint = function(points) {
  console.assert(points.numberOfItems === 1, "Expected only one point");
  var path = document.createElementNS(ParaPara.SVG_NS, "circle");
  path.setAttribute("r", ParaPara.currentStyle.strokeWidth / 2);
  path.setAttribute("cx", points.getItem(0).x);
  path.setAttribute("cy", points.getItem(0).y);
  ParaPara.currentStyle.styleFill(path);
  return path;
}

/*
 * Filters out points in the array according to a crude step function so
 * that arrays with few points are untouched by arrays with many points
 * are more aggressively pruned.
 */
ParaPara.FreehandLine.prototype.prunePoints = function(points) {
  var len = points.numberOfItems;
  // Step function:
  // < 10 items, don't prune
  // < 20 items, skip every second point
  // < 30 items, skip every 3rd
  var increment = (len < 20)
                ? (len < 10) ? 1 : 2 : 3;
  var filtered = [];
  for (var i=0; i < len-increment; i+=increment) {
    var pt = points.getItem(i);
    filtered.push( { x: pt.x, y: pt.y } );
  }
  // Always include the last point
  var last = points.getItem(len-1);
  filtered.push( { x: last.x, y: last.y } );
  return filtered;
}

ParaPara.FreehandLine.prototype.smoothPoints = function(points) {
  var pt0 = points[0];
  var curve = [pt0.x, pt0.y];
  var len = points.length;
  for (var i=1; i < len; i++) {
    var prev = points[i-1];
    var pt   = points[i];
    var next = points[(i < len-1) ? i+1 : i];

    var anglea = Math.atan2(prev.y-pt.y,prev.x-pt.x);
    var angleb = Math.atan2(next.y-pt.y,next.x-pt.x);
    var tangent = (anglea + angleb) / 2 + Math.PI / 2;
    var smoothness =
      ParaPara.Geometry.lineLength(pt.x, pt.y, next.x, next.y) / 3;
    if (anglea - angleb < 0) {
      tangent += Math.PI;
    }
    var cosR = Math.cos(tangent) * smoothness;
    var sinR = Math.sin(tangent) * smoothness;

    curve[curve.length] = pt.x+cosR;
    curve[curve.length] = pt.y+sinR;
    curve[curve.length] = pt.x;
    curve[curve.length] = pt.y;

    if (i < len-1) {
      curve[curve.length] = pt.x-cosR;
      curve[curve.length] = pt.y-sinR;
    }
  }
  return curve;
}

// -------------------- Styles --------------------

ParaPara.Style = function() {
  this.currentColor = "black";
  this.strokeWidth = 4;
  this._eraseWidth = 4;
}

ParaPara.Style.prototype.styleStroke = function(elem) {
  elem.setAttribute("stroke", this.currentColor);
  elem.setAttribute("stroke-width", this.strokeWidth);
  elem.setAttribute("stroke-linecap", "round");
  elem.setAttribute("fill", "none");
  elem.setAttribute("pointer-events", "none");
}

ParaPara.Style.prototype.styleFill = function(elem) {
  elem.setAttribute("fill", this.currentColor);
  elem.setAttribute("stroke", "none");
  elem.setAttribute("pointer-events", "none");
}

ParaPara.Style.prototype.__defineSetter__("eraseWidth", function(width) {
  this._eraseWidth = width;
  ParaPara.eraseControls.setBrushWidth(this._eraseWidth);
});

ParaPara.Style.prototype.__defineGetter__("eraseWidth", function() {
  return this._eraseWidth;
});

// -------------------- Frame List --------------------

// Frame hierarchy:
//
// <g id="anim">
//   <!-- Previous frames -->
//   <g class="prevFrames">
//     <!-- 0..n Old frames -->
//     <g class="oldFrames">
//       <g class="frame">..</g>
//       ..
//       <g class="frame">..</g>
//     </g>
//     <!-- 0..1 Previous frame -->
//     <g class="frame">..</g>
//   </g>
//   <!-- 0..1 Current frame -->
//   <g class="frame">..</g>
//   <g class="nextFrames">
//     <!-- 0..n Future frames -->
//     <g class="frame">..</g>
//     ..
//     <g class="frame">..</g>
//  </g>
// </g>
//
// At initialisation all that exists is:
//
// <g id="anim"/>
//
// The arrangement of previous frames is complex but it allows use of group
// opacity to produce a more subtle background.

ParaPara.FrameList = function() {
  this.currentFrame = null;
  this.scene = ParaPara.editContent;
  this.appendFrame();
}

ParaPara.FrameList.prototype.getCurrentFrame = function() {
  return this.currentFrame;
}

ParaPara.FrameList.prototype.appendFrame = function() {
  // Select last frame
  this.selectFrame(this.getFrameCount()-1);

  // Move previous frame to oldFrames group
  var prevFrame = this.getPrevFrame();
  if (prevFrame) {
    this.getOrMakeOldFrames().appendChild(prevFrame);
  }

  // Make current frame to prevFrame
  if (this.currentFrame) {
    this.getOrMakePrevFrames().appendChild(this.currentFrame);
  }

  // Append new frame
  var g = document.createElementNS(ParaPara.SVG_NS, "g");
  g.setAttribute("class", "frame");
  this.scene.appendChild(g);
  this.currentFrame = g;
}

ParaPara.FrameList.prototype.insertFrame = function(index, frame) {
  if (index < 0 || index >= this.getFrameCount() + 1 ||
      !this.currentFrame)
    return;

  var prevIndex = this.getCurrentIndex();
  this.selectFrame(0);
  
  var nextFrames = this.getOrMakeNextFrames();

  if (index === 0) {
    this.currentFrame.parentNode.replaceChild(frame, this.currentFrame);
    nextFrames.insertBefore(this.currentFrame, nextFrames.firstChild);
    this.currentFrame = frame;
  } else {
    if (!nextFrames.hasChildNodes()) {
      nextFrames.appendChild(frame);
    } else {
      nextFrames.insertBefore(frame, nextFrames.childNodes[index - 1]);
    }
  }

  // Now seek back to position
  if (index <= prevIndex)
    prevIndex++;
  this.selectFrame(prevIndex);
}

ParaPara.FrameList.prototype.selectFrame = function(index) {
  if (index < 0 || index >= this.getFrameCount() ||
      !this.currentFrame)
    return;

  var currIndex = this.getCurrentIndex();
  if (index === currIndex)
    return;

  if (index < currIndex) {
    // Going backwards
    var amountToMove = currIndex - index;

    // Move current frame to next frames group
    var nextFrames = this.getOrMakeNextFrames();
    nextFrames.insertBefore(this.currentFrame, nextFrames.firstChild);
    this.currentFrame = null;

    // Move prev frame
    if (amountToMove > 1) {
      nextFrames.insertBefore(this.getPrevFrame(), nextFrames.firstChild);
    } else {
      var prevFrame = this.getPrevFrame();
      this.scene.insertBefore(prevFrame, this.getNextFrames());
      this.currentFrame = prevFrame;
    }

    // Shift old frames forwards
    var oldFrames = this.getOldFrames();
    var prevFrames = this.getPrevFrames();
    while (amountToMove > 0) {
      if (!oldFrames || oldFrames.childNodes.length === 0)
        break;
      var frame = this.getOldFrames().lastChild;
      switch (amountToMove) {
        case 1:
          prevFrames.appendChild(frame);
          break;
        case 2:
          this.scene.insertBefore(frame, nextFrames);
          this.currentFrame = frame;
          break;
        default:
          nextFrames.insertBefore(frame, nextFrames.firstChild);
          break;
      }
      amountToMove--;
    }

    // Tidy up
    if (oldFrames && !oldFrames.hasChildNodes())
      oldFrames.parentNode.removeChild(oldFrames);
    if (prevFrames && !prevFrames.hasChildNodes())
      prevFrames.parentNode.removeChild(prevFrames);
  } else {
    // Going forwards
    var amountToMove = index - currIndex;

    // Move prev frame back to old frames
    var prevFrame = this.getPrevFrame();
    if (prevFrame) {
      this.getOrMakeOldFrames().appendChild(prevFrame);
    }

    // Move current frame back
    if (amountToMove > 1) {
      this.getOrMakeOldFrames().appendChild(this.currentFrame);
    } else {
      this.getOrMakePrevFrames().appendChild(this.currentFrame);
    }

    // Move next frames back
    var nextFrames = this.getNextFrames();
    while (amountToMove > 0) {
      if (!nextFrames || nextFrames.childNodes.length === 0)
        break;
      var frame = this.getNextFrames().firstChild;
      switch (amountToMove) {
        case 1:
          this.scene.insertBefore(frame, nextFrames);
          this.currentFrame = frame;
          break;
        case 2:
          this.getOrMakePrevFrames().appendChild(frame);
          break;
        default:
          this.getOrMakeOldFrames().appendChild(frame);
          break;
      }
      amountToMove--;
    }

    // Tidy up
    if (nextFrames && !nextFrames.hasChildNodes())
      nextFrames.parentNode.removeChild(nextFrames);
  }
}

ParaPara.FrameList.prototype.deleteFrame = function(index) {
  if (index < 0 || index >= this.getFrameCount() ||
      !this.currentFrame)
    return;

  // To make this easy, first, select the first frame, but store old selection
  // first so we can restore it
  var prevIndex = this.getCurrentIndex();
  this.selectFrame(0);

  // Now, the frame to delete is either in the nextFrames group or it's the
  // current frame
  if (index === 0) {
    this.currentFrame.parentNode.removeChild(this.currentFrame);
    this.currentFrame = null;
    var nextFrames = this.getNextFrames();
    if (!nextFrames) {
      // We're out of frames. Create a new one.
      this.appendFrame();
    } else {
      // Move the first frame into position
      var firstFrame = nextFrames.firstChild;
      this.scene.insertBefore(firstFrame, nextFrames);
      this.currentFrame = firstFrame;
    }
  } else {
    var nextFrames = this.getNextFrames();
    nextFrames.removeChild(nextFrames.childNodes[index - 1]);
  }

  // Tidy up
  var nextFrames = this.getNextFrames();
  if (nextFrames && !nextFrames.hasChildNodes())
    nextFrames.parentNode.removeChild(nextFrames);

  // Now seek back to position
  this.selectFrame(Math.min(prevIndex, this.getFrameCount()-1));
}

ParaPara.FrameList.prototype.getFrames = function() {
  return this.scene.getElementsByClassName("frame");
}

ParaPara.FrameList.prototype.getFrame = function(index) {
  if (index < 0 || index >= this.getFrameCount())
    return;
  
  return this.getFrames()[index];
}

// --------------- FrameList, internal helpers -------------

ParaPara.FrameList.prototype.getCurrentIndex = function() {
  return this.getOldFrames()
         ? this.getOldFrames().childNodes.length + 1
         : this.getPrevFrame() ? 1 : 0;
}

ParaPara.FrameList.prototype.getFrameCount = function() {
  return this.getFrames().length;
}

ParaPara.FrameList.prototype.getPrevFrame = function() {
  var prevFrames = this.getPrevFrames();
  return prevFrames ? prevFrames.lastChild : null;
}

// prevFrames group

ParaPara.FrameList.prototype.getPrevFrames = function() {
  return this._getPrevFrames(false);
}

ParaPara.FrameList.prototype.getOrMakePrevFrames = function() {
  return this._getPrevFrames(true);
}

ParaPara.FrameList.prototype._getPrevFrames = function(make) {
  return this._getOrMakeGroup(this.scene, true, "prevFrames", make);
}

// oldFrames group

ParaPara.FrameList.prototype.getOldFrames = function() {
  var prevFrames = this.getPrevFrames();
  if (!prevFrames)
    return null;
  return this._getOrMakeGroup(prevFrames, true, "oldFrames", false);
}

ParaPara.FrameList.prototype.getOrMakeOldFrames = function() {
  var prevFrames = this.getOrMakePrevFrames();
  return this._getOrMakeGroup(prevFrames, true, "oldFrames", true);
}

// nextFrames group

ParaPara.FrameList.prototype.getNextFrames = function() {
  return this._getNextFrames(false);
}

ParaPara.FrameList.prototype.getOrMakeNextFrames = function() {
  return this._getNextFrames(true);
}

ParaPara.FrameList.prototype._getNextFrames = function(make) {
  return this._getOrMakeGroup(this.scene, false, "nextFrames", make);
}

// Generic group handling
//
// Look for a child of 'parent' that is either the first or last child
// (depending on 'first') and has class 'className'. If not found and 'make' is
// true, create a <g> to match the criteria; otherwise return null
ParaPara.FrameList.prototype._getOrMakeGroup =
  function(parent, first, className, make) {
  var candidate = first ? parent.firstChild : parent.lastChild;
  if (candidate && candidate.classList.contains(className))
    return candidate;
  if (!make)
    return null;

  var g = document.createElementNS(ParaPara.SVG_NS, "g");
  g.setAttribute("class", className);
  return parent.insertBefore(g, first ? parent.firstChild : null);
}

// -------------------- Animator --------------------

ParaPara.Animator = function(fps, parent) {
  this.dur = 1 / fps;
  this.animation = document.createElementNS(ParaPara.SVG_NS, "g");
  parent.appendChild(this.animation);
}

ParaPara.Animator.prototype.makeAnimation = function() {
  var frames = ParaPara.frames.getFrames();
  var lastId = "";

  // Copy frames to animation
  for (var i = 0; i < frames.length; ++i) {
    var frame = frames[i];

    // Skip any final empty frames
    if (!frame.hasChildNodes())
      continue;

    this.animation.appendChild(frame.cloneNode(true));
  }
  frames = this.animation.childNodes;

  // We need at least 2 frames for animation
  if (frames.length < 2)
    return;

  for (var i = 0; i < frames.length; ++i) {
    var frame = frames[i];

    // Remove any styles due to a stylesheet since there won't be a stylesheet
    // in the combined animation
    frame.removeAttribute("class");
    frame.setAttribute("visibility", "hidden");

    // Add an animation
    var anim = document.createElementNS(ParaPara.SVG_NS, "set");
    anim.setAttribute("attributeName", "visibility");
    anim.setAttribute("to", "visible");
    anim.setAttribute("dur", this.dur + "s");
    var id = "anim" + ParaPara.Utils.uuid();
    anim.setAttribute("id", id);
    if (lastId) {
      anim.setAttribute("begin", lastId + ".end");
    }
    frame.appendChild(anim);
    lastId = id;
  }

  // Make the first animation get triggered by the last
  var firstAnim = frames[0].getElementsByTagName("set")[0];
  firstAnim.setAttribute("begin", "0; " + lastId + ".end");

  // Trigger animation
  ParaPara.svgRoot.setCurrentTime(0);
}

ParaPara.Animator.prototype.removeAnimation = function() {
  if (this.animation && this.animation.parentNode) {
    this.animation.parentNode.removeChild(this.animation);
  }
  this.animation = null;
}

ParaPara.Animator.prototype.exportAnimation = function(title, author) {
  // Create doc
  var doc =
    document.implementation.createDocument(ParaPara.SVG_NS, "svg", null);
  var svg = doc.documentElement;
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  // Pause the doc since if we don't, removing the style attribute later on (to
  // work around another Safari bug) will have no effect since the animation
  // will cause it to be added again.
  svg.pauseAnimations();

  // Add metadata
  if (title) {
    var titleElem = doc.createElementNS(ParaPara.SVG_NS, "title");
    titleElem.appendChild(doc.createTextNode(title));
    svg.appendChild(titleElem);
  }
  if (author) {
    var descElem = doc.createElementNS(ParaPara.SVG_NS, "desc");
    var desc = author + "さんより"; // What should go here?
    descElem.appendChild(doc.createTextNode(desc));
    svg.appendChild(descElem);
  }

  // Set up bounds of animation
  var minX = minY = Number.POSITIVE_INFINITY;
  var maxX = maxY = Number.NEGATIVE_INFINITY;

  // Copy frames to new doc
  var frames = this.animation.childNodes;
  if (!frames.length)
    return null;

  for (var i = 0; i < frames.length; ++i) {
    var frame = frames[i];
    console.assert(frame.childNodes.length,
      "Empty frames should have already been dropped");

    var bbox = this.getDecoratedBbox(frame);
    minX = Math.floor(Math.min(minX, bbox.x));
    maxX = Math.ceil(Math.max(maxX, bbox.x + bbox.width));
    minY = Math.floor(Math.min(minY, bbox.y));
    maxY = Math.ceil(Math.max(maxY, bbox.y + bbox.height));

    // Import and tweak
    //
    // Safari seems to serialise the animation state using the style attribute
    // (despite the fact that we are serializing the animation too meaning that
    // the serialized result doesn't match what you see on screen).
    //
    // Pretty soon half of the code in this project will be workarounds for
    // Safari bugs.
    var importedFrame = doc.importNode(frame, true);
    importedFrame.removeAttribute("style");

    svg.appendChild(importedFrame);
  }

  // Bound viewBox of animation by parent viewBox
  var parentViewBox = ParaPara.svgRoot.getAttribute("viewBox");
  console.assert(parentViewBox, "No parent viewBox");
  parentViewBox = parentViewBox.trim().split(" ").map(parseFloat);
  minX = Math.max(minX, parentViewBox[0]);
  maxX = Math.min(maxX, parentViewBox[0] + parentViewBox[2]);
  minY = Math.max(minY, parentViewBox[1]);
  maxY = Math.min(maxY, parentViewBox[1] + parentViewBox[3]);
  svg.setAttribute("viewBox", [minX, minY, maxX-minX, maxY-minY].join(" "));

  // Store the offset from the ground so we can line up the character with the
  // ground later even if the coordinate space of the combined animation is
  // quite different.
  var groundOffset =
    (parentViewBox[3] - maxY) / (parentViewBox[3] - parentViewBox[1]);

  // We store this in the metadata but we also return it and the bbox
  // width/height separately. This is because we go to display the animation
  // using an <image> element as part of a combined graphic, the DOM interface
  // in SVG 1.1 doesn't make it easy for us to query this metadata so we just
  // store it in the database as well and get it from there.
  // In SVG 2 hopefully we will have an <iframe> element with a contentDocument
  // we can use for this.
  svg.setAttribute("data-ground-offset", groundOffset.toFixed(3));

  return { doc: doc, groundOffset: groundOffset,
           width: maxX-minX, height: maxY-minY };
}

// A *very* rudimentary attempt to factor stroke width into the bounding box.
// Hopefully SVG 2 will provide this for us in the future.
ParaPara.Animator.prototype.getDecoratedBbox = function(frame) {
  // Get geometric bounding box
  var bbox = frame.getBBox();

  // Calculate max stroke width
  var maxStrokeWidth = 0;
  var geometryNodes = frame.querySelectorAll("path");
  for (var i = 0; i < geometryNodes.length; i++) {
    var strokeWidth =
      parseInt(window.getComputedStyle(geometryNodes[i]).strokeWidth);
    maxStrokeWidth = Math.max(maxStrokeWidth, strokeWidth);
  }

  // Enlarge geometric bounding box by half the max stroke-width on each side
  // (This doesn't take into account miters and so on but we're using round line
  //  joins so we should be ok)
  bbox.x -= maxStrokeWidth / 2;
  bbox.y -= maxStrokeWidth / 2;
  bbox.width  += maxStrokeWidth;
  bbox.height += maxStrokeWidth;

  return bbox;
}

ParaPara.Animator.prototype.setSpeed = function(fps) {
  this.dur = 1 / fps;
  var anims = this.animation.getElementsByTagName("set");
  for (var i = 0; i < anims.length; ++i) {
    var anim = anims[i];
    anim.setAttribute("dur", this.dur + "s");
  }
}

// -------------------- Utils --------------------

ParaPara.Utils = {};

ParaPara.Utils.uuid = function() {
  // Strip -'s since they just make the id longer and also need to be escaped if
  // we put them in syncbase timing specs like "abc\-def.end"
  return UUID.generate().replace(/-/g,'');
}

// -------------------- History --------------------
ParaPara.HistoryManager = function() {
  this.MAX_STACK_SIZE = 50;
  this.undoStack = [];
  this.redoStack = [];
}

ParaPara.HistoryManager.prototype.do = function(history) {
  history.svg = history.svg.cloneNode(true);
  var selectIndex = history.index;
  switch (history.cmd) {
    case 'update':
      ParaPara.frames.selectFrame(history.index);
      ParaPara.editContent.replaceChild(history.svg, ParaPara.frames.getCurrentFrame());
      ParaPara.frames.currentFrame = history.svg;
      break;
    case 'insert':
      ParaPara.frames.insertFrame(history.index, history.svg);
      break;
    case 'delete':
      ParaPara.frames.deleteFrame(history.index);
      selectIndex = ParaPara.frames.getCurrentIndex();
      break;
  }
  ParaPara.selectFrame(selectIndex);
  ParaPara.notifyHistoryChanged(history);
}

ParaPara.HistoryManager.prototype.undo = function() {
  if (this.undoStack.length === 0)
    return;
  
  var undo = this.undoStack.pop();
  var cmd = undo.cmd;
  switch (cmd) {
    case 'update':
      // Store current frame
      this.add('update', undo.index, false);
      // Move stored frame from undoStack to redoStack
      this.redoStack.push(this.undoStack.pop());
      break;
    case 'insert':
      cmd = 'delete';
      this.redoStack.push(undo);
      break;
    case 'delete':
      cmd = 'insert';
      this.redoStack.push(undo);
      break;
  }
  this.do({ cmd: cmd, index: undo.index,  svg: undo.svg });
}

ParaPara.HistoryManager.prototype.redo = function() {
  if (this.redoStack.length === 0)
    return;
  
  var redo = this.redoStack.pop();
  switch (redo.cmd) {
    case 'update':
      this.add('update', redo.index, false);
      break;
    case 'insert':
    case 'delete':
      this.undoStack.push(redo);
      break;
  }
  this.do(redo);
}

ParaPara.HistoryManager.prototype.add = function(cmd, index, resetRedoStack) {
  if (this.undoStack.length >= this.MAX_STACK_SIZE) {
    this.undoStack.shift();
  }
  this.undoStack.push({ cmd: cmd, index: index, svg: ParaPara.frames.getFrame(index).cloneNode(true) });
  if (resetRedoStack !== false) {
    this.redoStack = [];
  }
}
