var ParaPara = ParaPara || {};

ParaPara.SVG_NS   = "http://www.w3.org/2000/svg";
ParaPara.XLINK_NS = "http://www.w3.org/1999/xlink";

ParaPara.XHR_TIMEOUT = 8000;

// Return codes for sending animation
ParaPara.SEND_OK                    = 0;
ParaPara.SEND_ERROR_NO_ANIMATION    = 1;
ParaPara.SEND_ERROR_TIMEOUT         = 2;
ParaPara.SEND_ERROR_FAILED_SEND     = 3;
ParaPara.SEND_ERROR_NO_ACCESS       = 4; // 404, cross-domain etc.
ParaPara.SEND_ERROR_SERVER_ERROR    = 5; // Server rejects request
ParaPara.SEND_ERROR_SERVER_NOT_LIVE = 6; // Server not accepting submissions

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
  ParaPara.currentTool   = null;
}

ParaPara.reset = function() {
  while (ParaPara.contentGroup.hasChildNodes()) {
    ParaPara.contentGroup.removeChild(ParaPara.contentGroup.lastChild);
  }
  ParaPara.init(ParaPara.contentGroup);
}

ParaPara.prevFrame = function() {
  var result = ParaPara.frames.prevFrame();
  ParaPara.currentTool.targetFrame(ParaPara.frames.getCurrentFrame());
  return result;
}

ParaPara.nextFrame = function() {
  var result = ParaPara.frames.nextFrame();
  ParaPara.currentTool.targetFrame(ParaPara.frames.getCurrentFrame());
  return result;
}

ParaPara.deleteFrame = function() {
  var result = ParaPara.frames.deleteFrame();
  ParaPara.currentTool.targetFrame(ParaPara.frames.getCurrentFrame());
  return result;
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
}

ParaPara.removeAnimation = function(fps) {
  if (ParaPara.animator) {
    ParaPara.animator.removeAnimation();
    ParaPara.animator = null;
  }
  ParaPara.editContent.removeAttribute("display");
  if (ParaPara.currentTool) {
    ParaPara.currentTool.targetFrame(ParaPara.frames.getCurrentFrame());
  }
}

// Returns "draw" | "erase" | "animate"
ParaPara.getMode = function(fps) {
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
    failureCallback(ParaPara.SEND_ERROR_NO_ANIMATION);
    return;
  }

  // Prepare payload
  var payloadObject = metadata;
  var serializer = new XMLSerializer();
  var serializedAnim = serializer.serializeToString(anim);
  payloadObject.svg = serializedAnim;
  payloadObject.y   = 0;
  var payload = JSON.stringify(payloadObject);

  // Prepare custom failure handler to translate "not_live" codes
  var paraparaFailureCallback = function(code, detail) {
    if (code == ParaPara.SEND_ERROR_SERVER_ERROR &&
        typeof(detail) != "undefined" &&
        detail.error_key == "not_live") {
      failureCallback(ParaPara.SEND_ERROR_SERVER_NOT_LIVE);
    } else {
      failureCallback(code);
    }
  }

  // Send
  ParaPara.sendAsyncRequest(uploadPath, payload, successCallback,
                            paraparaFailureCallback);

}

ParaPara.sendEmail = function(email, animationId, uploadPath, successCallback,
                              failureCallback) {
  // Prepare payload
  var payloadObject = { address: email, id: animationId };
  var payload = JSON.stringify(payloadObject);

  // Send
  ParaPara.sendAsyncRequest(uploadPath, payload, successCallback,
                            failureCallback);
}

ParaPara.sendAsyncRequest = function(url, json, successCallback,
                                     failureCallback) {
  // Create request
  var req = new XMLHttpRequest();
  req.open("POST", url, true);

  // Set headers
  req.setRequestHeader("Content-Length", json.length);
  req.setRequestHeader("Content-Type", "application/json");

  // Event listeners
  req.addEventListener("load",
    function(evt) {
      var xhr = evt.target;
      // 200 is for HTTP request, 0 is for local files (this allows us to test
      // without running a local webserver)
      if (xhr.status == 200 || xhr.status == 0) {
        try {
          var response = JSON.parse(xhr.responseText);
          if (response.error_key) {
            switch (response.error_key) {
              case "not_live":
                failureCallback(ParaPara.SEND_ERROR_SERVER_NOT_LIVE);
                break;

              default:
                console.log("Error sending to server, key: "
                  + response.error_key
                  + ", detail: \"" + response.error_detail + "\"");
                failureCallback(ParaPara.SEND_ERROR_SERVER_ERROR);
                break;
            }
          } else {
            successCallback(response);
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            console.log("Error sending to server, could not parse response: "
              + xhr.responseText);
            failureCallback(ParaPara.SEND_ERROR_SERVER_ERROR);
          } else {
            throw e;
          }
        }
      } else {
        console.debug(xhr);
        failureCallback(ParaPara.SEND_ERROR_NO_ACCESS);
      }
    }, false);
  req.addEventListener("error",
    function(evt) {
      failureCallback(ParaPara.SEND_ERROR_NO_ACCESS);
    }, false);

  // Send away
  try {
    req.send(json);
  } catch (e) {
    console.debug(e);
    failureCallback(ParaPara.SEND_ERROR_FAILED_SEND);
    return;
  }

  // Add timeout
  window.setTimeout(
    function() {
      if (req.readyState != 4) {
        req.abort();
        failureCallback(ParaPara.SEND_ERROR_TIMEOUT);
      }
    },
    ParaPara.XHR_TIMEOUT
  );
}

ParaPara.fixPrecision = function(x) { return x.toFixed(2); }

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
}

ParaPara.DrawControls.prototype.touchStart = function(evt) {
  evt.preventDefault();
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
  this.polyline = document.createElementNS(ParaPara.SVG_NS, "polyline");
  frame.appendChild(this.polyline);

  // Once Bug 629200 lands we should use the PointList API instead
  this.pts = [x,y].map(ParaPara.fixPrecision).join(",") + " ";
  this.polyline.setAttribute("points", this.pts);
  ParaPara.currentStyle.styleStroke(this.polyline);
}

ParaPara.FreehandLine.prototype.addPoint = function(x, y) {
  console.assert(this.polyline, "Adding point to finished/cancelled line?")
  this.pts += [x,y].map(ParaPara.fixPrecision).join(",") + " ";
  this.polyline.setAttribute("points", this.pts);
}

ParaPara.FreehandLine.prototype.finishLine = function() {
  console.assert(this.polyline, "Line already finished/cancelled?")
  var points = this.polyline.points;
  var path = this.createPathFromPoints(points);
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
  if (points.length == 1) {
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
  console.assert(points.length == 1, "Expected only one point");
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
  this.addFrame();
}

ParaPara.FrameList.prototype.getCurrentFrame = function() {
  return this.currentFrame;
}

ParaPara.FrameList.prototype.nextFrame = function() {
  // Move previous frame to oldFrames group
  var prevFrame = this.getPrevFrame();
  if (prevFrame) {
    this.getOrMakeOldFrames().appendChild(prevFrame);
  }

  // Make current frame to prevFrame
  if (this.currentFrame) {
    this.getOrMakePrevFrames().appendChild(this.currentFrame);
  }
  this.currentFrame = null;

  // Get next frame
  var addedFrame = false;
  if (this.getNextFrames()) {
    this.makeNextFrameCurrent();
  } else {
    this.addFrame();
    addedFrame = true;
  }

  var result = this.getFrameIndexAndCount();
  result.added = addedFrame;
  return result;
}

ParaPara.FrameList.prototype.addFrame = function() {
  var g = document.createElementNS(ParaPara.SVG_NS, "g");
  g.setAttribute("class", "frame");
  this.scene.insertBefore(g, this.getNextFrames());
  this.currentFrame = g;
}

ParaPara.FrameList.prototype.deleteCurrentFrame = function() {
  if (!this.currentFrame)
    return { index: 0, count: this.getFramesCount() };

}

ParaPara.FrameList.prototype.deleteFrame = function(index) {
  if (index < 0 || index >= this.getFrameCount() ||
      !this.currentFrame)
    return { index: 0, count: this.getFramesCount() };

  // Remove current frame
  this.currentFrame.parentNode.removeChild(this.currentFrame);
  this.currentFrame = null;

  // Try to use the next frame as the current frame,
  // otherwise revert to the previous frame,
  // or, failing that, just add a new frame.
  this.makeNextFrameCurrent() || this.makePrevFrameCurrent() || this.addFrame();
  return this.getFrameIndexAndCount();
}

ParaPara.FrameList.prototype.prevFrame = function() {
  var prevFrame = this.getPrevFrame();
  if (!prevFrame)
    return { index: 0, count: this.getFramesCount() };

  // Move current frame to next frames group
  var nextFrames = this.getOrMakeNextFrames();
  nextFrames.insertBefore(this.currentFrame, nextFrames.firstChild);
  this.currentFrame = null;

  // Make prev frame current
  this.makePrevFrameCurrent();
  return this.getFrameIndexAndCount();
}

ParaPara.FrameList.prototype.getFrames = function() {
  return this.scene.getElementsByClassName("frame");
}

// --------------- FrameList, internal helpers -------------

ParaPara.FrameList.prototype.getFrameIndexAndCount = function() {
  var index = this.getCurrentIndex();
  var numFrames = this.getFrameCount();
  return { index: index, count: numFrames };
}

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

// Reused frame shuffling

ParaPara.FrameList.prototype.makeNextFrameCurrent = function() {
  console.assert(this.currentFrame === null,
    "The current frame should be removed before calling makeNextFrameCurrent");
  var nextFrames = this.getNextFrames();
  if (!nextFrames)
    return false;

  // Update current frame
  this.currentFrame = nextFrames.firstChild;

  // Move to before nextFrames group
  this.scene.insertBefore(this.currentFrame, nextFrames);
  if (!nextFrames.hasChildNodes()) {
    nextFrames.parentNode.removeChild(nextFrames);
  }

  return true;
}

ParaPara.FrameList.prototype.makePrevFrameCurrent = function() {
  console.assert(this.currentFrame === null,
    "The current frame should be removed before calling makePrevFrameCurrent");

  var prevFrame = this.getPrevFrame();
  if (!prevFrame)
    return false;

  // Make prevFrame the currentFrame
  this.scene.insertBefore(prevFrame, this.getNextFrames());
  this.currentFrame = prevFrame;

  // Move last oldFrames to prevFrame pos
  var oldFrames = this.getOldFrames();
  if (oldFrames) {
    var prevFrames = this.getPrevFrames();
    prevFrames.appendChild(oldFrames.lastChild);
    if (!oldFrames.hasChildNodes())
      oldFrames.parentNode.removeChild(oldFrames);
  } else {
    console.assert(!this.getPrevFrames().hasChildNodes(),
      "Previous frames group has child nodes somehow");
    this.scene.removeChild(this.getPrevFrames());
  }

  return true;
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
    var id = "anim" + ParaPara.Utils.guid();
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
  this.animation.parentNode.removeChild(this.animation);
  this.animation = null;
}

ParaPara.Animator.prototype.exportAnimation = function(title, author) {
  // Create doc
  var doc =
    document.implementation.createDocument(ParaPara.SVG_NS, "svg", null);
  var svg = doc.documentElement;
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

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

    // We really should extend this by the stroke width... but that's kind of
    // complicated. Or we could just wait for SVG 2 ;)
    var bbox = frame.getBBox();
    minX = Math.floor(Math.min(minX, bbox.x));
    maxX = Math.ceil(Math.max(maxX, bbox.x + bbox.width));
    minY = Math.floor(Math.min(minY, bbox.y));
    maxY = Math.ceil(Math.max(maxY, bbox.y + bbox.height));

    svg.appendChild(doc.importNode(frame, true));
  }

  // Bound viewBox of animation by parent viewBox
  var parentViewBox = ParaPara.svgRoot.getAttribute("viewBox");
  console.assert(parentViewBox, "No parent viewBox");
  var parentViewBox = parentViewBox.split(" ");
  var minX = Math.max(minX, parentViewBox[0]);
  var maxX = Math.min(maxX, parentViewBox[0] + parentViewBox[2]);
  // Currently we set the y coordinates of the viewBox to those of the editor
  // workspace. This way, if for example, we have some ground in the background
  // of the editor, the author can line up their animation vertically with the
  // ground.
  var minY = parentViewBox[1];
  var maxY = parentViewBox[1] + parentViewBox[3];
  svg.setAttribute("viewBox", [minX, minY, maxX-minX, maxY-minY].join(" "));

  return doc;
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

// The following two functions courtesy of:
//   http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript

ParaPara.Utils.S4 = function() {
  return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}

ParaPara.Utils.guid = function() {
  var S4 = ParaPara.Utils.S4;
  return (S4()+S4()+S4()+S4()+S4()+S4()+S4()+S4());
}
