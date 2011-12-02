var ParaPara = ParaPara || {};

ParaPara.SVG_NS   = "http://www.w3.org/2000/svg";
ParaPara.XLINK_NS = "http://www.w3.org/1999/xlink";

ParaPara.init = function(svgRoot) {
  ParaPara.svgRoot = svgRoot;
  ParaPara.controls = new ParaPara.CanvasEventHandler();
  ParaPara.frames = new ParaPara.FrameList();
}

// ------------- Javascript bind support for older browsers ------------------
//
// Code courtesy of:
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/
// Function/bind

if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - " +
                          "what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP ? this : oThis || window,
                           aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

// -------------------- Canvas event handling --------------------

ParaPara.CanvasEventHandler = function() {
  this.linesInProgress = new Object;
  this.frame = null;

  ParaPara.svgRoot.addEventListener("mousedown", this.mouseDown.bind(this));
  ParaPara.svgRoot.addEventListener("mousemove", this.mouseMove.bind(this));
  ParaPara.svgRoot.addEventListener("mouseup", this.mouseUp.bind(this));
  ParaPara.svgRoot.addEventListener("touchstart", this.touchStart.bind(this));
  ParaPara.svgRoot.addEventListener("touchmove", this.touchMove.bind(this));
  ParaPara.svgRoot.addEventListener("touchend", this.touchEnd.bind(this));
  ParaPara.svgRoot.addEventListener("touchcancel", this.touchCancel.bind(this));
}

ParaPara.CanvasEventHandler.prototype.mouseDown = function(evt) {
  evt.preventDefault();
  if (evt.button || this.linesInProgress.mouseLine)
    return;
  this.frame = ParaPara.frames.getCurrentFrame();
  if (!this.frame)
    return;
  var pt = this.getLocalCoords(evt.clientX, evt.clientY, this.frame);
  this.linesInProgress.mouseLine =
    new ParaPara.FreehandLine(pt.x, pt.y, this.frame);
}

ParaPara.CanvasEventHandler.prototype.mouseMove = function(evt) {
  evt.preventDefault();
  if (!this.linesInProgress.mouseLine)
    return;
  var pt = this.getLocalCoords(evt.clientX, evt.clientY, this.frame);
  this.linesInProgress.mouseLine.addPoint(pt.x, pt.y);
}

ParaPara.CanvasEventHandler.prototype.mouseUp = function(evt) {
  evt.preventDefault();
  if (!this.linesInProgress.mouseLine)
    return;
  this.linesInProgress.mouseLine.finishLine();
  delete this.linesInProgress.mouseLine;
}

ParaPara.CanvasEventHandler.prototype.touchStart = function(evt) {
  evt.preventDefault();
  this.frame = ParaPara.frames.getCurrentFrame();
  if (!this.frame)
    return;
  for (var i = 0; i < evt.changedTouches.length; ++i) {
    var touch = evt.changedTouches[i];
    var pt = this.getLocalCoords(touch.clientX, touch.clientY, this.frame);
    this.linesInProgress[touch.identifier] =
      new ParaPara.FreehandLine(pt.x, pt.y, this.frame);
  }
}

ParaPara.CanvasEventHandler.prototype.touchMove = function(evt) {
  evt.preventDefault();
  for (var i = 0; i < evt.changedTouches.length; ++i) {
    var touch = evt.changedTouches[i];
    var pt = this.getLocalCoords(touch.clientX, touch.clientY, this.frame);
    console.assert(this.linesInProgress[touch.identifier],
      "Unexpected touch event");
    this.linesInProgress[touch.identifier].addPoint(pt.x, pt.y);
  }
}

ParaPara.CanvasEventHandler.prototype.touchEnd = function(evt) {
  evt.preventDefault();
  for (var i = 0; i < evt.changedTouches.length; ++i) {
    var touch = evt.changedTouches[i];
    console.assert(this.linesInProgress[touch.identifier],
      "Unexpected touch event");
    this.linesInProgress[touch.identifier].finishLine();
    delete this.linesInProgress[touch.identifier];
  }
}

ParaPara.CanvasEventHandler.prototype.touchCancel = function(evt) {
  evt.preventDefault();
  for (var i = 0; i < evt.changedTouches.length; ++i) {
    var touch = evt.changedTouches[i];
    console.assert(this.linesInProgress[touch.identifier],
      "Unexpected touch event");
    this.linesInProgress[touch.identifier].cancelLine();
    delete this.linesInProgress[touch.identifier];
  }
}

ParaPara.CanvasEventHandler.prototype.getLocalCoords = function(x, y, elem) {
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
  this.pts = x + "," + y + " ";
  this.polyline.setAttribute("pointer-events", "none");
  this.polyline.setAttribute("points", this.pts);
  this.polyline.setAttribute("fill", "none");
  this.polyline.setAttribute("stroke-linecap", "round");
  this.polyline.setAttribute("stroke", "red");
  this.polyline.setAttribute("stroke-width", "4");
}

ParaPara.FreehandLine.prototype.addPoint = function(x, y) {
  console.assert(this.polyline, "Adding point to finished/cancelled line?")
  this.pts += x + "," + y + " ";
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
  path.setAttribute("pointer-events", "none");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke", "red");
  path.setAttribute("stroke-width", "4");

  // XXX The following code is straight from SVG edit.
  // See if I can do a better job along the lines of:
  //   http://stackoverflow.com/questions/6621518/how-to-smooth-a-freehand-drawn-svg-path
  var N = points.numberOfItems;
  if (N > 4) {
    var curpos = points.getItem(0), prevCtlPt = null;
    var d = [];
    d.push(["M",curpos.x,",",curpos.y," C"].join(""));
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
          prevArr[2] = newpts[0].x;
          prevArr[3] = newpts[0].y;
          d[d.length-1] = prevArr.join(',');
          ct1 = newpts[1];
        }
      }
      d.push([ct1.x,ct1.y,ct2.x,ct2.y,end.x,end.y].join(','));
      curpos = end;
      prevCtlPt = ct2;
    }
    // handle remaining line segments
    d.push("L");
    for(;i < N;++i) {
      var pt = points.getItem(i);
      d.push([pt.x,pt.y].join(","));
    }
    d = d.join(" ");

    // create new path element
    path.setAttribute("d", d);
  } else {
    console.assert(points.length >= 2, "Expected at least two points");
    // XXX For now just do fixed line segments
    var d = "M" + points.getItem(0).x + "," + points.getItem(0).y + "L";
    for (var i = 1; i < N; ++i) {
      var pt = points.getItem(i);
      d += pt.x + "," + pt.y + " ";
    }
    path.setAttribute("d", d);
  }

  return path;
}

ParaPara.FreehandLine.prototype.createPoint = function(points) {
  console.assert(points.length == 1, "Expected only one point");
  var path = document.createElementNS(ParaPara.SVG_NS, "circle");
  path.setAttribute("pointer-events", "none");
  path.setAttribute("fill", "red");
  path.setAttribute("stroke", "none");
  path.setAttribute("r", "3");
  path.setAttribute("cx", points.getItem(0).x);
  path.setAttribute("cy", points.getItem(0).y);
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

ParaPara.FrameList.prototype.finish = function() {
  this.currentFrame = null;
}

// -------------------- Animator --------------------

ParaPara.Animator = function(dur) {
  this.dur = dur;
}

ParaPara.Animator.prototype.makeAnimation = function() {
  var scene = ParaPara.svgRoot.ownerDocument.getElementById("anim");
  var frames = scene.getElementsByClassName("frame");
  var lastId = "";

  // XXX If performance becomes an issues we might get some speed by making
  // each animation an independent infinitely repeating animation (with
  // appropriate use of values and keyTimes)

  // XXX Special case handling for a single frame (or better still--a single
  // non-empty frame)
  for (var i = 0; i < frames.length; ++i) {
    var frame = frames[i];

    frame.classList.remove("oldFrame");
    frame.setAttribute("visibility", "hidden");

    // Skip empty frames
    // XXX Should we only do this if they are at the end??
    if (frame.childNodes.length == 0)
      continue;

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
  if (frames.length) {
    var firstAnim = frames[0].getElementsByTagName("set")[0];
    firstAnim.setAttribute("begin", "0; " + lastId + ".end");
  }

  // Trigger animation
  ParaPara.svgRoot.setCurrentTime(0);
}

ParaPara.Animator.prototype.setSpeed = function(dur) {
  this.dur = dur;
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
