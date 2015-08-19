/* This Source Code Form is subject to the terms of the Mozilla Public
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
