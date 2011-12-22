var ParaPara = ParaPara || {};

ParaPara.SVG_NS   = "http://www.w3.org/2000/svg";
ParaPara.XLINK_NS = "http://www.w3.org/1999/xlink";

ParaPara.XHR_TIMEOUT = 8000;
ParaPara.UPLOAD_PATH = "../api/upload_anim.php";

// Return codes for sending animation
ParaPara.SEND_OK                 = 0;
ParaPara.SEND_ERROR_NO_ANIMATION = 1;
ParaPara.SEND_ERROR_TIMEOUT      = 2;
ParaPara.SEND_ERROR_FAILED_SEND  = 3;
ParaPara.SEND_ERROR_NO_ACCESS    = 4; // 404, cross-domain etc.
ParaPara.SEND_ERROR_SERVER_ERROR = 5; // Server rejects request

ParaPara.init = function(svgRoot) {
  ParaPara.svgRoot = svgRoot;
  ParaPara.drawControls  = new ParaPara.DrawControls();
  ParaPara.eraseControls = new ParaPara.EraseControls();
  ParaPara.frames        = new ParaPara.FrameList();
  ParaPara.currentStyle  = new ParaPara.Style();
  ParaPara.currentTool   = null;
}

ParaPara.reset = function(svgRoot) {
  ParaPara.frames.clearFrames();
  ParaPara.init(ParaPara.svgRoot);
}

ParaPara.addFrame = function() {
  ParaPara.frames.addFrame();
}

ParaPara.setDrawMode = function() {
  if (ParaPara.currentTool === ParaPara.drawControls)
    return;

  if (ParaPara.currentTool) {
    ParaPara.currentTool.disable();
  }
  ParaPara.drawControls.enable();
  ParaPara.currentTool = ParaPara.drawControls;
}

ParaPara.setEraseMode = function() {
  if (ParaPara.currentTool === ParaPara.eraseControls)
    return;

  if (ParaPara.currentTool) {
    ParaPara.currentTool.disable();
  }
  ParaPara.eraseControls.startErasing(ParaPara.frames.getCurrentFrame(), 10);
  ParaPara.currentTool = ParaPara.eraseControls;
}

ParaPara.animate = function(fps) {
  if (ParaPara.currentTool) {
    ParaPara.currentTool.disable();
    ParaPara.currentTool = null;
  }
  ParaPara.animator = new ParaPara.Animator(fps);
  ParaPara.animator.makeAnimation();
}

ParaPara.send = function(successCallback, failureCallback, title, author) {
  // Export animation
  console.assert(ParaPara.animator, "No animator found");
  var anim = ParaPara.animator.exportAnimation(title, author);
  if (!anim) {
    failureCallback(ParaPara.SEND_ERROR_NO_ANIMATION);
    return;
  }

  // Prepare payload
  var serializer = new XMLSerializer();
  var serializedAnim = serializer.serializeToString(anim);
  var payload =
    JSON.stringify({ title: title, author: author, svg: serializedAnim });

  // Create request
  var req = new XMLHttpRequest();
  req.open("POST", ParaPara.UPLOAD_PATH, true);

  // Set headers
  req.setRequestHeader("Content-Length", payload.length);
  req.setRequestHeader("Content-Type", "application/json");

  // Event listeners
  req.addEventListener("load",
    function(evt) {
      var xhr = evt.target;
      if (xhr.status == 200) {
        successCallback();
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
    req.send(payload);
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

ParaPara.DrawControls.prototype.enable = function() {
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
  this.frame = ParaPara.frames.getCurrentFrame();
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
  this.frame = ParaPara.frames.getCurrentFrame();
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

  const fixPrecision = ParaPara.fixPrecision;

  // XXX The following code is straight from SVG edit.
  // See if I can do a better job along the lines of:
  //   http://stackoverflow.com/questions/6621518/how-to-smooth-a-freehand-drawn-svg-path
  var N = points.numberOfItems;
  if (N > 4) {
    var curpos = points.getItem(0), prevCtlPt = null;
    var d = [];
    d.push("M" + [curpos.x,curpos.y].map(fixPrecision).join(",") + "C");
    for (var i = 1; i <= (N-4); i += 3) {
      var ct1 = points.getItem(i);
      var ct2 = points.getItem(i+1);
      var end = points.getItem(i+2);
      // if the previous segment had a control point, we want to smooth out
      // the control points on both sides
      if (prevCtlPt) {
        var newpts = this.smoothControlPoints( prevCtlPt, ct1, curpos );
        if (newpts && newpts.length == 2) {
          var prevArr = d[d.length-1].split(',');
          prevArr[2] = fixPrecision(newpts[0].x);
          prevArr[3] = fixPrecision(newpts[0].y);
          d[d.length-1] = prevArr.join(',');
          ct1 = newpts[1];
        }
      }
      d.push(
        [ct1.x,ct1.y,ct2.x,ct2.y,end.x,end.y].map(fixPrecision).join(','));
      curpos = end;
      prevCtlPt = ct2;
    }
    // handle remaining line segments
    d.push("L");
    for(;i < N;++i) {
      var pt = points.getItem(i);
      d.push([pt.x,pt.y].map(fixPrecision).join(","));
    }
    d = d.join(" ");

    // create new path element
    path.setAttribute("d", d);
  } else {
    console.assert(points.length >= 2, "Expected at least two points");
    // XXX For now just do fixed line segments
    var d =
      "M" +
      [points.getItem(0).x,points.getItem(0).y].map(fixPrecision).join(",") +
      "L";
    for (var i = 1; i < N; ++i) {
      var pt = points.getItem(i);
      d += [pt.x,pt.y].map(fixPrecision).join(",") + " ";
    }
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

ParaPara.FreehandLine.prototype.smoothControlPoints = function(ct1, ct2, pt) {
  // each point must not be the origin
  var x1 = ct1.x - pt.x,
    y1 = ct1.y - pt.y,
    x2 = ct2.x - pt.x,
    y2 = ct2.y - pt.y;

  if ( (x1 != 0 || y1 != 0) && (x2 != 0 || y2 != 0) ) {
    var anglea = Math.atan2(y1,x1),
      angleb = Math.atan2(y2,x2),
      r1 = Math.sqrt(x1*x1+y1*y1),
      r2 = Math.sqrt(x2*x2+y2*y2),
      nct1 = ParaPara.svgRoot.createSVGPoint(),
      nct2 = ParaPara.svgRoot.createSVGPoint();
    if (anglea < 0) { anglea += 2*Math.PI; }
    if (angleb < 0) { angleb += 2*Math.PI; }

    var angleBetween = Math.abs(anglea - angleb),
      angleDiff = Math.abs(Math.PI - angleBetween)/2;

    var new_anglea, new_angleb;
    if (anglea - angleb > 0) {
      new_anglea = angleBetween < Math.PI ? (anglea + angleDiff) : (anglea - angleDiff);
      new_angleb = angleBetween < Math.PI ? (angleb - angleDiff) : (angleb + angleDiff);
    }
    else {
      new_anglea = angleBetween < Math.PI ? (anglea - angleDiff) : (anglea + angleDiff);
      new_angleb = angleBetween < Math.PI ? (angleb + angleDiff) : (angleb - angleDiff);
    }

    // rotate the points
    nct1.x = r1 * Math.cos(new_anglea) + pt.x;
    nct1.y = r1 * Math.sin(new_anglea) + pt.y;
    nct2.x = r2 * Math.cos(new_angleb) + pt.x;
    nct2.y = r2 * Math.sin(new_angleb) + pt.y;

    return [nct1, nct2];
  }
  return undefined;
};

// -------------------- Styles --------------------

ParaPara.Style = function() {
  this.currentColor = "black";
  this.strokeWidth = 4;
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

// -------------------- Frame List --------------------

ParaPara.FrameList = function() {
  this.currentFrame = null;
  this.addFrame();
}

ParaPara.FrameList.prototype.getCurrentFrame = function() {
  return this.currentFrame;
}

ParaPara.FrameList.prototype.addFrame = function() {
  if (this.currentFrame) {
    this.currentFrame.setAttribute("class", "frame oldFrame");
  }
  var g = document.createElementNS(ParaPara.SVG_NS, "g");
  g.setAttribute("class", "frame");

  var scene = ParaPara.svgRoot.ownerDocument.getElementById("anim");
  scene.appendChild(g);
  this.currentFrame = g;
}

ParaPara.FrameList.prototype.getFrames = function() {
  var scene = ParaPara.svgRoot.ownerDocument.getElementById("anim");
  return scene.getElementsByClassName("frame");
}

ParaPara.FrameList.prototype.clearFrames = function() {
  var scene = ParaPara.svgRoot.ownerDocument.getElementById("anim");
  while (scene.hasChildNodes()) {
    scene.removeChild(scene.lastChild);
  }
}

// -------------------- Animator --------------------

ParaPara.Animator = function(fps) {
  this.dur = 1 / fps;
}

ParaPara.Animator.prototype.makeAnimation = function() {
  var frames = ParaPara.frames.getFrames();
  var lastId = "";

  // XXX If performance becomes an issue we might get some speed by making
  // each animation an independent infinitely repeating animation (with
  // appropriate use of values and keyTimes)

  // Drop final empty frames
  var framesLength = frames.length;
  for (var i = framesLength - 1;
       i >= 0 && frames[i].childNodes.length == 0;
       --i)
  {
    var frame = frames[i];
    if (frame.childNodes.length > 0)
      break;
    frame.parentNode.removeChild(frame);
    --framesLength;
  }

  if (framesLength < 2)
    return;

  for (var i = 0; i < framesLength; ++i) {
    var frame = frames[i];

    frame.classList.remove("oldFrame");
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
  if (framesLength) {
    var firstAnim = frames[0].getElementsByTagName("set")[0];
    firstAnim.setAttribute("begin", "0; " + lastId + ".end");
  }

  // Trigger animation
  ParaPara.svgRoot.setCurrentTime(0);
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
  var frames = ParaPara.frames.getFrames();
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
  var scene = ParaPara.svgRoot.ownerDocument.getElementById("anim");
  var anims = scene.getElementsByTagName("set");
  for (var i = 0; i < anims.length; ++i) {
    var anim = anims[i];
    anim.setAttribute("dur", this.dur + "s");
  }
}

// -------------------- Animator --------------------

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
