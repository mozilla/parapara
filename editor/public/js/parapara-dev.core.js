// ------------- Javascript bind support for older browsers ------------------
//
// Code courtesy of:
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/
// Function/bind
// (Public domain)

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
;/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var ParaPara = ParaPara || {};

ParaPara.SVG_NS   = ParaPara.SVG_NS   || "http://www.w3.org/2000/svg";
ParaPara.XLINK_NS = ParaPara.XLINK_NS || "http://www.w3.org/1999/xlink";

if (typeof ParaPara.fixPrecision !== "function") {
  ParaPara.fixPrecision = function(x) { return x.toFixed(2); }
}

// -------------------- Eraser Controls --------------------

ParaPara.EraseControls = function() {
  this.eraser       = null;
  this.currentTouch = null;
  this.frame        = null;
  this.brushWidth   = undefined;
  this.prevX        = undefined;
  this.prevY        = undefined;

  this.mouseDownHandler   = this.mouseDown.bind(this);
  this.mouseMoveHandler   = this.mouseMove.bind(this);
  this.mouseUpHandler     = this.mouseUp.bind(this);
  this.touchStartHandler  = this.touchStart.bind(this);
  this.touchMoveHandler   = this.touchMove.bind(this);
  this.touchEndHandler    = this.touchEnd.bind(this);
  this.touchCancelHandler = this.touchEnd.bind(this);

  // The erase precision corresponds to the number of steps used to approximate
  // a cubic curve when looking for intersections.
  // This is currently set very low based on empirical testing.
  // Generally most hand-drawn paths seem to end up being made up of lots of
  // tiny segments. If we adjust the smoothing algorithm to produce less points
  // we might need to up this to get a more accurate result.
  if (ParaPara.erasePrecision === undefined) {
    ParaPara.erasePrecision = 1;
  }
}

ParaPara.EraseControls.prototype.targetFrame = function(frame) {
  console.assert(!this.eraser, "Already erasing?");
  this.frame = frame;
  this.brushWidth = 10;

  ParaPara.svgRoot.addEventListener("mousedown", this.mouseDownHandler);
  ParaPara.svgRoot.addEventListener("mousemove", this.mouseMoveHandler);
  ParaPara.svgRoot.addEventListener("mouseup", this.mouseUpHandler);
  ParaPara.svgRoot.addEventListener("touchstart", this.touchStartHandler);
  ParaPara.svgRoot.addEventListener("touchmove", this.touchMoveHandler);
  ParaPara.svgRoot.addEventListener("touchend", this.touchEndHandler);
  ParaPara.svgRoot.addEventListener("touchcancel", this.touchCancelHandler);

  this.prevX = undefined;
  this.prevY = undefined;
}

ParaPara.EraseControls.prototype.disable = function() {
  ParaPara.svgRoot.removeEventListener("mousedown", this.mouseDownHandler);
  ParaPara.svgRoot.removeEventListener("mousemove", this.mouseMoveHandler);
  ParaPara.svgRoot.removeEventListener("mouseup", this.mouseUpHandler);
  ParaPara.svgRoot.removeEventListener("touchstart", this.touchStartHandler);
  ParaPara.svgRoot.removeEventListener("touchmove", this.touchMoveHandler);
  ParaPara.svgRoot.removeEventListener("touchend", this.touchEndHandler);
  ParaPara.svgRoot.removeEventListener("touchcancel", this.touchCancelHandler);
}

ParaPara.EraseControls.prototype.setBrushWidth = function(brushWidth) {
  this.brushWidth = brushWidth;
}

ParaPara.EraseControls.prototype.mouseDown = function(evt) {
  evt.preventDefault();
  if (this.eraser)
    return;
  ParaPara.history.add('update', ParaPara.frames.getCurrentIndex());
  this.eraser = new ParaPara.Eraser(this.frame, this.brushWidth);
  this.eraseFromEvent(evt);
}

ParaPara.EraseControls.prototype.mouseMove = function(evt) {
  evt.preventDefault();
  if (!this.eraser)
    return;
  this.eraseFromEvent(evt);
}

ParaPara.EraseControls.prototype.mouseUp = function(evt) {
  evt.preventDefault();
  if (!this.eraser)
    return;
  this.eraser = null;
  this.prevX = this.prevY = undefined;
  ParaPara.notifyGraphicChanged();
}

ParaPara.EraseControls.prototype.touchStart = function(evt) {
  evt.preventDefault();
  if (this.eraser)
    return;
  ParaPara.history.add('update', ParaPara.frames.getCurrentIndex());
  this.currentTouch = evt.changedTouches[0].identifier;
  this.eraser = new ParaPara.Eraser(this.frame, this.brushWidth);
  this.eraseFromEvent(evt);
}

ParaPara.EraseControls.prototype.touchMove = function(evt) {
  evt.preventDefault();
  if (!this.eraser)
    return;
  this.eraseFromEvent(evt);
}

ParaPara.EraseControls.prototype.touchEnd = function(evt) {
  evt.preventDefault();
  if (!this.eraser)
    return;

  for (var i = 0; i < evt.changedTouches.length; ++i) {
    var touch = evt.changedTouches[i];
    if (touch.identifier == this.currentTouch) {
      this.currentTouch = null;
      break;
    }
  }
  if (this.currentTouch) // Didn't get a match
    return;

  this.eraser = null;
  this.prevX = this.prevY = undefined;
  ParaPara.notifyGraphicChanged();
}

ParaPara.EraseControls.prototype.eraseFromEvent = function(evt) {
  console.assert(this.eraser, "No eraser to use");

  var coords = this.getCoordsFromEvent(evt);
  if (!coords)
    return;

  var candidateShapes = [];
  var pt = this.getLocalCoords(coords[0], coords[1], this.frame);

  candidateShapes = this.getCandidateShapes(pt.x, pt.y);
  var ids = [];
  for (var i = 0; i < candidateShapes.length; i++) {
    ids.push(candidateShapes[i].id);
  }

  this.eraser.erase(pt.x, pt.y, candidateShapes);

  this.prevX = pt.x;
  this.prevY = pt.y;
}

ParaPara.EraseControls.prototype.getCoordsFromEvent = function(evt) {
  // Mouse events
  if (!evt.changedTouches) {
    return [ evt.clientX, evt.clientY ];
  // Touches
  } else {
    for (var i = 0; i < evt.changedTouches.length; ++i) {
      var touch = evt.changedTouches[i];
      if (touch.identifier == this.currentTouch)
        return [ touch.clientX, touch.clientY ];
    }
  }
  return null;
}

ParaPara.EraseControls.prototype.getCandidateShapes = function(x, y) {
  // Go through shapes backwards so we return a list from top to bottom
  var shapes = this.frame.childNodes;
  var hitShapes = [];
  for (var i = shapes.length-1; i >= 0; --i) {
    var shape = shapes[i];
    // (Unfortunately WebKit doesn't seem to support 'children' for SVG content
    if (shape.nodeType != Node.ELEMENT_NODE)
      continue;

    // Extend the shape by the brush width
    var shapeBBox = shape.getBBox();
    shapeBBox.x      -= this.brushWidth / 2;
    shapeBBox.y      -= this.brushWidth / 2;
    shapeBBox.width  += this.brushWidth;
    shapeBBox.height += this.brushWidth;

    // Currently erasing of dots (circle elements) depends on this being pretty
    // accurate. If we ever tweak this so that it sometimes returns circle
    // elements that weren't actually hit then we need to update
    // Eraser.cutCircle to do property hit testing there
    var intersects =
      this.prevX
      ? ParaPara.Geometry.lineIntersectsRect([this.prevX, this.prevY, x, y],
                                             shapeBBox)
      : ParaPara.Geometry.rectContainsPoint(shapeBBox, [x,y]);
    if (intersects) {
      hitShapes.push(shape);
    }
  }

  return hitShapes;
}

ParaPara.EraseControls.prototype.getLocalCoords = function(x, y, elem) {
  var pt = ParaPara.svgRoot.createSVGPoint();
  pt.x = x;
  pt.y = y;

  var nodeMx = elem.parentNode.getScreenCTM();
  return pt.matrixTransform(nodeMx.inverse());
}

// ----------------------- Eraser --------------------------

ParaPara.Eraser = function(frame, brushWidth) {
  this.prevX        = undefined;
  this.prevY        = undefined;
  this.brushWidth   = brushWidth;
  this.currentScale = frame.getScreenCTM().a;
}

ParaPara.Eraser.prototype.erase = function(x, y, candidateShapes) {
  var brush =
    new ParaPara.Brush(this.prevX ? [this.prevX, this.prevY, x, y] : [x, y])
  var scaledBrushWidth = this.brushWidth / this.currentScale;
  var len = candidateShapes.length;
  for (var i = 0; i < len; ++i) {
    var shape = candidateShapes[i];
    if (shape.tagName == "path") {
      // Since the line will have stroke-linecap:round, we need to make
      // the brushWidth a bit larger to account for the space taken up by
      // the rounded ends of the cut line
      var strokeWidth = parseFloat(window.getComputedStyle(shape, null).
                          getPropertyValue("stroke-width", null));
      var effectiveBrushWidth = scaledBrushWidth + strokeWidth;
      brush.setWidth(effectiveBrushWidth);
      this.cutPath(brush, shape);
    } else if (shape.tagName == "circle") {
      this.cutCircle(brush, shape);
    } else {
      console.assert(false, "Got unexpected shape type: " + shape.tagName);
    }
  }

  this.prevX = x;
  this.prevY = y;
}

ParaPara.Eraser.prototype.cutPath = function(brush, path) {

  var segList = path.pathSegList;
  var currentPoint = undefined;
  var didCut = false;
  var segObjects = new Array();

  for (var i=0; i < segList.numberOfItems; ++i) {
    var seg = segList.getItem(i);
    var newSeg = this.getSegObject(seg, currentPoint);
    var cutSegments = newSeg.cut(brush);
    if (cutSegments != newSeg)
      didCut = true;
    segObjects = segObjects.concat(cutSegments);
    currentPoint = { x: seg.x, y: seg.y };
  }

  if (didCut) {
    segObjects = segObjects.filter(ParaPara.Eraser.filterSuperfluousMoveTo);
    if (!segObjects.length) {
      path.parentNode.removeChild(path);
    } else {
      var d = segObjects.join("");
      path.setAttribute("d", d);
    }
  }

  return didCut;
}

ParaPara.Eraser.filterSuperfluousMoveTo =
function(command, index, array) {
  if (command.constructor != ParaPara.MoveToSegment)
    return true;

  // Allow move to commands that:
  // - are not last in the array
  // - are not followed by another move to command
  return index < array.length - 1 &&
         array[index+1].constructor != ParaPara.MoveToSegment;
}

ParaPara.Eraser.prototype.getSegObject =
function(segment, currentPoint) {
  switch (segment.pathSegType) {
    case SVGPathSeg.PATHSEG_MOVETO_ABS:
      return new ParaPara.MoveToSegment([segment.x, segment.y]);

    case SVGPathSeg.PATHSEG_LINETO_ABS:
      return new ParaPara.LineToSegment([currentPoint.x, currentPoint.y,
                                         segment.x, segment.y]);

    case SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
      return new ParaPara.CurveToSegment([currentPoint.x, currentPoint.y,
                                          segment.x1, segment.y1,
                                          segment.x2, segment.y2,
                                          segment.x, segment.y]);
    default:
      console.assert(false, "Unexpected path segment type: " +
        segment.pathSegType);
      break;
  }
}

ParaPara.Eraser.prototype.cutCircle = function(brush, circle) {
  // Currently getCandidateShapes does a reasonably good job of only choosing
  // circles where we have a hit so for now we just rely on it.
  //
  // If that changes then a couple of possible strategies are:
  // A) Do as with getCandidateShapes---just enlarge the bbox of the circle by
  //    the brush width and then look for an intersection with the line the
  //    brush represents
  // B) Just test the two long sides of the brush and see if they intersect with
  //    the bbox of the circle.
  //    The fastest way to do this is to position the bbox of the circle at 0,0
  //    and use intersectsWithZeroedRect.
  //    To do that just transform the points of the brush by the negative offset
  //    of the top-left of the circle
  //    var radius = parseFloat(circle.getAttribute("r")) * 2;
  //    var xDisp = parseFloat(circle.getAttribute("cx")) - radius;
  //    var yDisp = parseFloat(circle.getAttribute("cy")) - radius;
  //    ...
  circle.parentNode.removeChild(circle);
}

// ----------------------- Brush ---------------------------

ParaPara.Brush = function(points)
{
  console.assert(points instanceof Array &&
                 points.length == 2 || points.length == 4,
                 "Unexpected brush dimensions");
  this.points = points;
  this.bbox   = null;
  this.width  = undefined;
  this.length = undefined;
  this.path   = [];
  this.mx     = null;
  this.angle  = this.points.length == 2
              ? 0
              : Math.atan2(this.points[3]-this.points[1],
                           this.points[2]-this.points[0]);
}

ParaPara.Brush.prototype.setWidth = function(width)
{
  if (this.width == width)
    return;

  this.width = width;
  if (this.points.length == 2) {
    var disp = this.width / Math.SQRT2 / 2;
    this.path = [ this.points[0]-disp, this.points[1]-disp,
                  this.points[0]+disp, this.points[1]-disp,
                  this.points[0]+disp, this.points[1]+disp,
                  this.points[0]-disp, this.points[1]+disp ];
    this.length = disp * 2;
  } else {
    // Extent to extend the line's width
    var xA = Math.cos(this.angle-Math.PI/2) * this.width / 2;
    var yA = Math.sin(this.angle-Math.PI/2) * this.width / 2;
    // Extent to extend the line's length
    var xB = Math.cos(this.angle) * this.width / 2;
    var yB = Math.sin(this.angle) * this.width / 2;
    this.path = [];
    this.path.push(this.points[0]+xA-xB);
    this.path.push(this.points[1]+yA-yB);
    this.path.push(this.points[0]-xA-xB);
    this.path.push(this.points[1]-yA-yB);
    this.path.push(this.points[2]-xA+xB);
    this.path.push(this.points[3]-yA+yB);
    this.path.push(this.points[2]+xA+xB);
    this.path.push(this.points[3]+yA+yB);
    this.length =
      ParaPara.Geometry.lineLength(this.points[0], this.points[1],
                                   this.points[2], this.points[3]) + this.width;
  }
  this.bbox = null;
}

ParaPara.Brush.prototype.getDimensions = function(width)
{
  if (this.points.length == 2) {
    // For point brushes we actually make the brush outline such that the
    // diagonal length of the square matches the brush width.
    // So here we return the length for both dimensions which corresponds to the
    // width and height of the brush outline square.
    return { width: this.length, length: this.length };
  } else {
    // Otherwise, the dimensions we return are width x height, which for
    // a stroke running along the x-axis are actually length x width
    return { width: this.width, length: this.length };
  }
}

ParaPara.Brush.prototype.getBBox = function(width)
{
  if (this.bbox)
    return this.bbox;

  var x = Math.min(this.path[0], this.path[2], this.path[4], this.path[6]);
  var y = Math.min(this.path[1], this.path[3], this.path[5], this.path[7]);
  var maxX = Math.max(this.path[0], this.path[2], this.path[4], this.path[6]);
  var maxY = Math.max(this.path[1], this.path[3], this.path[5], this.path[7]);
  this.bbox = { x: x, y: y, width: maxX - x, height: maxY - y };
  return this.bbox;
}

ParaPara.Brush.prototype.getTransform = function()
{
  if (this.mx)
    return this.mx;

  if (this.points.length == 2) {
    this.mx = ParaPara.svgRoot.createSVGMatrix();
    this.mx = this.mx.translate(-this.path[0], -this.path[1]);
  } else {
    var angle = this.angle * 180 / Math.PI;
    this.mx = ParaPara.svgRoot.createSVGMatrix();
    this.mx = this.mx.rotate(-angle, 0, 0);
    this.mx = this.mx.translate(-this.path[0], -this.path[1]);
  }
  return this.mx;
}

// Transforms a two element array by the transform in getTransform
ParaPara.Brush.prototype.transformPoint = function(point)
{
  var mx = this.getTransform();
  if (!mx)
    return point.slice();

  var dx = mx.a * point[0] + mx.c * point[1] + mx.e;
  var dy = mx.b * point[0] + mx.d * point[1] + mx.f;
  return [dx, dy];
}

// Transforms an even numbered array of coordinates by the transform in
// getTransform
ParaPara.Brush.prototype.transformPoints = function(points)
{
  var mx = this.getTransform();
  if (!mx) {
    return points.slice();
  }

  var transformed = [];
  for (var i=0; i < points.length; i+=2) {
    var result = this.transformPoint(points.slice(i,i+2));
    transformed.push(result[0], result[1]);
  }
  return transformed;
}

// ---------------------- Geometry -------------------------

ParaPara.Geometry = {};

// Based on intersectsLineLine from:
//   http://processingjs.nihongoresources.com/bezierinfo/
// by Mike "Pomax" Kamermans, 2011
// Permission granted to license as MPL 2.0
ParaPara.Geometry.linesIntersect = function(line1, line2) {
  var x1 = line1[0]; var y1 = line1[1];
  var x2 = line1[2]; var y2 = line1[3];
  var x3 = line2[0]; var y3 = line2[1];
  var x4 = line2[2]; var y4 = line2[3];

  var nx = (x1*y2 - y1*x2)*(x3-x4) - (x1-x2)*(x3*y4 - y3*x4);
  var ny = (x1*y2 - y1*x2)*(y3-y4) - (y1-y2)*(x3*y4 - y3*x4);
  var denominator = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);

  // If the lines are parallel, there is no real 'intersection',
  // and if they are colinear, the intersection is an entire line,
  // rather than a point. return "null" in both cases.
  if (denominator==0) { return null; }
  // if denominator isn't zero, there is an intersection, and it's
  // a single point.
  var px = nx/denominator;
  var py = ny/denominator;
  return [px, py];
}

ParaPara.Geometry.segmentsIntersect = function(line1, line2) {
  var isBetween = ParaPara.Geometry.isBetween;
  var pt = ParaPara.Geometry.linesIntersect(line1, line2);
  return pt && isBetween(pt[0], line1[0], line1[2]) &&
               isBetween(pt[0], line2[0], line2[2]) &&
               isBetween(pt[1], line1[1], line1[3]) &&
               isBetween(pt[1], line2[1], line2[3])
         ? pt
         : null;
}

ParaPara.Geometry.lineIntersectsRect = function(line, rect) {
  // Convert rect to coords
  var coords = [ rect.x, rect.y,
                 rect.x + rect.width, rect.y,
                 rect.x + rect.width, rect.y + rect.height,
                 rect.x, rect.y + rect.height ];

  // Check for a point inside the rect
  if ((line[0] >= coords[0] && line[0] <= coords[4] &&
       line[1] >= coords[1] && line[1] <= coords[5]) ||
      (line[2] >= coords[0] && line[2] <= coords[4] &&
       line[3] >= coords[1] && line[3] <= coords[5])) {
    return true;
  }

  for (var i=0; i<4; ++i) {
    var line2 = i < 3 ? coords.slice(i*2, i*2+4)
                      : coords.slice(i*2, i*2+2).concat(coords.slice(0,2));
    if (ParaPara.Geometry.segmentsIntersect(line, line2))
      return true;
  }
  return false;
}

// Returns intersections between line and a rectangle at (0, 0, width, height)
ParaPara.Geometry.intersectsWithZeroedRect = function(line, width, height) {

  var intercepts = [];
  var m = (line[3] - line[1]) / (line[2] - line[0]);

  // Calculate bounds for checking a potential intersection actually lies within
  // the bounds of both segments
  var minX, maxX, minY, maxY;
  if (line[0] < line[2]) {
    minX = Math.max(0, line[0]);
    maxX = Math.min(width, line[2]);
  } else {
    minX = Math.max(0, line[2]);
    maxX = Math.min(width, line[0]);
  }
  if (minX >= maxX)
    return intercepts;
  if (line[1] < line[3]) {
    minY = Math.max(0, line[1]);
    maxY = Math.min(height, line[3]);
  } else {
    minY = Math.max(0, line[3]);
    maxY = Math.min(height, line[1]);
  }
  if (minY >= maxY)
    return intercepts;

  // First intercepts with the vertical edges
  var xIntercepts = [ 0, width ];
  for (var i = 0; m != Infinity && i < xIntercepts.length; ++i) {
    var x = xIntercepts[i];
    var y = m * (x-line[0]) + line[1];
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      intercepts.push([x, y]);
    }
  }

  // Intercepts with the horizontal edges
  var yIntercepts = [ 0, height ];
  for (var i = 0; m != 0 && i < yIntercepts.length; ++i) {
    var y = yIntercepts[i];
    var x = 1.0/m * (y-line[1]) + line[0];
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      intercepts.push([x, y]);
    }
  }

  return intercepts;
}

ParaPara.Geometry.rectsIntersect = function(rectA, rectB) {
  return !(rectA.x + rectA.width <= rectB.x ||
           rectA.x >= rectB.x + rectB.width ||
           rectA.y + rectA.height <= rectB.y ||
           rectA.y >= rectB.y + rectB.height);
}

ParaPara.Geometry.rectContainsRect = function(rectA, rectB) {
  return rectB.x >= rectA.x &&
         rectB.x + rectB.width <= rectA.x + rectA.width &&
         rectB.y >= rectA.y &&
         rectB.y + rectB.height <= rectA.y + rectA.height;
}

ParaPara.Geometry.rectContainsLine = function(rect, line) {
  /*const*/ var rectContainsPoint = ParaPara.Geometry.rectContainsPoint;
  return rectContainsPoint(rect, [line[0], line[1]]) &&
         rectContainsPoint(rect, [line[2], line[3]]);
}

ParaPara.Geometry.rectContainsPoint = function(rect, point) {
  return rect.x <= point[0] &&
         point[0] <= rect.x + rect.width &&
         rect.y <= point[1] &&
         point[1] <= rect.y + rect.height;
}

ParaPara.Geometry.lineLength = function(x1, y1, x2, y2) {
  return Math.sqrt((x2 -= x1)*x2 + (y2 -= y1)*y2);
}

ParaPara.Geometry.isBetween = function (x, a, b) {
  /*const*/ var tolerance = 0.000001;
  return x >= Math.min(a, b) - tolerance && x <= Math.max(a, b) + tolerance;
}

ParaPara.Geometry.prettyMuchEqual = function(a, b) {
  /*const*/ var floatTolerance = 0.000001;
  return Math.abs(a-b) < floatTolerance;
}

// ==================== SEGMENT TYPES ======================

// -------------------- Move to segment --------------------

ParaPara.MoveToSegment = function(point) {
  console.assert(point instanceof Array &&
                 point.length == 2, "Unexpected segment length");
  this.point = point;
}

ParaPara.MoveToSegment.prototype.cut = function(brush) {
  return this;
}

ParaPara.MoveToSegment.prototype.toString = function() {
  return "M" + this.point.map(ParaPara.fixPrecision).join(" ");
}

// -------------------- Line to segment --------------------

ParaPara.LineToSegment = function(points) {
  console.assert(points instanceof Array &&
                 points.length == 4, "Unexpected segment length");
  this.points = points;
}

ParaPara.LineToSegment.prototype.cut = function(brush) {
  /*const*/ var MoveToSegment   = ParaPara.MoveToSegment;
  /*const*/ var LineToSegment   = ParaPara.LineToSegment;
  /*const*/ var prettyMuchEqual = ParaPara.Geometry.prettyMuchEqual;

  var brushBBox = brush.getBBox();
  if (!ParaPara.Geometry.lineIntersectsRect(this.points, brushBBox))
    return this;

  // Transform line to simplify containment checks
  var transformedLine      = brush.transformPoints(this.points);
  var brushDimensions      = brush.getDimensions();
  var transformedBrushBBox = { x: 0, y: 0,
                               width: brushDimensions.length,
                               height: brushDimensions.width };

  // Check for self-containment
  if (ParaPara.Geometry.rectContainsLine(transformedBrushBBox,
                                         transformedLine))
    return new MoveToSegment(this.points.slice(2));

  // Get intersections
  var intersections = [];
  for (var i = 0; i < 4; ++i) {
    var line = i < 3 ? brush.path.slice(i*2, i*2+4)
                     : brush.path.slice(i*2, i*2+2).
                         concat(brush.path.slice(0,2));
    var pt = ParaPara.Geometry.segmentsIntersect(this.points, line);
    if (pt) {
      if (intersections.length &&
          prettyMuchEqual(pt[0],intersections[intersections.length-2]) &&
          prettyMuchEqual(pt[1],intersections[intersections.length-1]))
        continue;
      intersections.push(pt[0], pt[1]);
      if (intersections.length == 4)
        break;
    }
  }

  if (!intersections.length)
    return this;

  // Sort
  if (intersections.length == 4) {
    var a,b;
    if (this.points[2] == this.points[0]) {
      a = 3;
      b = 1;
    } else {
      a = 2;
      b = 0;
    }
    if ((this.points[a]-this.points[b]<0) !=
        (intersections[a]-intersections[b]<0)) {
      var tmp = intersections.slice(0,2);
      intersections[0] = intersections[2];
      intersections[1] = intersections[3];
      intersections[2] = tmp[0];
      intersections[3] = tmp[1];
    }
  }

  // Check initial state
  var inside = transformedLine[0] >= 0 &&
               transformedLine[0] <= brushDimensions.length &&
               transformedLine[1] >= 0 &&
               transformedLine[1] <= brushDimensions.width;

  // Generate pieces
  var pieces = [];
  var points =
    this.points.slice(0,2).concat(intersections, this.points.slice(2));
  for (var i=0; i < points.length - 2; i+=2) {
    if (inside) {
      pieces.push(new MoveToSegment(points.slice(i+2, i+4)));
    } else {
      pieces.push(new LineToSegment(points.slice(i, i+4)));
    }
    inside = !inside;
  }

  return pieces;
}

ParaPara.LineToSegment.prototype.toString = function() {
  return "L" + this.points.slice(2).map(ParaPara.fixPrecision).join(" ");
}

// -------------------- Curve to segment --------------------

ParaPara.CurveToSegment = function(points) {
  console.assert(points instanceof Array &&
                 points.length == 8, "Unexpected segment length");
  this.points = points;
}

ParaPara.CurveToSegment.prototype.cut = function(brush) {
  /*const*/ var MoveToSegment     = ParaPara.MoveToSegment;
  /*const*/ var CurveToSegment    = ParaPara.CurveToSegment;
  /*const*/ var lineLength        = ParaPara.Geometry.lineLength;
  /*const*/ var segmentsIntersect = ParaPara.Geometry.segmentsIntersect;

  // Check if bboxes intersect
  var brushBBox   = brush.getBBox();
  var segmentBBox = this.getBBox();
  if (!ParaPara.Geometry.rectsIntersect(brushBBox, segmentBBox)) {
    return this;
  }

  // Transform this segment to lie along the first edge of the brush.
  // This makes some of the following comparisons simpler (especially the check
  // if the segment is fully contained in the brush outline)
  var transformedSegment =
    new CurveToSegment(brush.transformPoints(this.points));

  // Special handling for short segments
  //
  // If a straight-line approximation of this segment is shorter than the
  // brush-width and the bboxes intersect at all, just drop it outright, don't
  // bother cutting it.
  //
  // This costs us some accuracy but it's hardly noticeable when you're using
  // your finger anyway, and it gives us at least a 10% speedup, sometimes more.
  var brushDimensions      = brush.getDimensions();
  var transformedBrushBBox = { x: 0, y: 0,
                               width: brushDimensions.length,
                               height: brushDimensions.width };
  var approxLineLength     = lineLength(this.points[0], this.points[1],
                                        this.points[6], this.points[7]);
  if (approxLineLength < brush.width * 0.75) {
    var approxTransformedSeg =
      [ transformedSegment.points[0], transformedSegment.points[1],
        transformedSegment.points[6], transformedSegment.points[7]];
    return ParaPara.Geometry.intersectsWithZeroedRect(approxTransformedSeg,
                                                      transformedBrushBBox)
           ? new MoveToSegment(this.points.slice(6))
           : this;
  }

  // See if the segment is fully contained in the brush outline
  //
  // This isn't strictly necessary since we can detect fully contained
  // path below---i.e. a segment that starts inside and doesn't have any
  // intersections must be fully contained---but it's fractionally faster to do
  // this check upfront.
  //
  // (XXXperf Try with a tight bbox and see if the cost of computing the bbox
  // pays off)
  var transformedSegmentBBox = transformedSegment.getBBox();
  if (ParaPara.Geometry.rectContainsRect(transformedBrushBBox,
                                         transformedSegmentBBox))
    return new MoveToSegment(this.points.slice(6));

  // See if transformed boxes intersect at all
  if (!ParaPara.Geometry.rectsIntersect(transformedSegmentBBox,
                                        transformedBrushBBox))
    return this;

  var step          = 1.0 / ParaPara.erasePrecision;
  var startPt       = transformedSegment.getValue(0);
  var intersections = [];
  // XXX Need to rethink this---what if they exactly coincide?
  // If depends on the direction right?
  var startPtIsInsideBrush = startPt[0] >= 0 &&
                             startPt[0] <= brushDimensions.length &&
                             startPt[1] >= 0 &&
                             startPt[1] <= brushDimensions.width;

  for (var t = step; t<=1.0; t+=step) {
    var endPt = transformedSegment.getValue(t);
    var intercepts =
      ParaPara.Geometry.intersectsWithZeroedRect(
        [startPt[0], startPt[1], endPt[0], endPt[1]],
        brushDimensions.length, brushDimensions.width);

    if (intercepts.length) {
      var stepLength = lineLength(startPt[0], startPt[1], endPt[0], endPt[1]);
      for (var i = 0; i < intercepts.length; ++i) {
        var pt = intercepts[i];
        // If we get an intersection right on a segment boundary we don't want
        // to add it twice (once for each boundary) so just ignore the one that
        // appears at the start of the segment
        // XXX This needs testing---we probably want to actually compare
        // intersectT to the last value in the array
        if (pt[0] == startPt[0] && pt[1] == startPt[1])
          continue;
        var offset = lineLength(startPt[0], startPt[1], pt[0], pt[1])
                     / stepLength;
        var intersectT = t-step + step * offset;
        intersections.push(intersectT);
      }
    }

    startPt = endPt;
  }

  if (!intersections.length && !startPtIsInsideBrush)
    return this;

  intersections.sort(function(a,b) { return a-b; });
  var inside      = startPtIsInsideBrush;
  var pieces      = [];
  var lastSegment = this.points;
  var tOffset     = 0;
  for (var i=0; i < intersections.length; ++i) {
    var t = intersections[i];
    var scaledT = (t - tOffset) / (1.0 - tOffset);
    var segments = this.splitSegment(lastSegment, scaledT);
    if (inside) {
      pieces.push(new MoveToSegment(segments[0].slice(6)));
    } else {
      pieces.push(new CurveToSegment(segments[0]));
    }
    lastSegment = segments[1];
    inside = !inside;
    tOffset = t;
  }
  if (inside) {
    pieces.push(new MoveToSegment(lastSegment.slice(6)));
  } else {
    pieces.push(new CurveToSegment(lastSegment));
  }

  return pieces;
}

ParaPara.CurveToSegment.prototype.splitSegment = function(segment, t) {
  // De Casteljau's algorithm
  // 2 iterations, i is the number of segments between control points
  var segA = [segment[0], segment[1]];
  var segB = [segment[6], segment[7]];
  var readPts = segment;
  var writePts = [];
  for (var i = 3; i >= 1; --i) {
    writePts = [];
    // Iterate over segments
    for (var j = 0; j < i; ++j) {
      writePts.push(readPts[j*2]*(1-t) + readPts[j*2+2]*t);
      writePts.push(readPts[j*2+1]*(1-t) + readPts[j*2+3]*t);
    }
    segA.push(writePts[0], writePts[1]);
    segB.unshift(writePts[(i-1)*2], writePts[(i-1)*2+1]);
    readPts = writePts;
  }
  return [segA, segB];
}

ParaPara.CurveToSegment.prototype.getValue = function(t) {
  return [this.getX(t), this.getY(t)];
}

ParaPara.CurveToSegment.prototype.getX = function(t) {
  return this.computeCubicBaseValue(t, this.points[0], this.points[2],
                                    this.points[4], this.points[6]);
}

ParaPara.CurveToSegment.prototype.getY = function(t) {
  return this.computeCubicBaseValue(t, this.points[1], this.points[3],
                                    this.points[5], this.points[7]);
}

ParaPara.CurveToSegment.prototype.computeCubicBaseValue =
function(t, a, b, c, d) {
  var mt = 1-t;
  return mt*mt*mt*a + 3*mt*mt*t*b + 3*mt*t*t*c + t*t*t*d;
}

ParaPara.CurveToSegment.prototype.getBBox = function() {
  var x =
    Math.min(this.points[0], this.points[2],
             this.points[4], this.points[6]);
  var y = Math.min(this.points[1], this.points[3],
                   this.points[5], this.points[7]);
  var maxX = Math.max(this.points[0], this.points[2],
                      this.points[4], this.points[6]);
  var maxY = Math.max(this.points[1], this.points[3],
                      this.points[5], this.points[7]);
  return { x: x, y: y, width: maxX - x, height: maxY - y };
}

ParaPara.CurveToSegment.prototype.toString = function() {
  return "C" + this.points.slice(2).map(ParaPara.fixPrecision).join(" ");
}
;/* This Source Code Form is subject to the terms of the Mozilla Public
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
};/*
 * classList.js: Cross-browser full element.classList implementation.
 * 2011-06-15
 *
 * By Eli Grey, http://eligrey.com
 * Public Domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 */

/*global self, document, DOMException */

/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js*/

/*
 * 2011-12-02 Modified by Brian Birtles (Mozilla Japan) to add classList to SVG
 * elements for browsers that don't support it (e.g. WebKit)
 */

if (typeof document !== "undefined" &&
    !("classList" in document.createElement("a") &&
      "classList" in document.createElementNS("http://www.w3.org/2000/svg", "g")
     )
   )
{

(function (view) {

"use strict";

var
      svgNamespace = "http://www.w3.org/2000/svg"
    , classListProp = "classList"
    , protoProp = "prototype"
    , objCtr = Object
    , strTrim = String[protoProp].trim || function () {
        return this.replace(/^\s+|\s+$/g, "");
    }
    , arrIndexOf = Array[protoProp].indexOf || function (item) {
        var
              i = 0
            , len = this.length
        ;
        for (; i < len; i++) {
            if (i in this && this[i] === item) {
                return i;
            }
        }
        return -1;
    }
    // Vendors: please allow content code to instantiate DOMExceptions
    , DOMEx = function (type, message) {
        this.name = type;
        this.code = DOMException[type];
        this.message = message;
    }
    , checkTokenAndGetIndex = function (classList, token) {
        if (token === "") {
            throw new DOMEx(
                  "SYNTAX_ERR"
                , "An invalid or illegal string was specified"
            );
        }
        if (/\s/.test(token)) {
            throw new DOMEx(
                  "INVALID_CHARACTER_ERR"
                , "String contains an invalid character"
            );
        }
        return arrIndexOf.call(classList, token);
    }
    , ClassList = function (elem) {
        var
              className = typeof elem.className.baseVal !== "undefined"
                        ? elem.className.baseVal : elem.className
            , trimmedClasses = strTrim.call(className)
            , classes = trimmedClasses ? trimmedClasses.split(/\s+/) : []
            , i = 0
            , len = classes.length
        ;
        for (; i < len; i++) {
            this.push(classes[i]);
        }
        this._updateClassName = function () {
            typeof elem.className.baseVal !== "undefined"
              ? elem.className.baseVal = this.toString()
              : elem.className = this.toString();
        };
    }
    , classListProto = ClassList[protoProp] = []
    , classListGetter = function () {
        return new ClassList(this);
    }
    , addClassList = function (elemCtr) {
      if (objCtr.defineProperty) {
          var classListPropDesc = {
                get: classListGetter
              , enumerable: true
              , configurable: true
          };
          try {
              objCtr.defineProperty(elemCtr[protoProp], classListProp, classListPropDesc);
          } catch (ex) { // IE 8 doesn't support enumerable:true
              if (ex.number === -0x7FF5EC54) {
                  classListPropDesc.enumerable = false;
                  objCtr.defineProperty(elemCtr[protoProp], classListProp, classListPropDesc);
              }
          }
      } else if (objCtr[protoProp].__defineGetter__) {
          elemCtrl[protoProp].__defineGetter__(classListProp, classListGetter);
      }
    }
    , addClassListToDoc = function (doc, view) {
      if (!("classList" in doc.createElement("a"))) {
          addClassList(view.HTMLElement || view.Element);
      }
      if (!("classList" in doc.createElementNS(svgNamespace, "g"))) {
          addClassList(view.SVGElement);
      }
    }
    , addClassListToObj = function (object) {
      if (object.contentDocument &&
          object.contentDocument.readyState == "complete") {
        var win = object.contentWindow || object.contentDocument.defaultView;
        addClassListToDoc(object.contentDocument, win);
      }
      // else we just wait for the load event handler to call this later
    }
    , addClassListToAllObjs = function () {
      var objects = document.getElementsByTagName('object');
      for (var i = 0; i < objects.length; ++i) {
        addClassListToObj(objects[i]);
      }
    }
    , initialize = function () {
      addClassListToAllObjs();
      document.addEventListener('DOMNodeInserted', onNodeInserted, true);
    }
    , onNodeInserted = function(e) {
      addClassListToObj(e.srcElement);
      // Catch-all for IE
      e.srcElement.addEventListener("load", addClassListToAllObjs, true);
    }
;
// Most DOMException implementations don't allow calling DOMException's toString()
// on non-DOMExceptions. Error's toString() is sufficient here.
DOMEx[protoProp] = Error[protoProp];
classListProto.item = function (i) {
    return this[i] || null;
};
classListProto.contains = function (token) {
    token += "";
    return checkTokenAndGetIndex(this, token) !== -1;
};
classListProto.add = function (token) {
    token += "";
    if (checkTokenAndGetIndex(this, token) === -1) {
        this.push(token);
        this._updateClassName();
    }
};
classListProto.remove = function (token) {
    token += "";
    var index = checkTokenAndGetIndex(this, token);
    if (index !== -1) {
        this.splice(index, 1);
        this._updateClassName();
    }
};
classListProto.toggle = function (token) {
    token += "";
    if (checkTokenAndGetIndex(this, token) === -1) {
        this.add(token);
    } else {
        this.remove(token);
    }
};
classListProto.toString = function () {
    return this.join(" ");
};

addClassListToDoc(document, view);

if (document.readyState != 'complete') {
  document.addEventListener('DOMContentLoaded', initialize, true);
  // When we get the DOMContentLoaded event in IE the object might still not
  // have a contentDocument.
  //
  // However, I can't find any event supported by IE9 that will tell us when the
  // contentDocument is available *AND* which fires before the window load event
  // (when other scripts might be wanting to interact with the document).
  //
  // However, in IE9 event handlers seem to be called in the order they are
  // registered so we just register our own window.load handler and, if this
  // file has been included before other scripts that depend on it, we should
  // have time to add the classList before those other scripts get called.
  window.addEventListener('load', addClassListToAllObjs, true);
} else {
  initialize();
}

}(self));

}
;/**
 * UUID.core.js: The minimal subset of the RFC-compliant UUID generator UUID.js.
 *
 * @fileOverview
 * @author  LiosK
 * @version core-1.0
 * @license The MIT License: Copyright (c) 2012 LiosK.
 */
// Source: https://github.com/LiosK/UUID.js/blob/master/src/uuid.core.js

/** @constructor */
function UUID() {}

/**
 * The simplest function to get an UUID string.
 * @returns {string} A version 4 UUID string.
 */
UUID.generate = function() {
  var rand = UUID._gri, hex = UUID._ha;
  return  hex(rand(32), 8)          // time_low
        + "-"
        + hex(rand(16), 4)          // time_mid
        + "-"
        + hex(0x4000 | rand(12), 4) // time_hi_and_version
        + "-"
        + hex(0x8000 | rand(14), 4) // clock_seq_hi_and_reserved clock_seq_low
        + "-"
        + hex(rand(48), 12);        // node
};

/**
 * Returns an unsigned x-bit random integer.
 * @param {int} x A positive integer ranging from 0 to 53, inclusive.
 * @returns {int} An unsigned x-bit random integer (0 <= f(x) < 2^x).
 */
UUID._gri = function(x) { // _getRandomInt
  if (x <   0) return NaN;
  if (x <= 30) return (0 | Math.random() * (1 <<      x));
  if (x <= 53) return (0 | Math.random() * (1 <<     30))
                    + (0 | Math.random() * (1 << x - 30)) * (1 << 30);
  return NaN;
};

/**
 * Converts an integer to a zero-filled hexadecimal string.
 * @param {int} num
 * @param {int} length
 * @returns {string}
 */
UUID._ha = function(num, length) {  // _hexAligner
  var str = num.toString(16), i = length - str.length, z = "0";
  for (; i > 0; i >>>= 1, z += z) { if (i & 1) { str = z + str; } }
  return str;
};

// vim: et ts=2 sw=2
;/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var ParaPara = ParaPara || {};

ParaPara.XHR_TIMEOUT = 8000;

ParaPara.postRequest = function(url, payload, successCallback,
                                failureCallback) {
  // Create JSON payload
  var json = JSON.stringify(payload);

  // Create request
  var req = new XMLHttpRequest();
  req.open("POST", url, true);

  // Set headers
  req.setRequestHeader("Content-Type", "application/json");

  // Event listeners
  req.onreadystatechange = function() {
    if (req.readyState != 4)
      return;
    // 200 is for HTTP request, 0 is for local files (this allows us to test
    // without running a local webserver)
    if (req.status == 200 || req.status == 0) {
      try {
        var response = JSON.parse(req.responseText);
        if (response.error_key) {
          failureCallback(response.error_key, response.error_detail);
        } else {
          successCallback(JSON.parse(req.responseText));
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.debug("Error sending to server, could not parse response: "
            + req.responseText);
          failureCallback('server-fail');
        } else {
          throw e;
        }
      }
    } else {
      failureCallback('no-access')
    }
  };

  // Send away
  try {
    req.send(json);
  } catch (e) {
    console.debug(e);
    failureCallback('send-fail');
    return;
  }

  // Add timeout
  window.setTimeout(
    function() {
      if (req.readyState != 0 && req.readyState != 4) {
        req.abort();
        failureCallback('timeout');
      }
    },
    ParaPara.XHR_TIMEOUT
  );

  ParaPara.abortRequest = function() {
    if (req.readyState != 0 && req.readyState != 4) {
      req.abort();
    }
  }
}

ParaPara.abortRequest = function() {}
