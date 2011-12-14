var ParaPara = ParaPara || {};

ParaPara.SVG_NS   = ParaPara.SVG_NS   || "http://www.w3.org/2000/svg";
ParaPara.XLINK_NS = ParaPara.XLINK_NS ||"http://www.w3.org/1999/xlink";

if (typeof ParaPara.fixPrecision !== "function") {
  ParaPara.fixPrecision = function(x) { return x.toFixed(2); }
}

// XXXInteg When we include this in the animation thing, need to be careful to
// switch the tool back to drawControls when we add a new frame since the eraser
// is tied to the current frame (currently anyway).

// -------------------- Eraser Controls --------------------

ParaPara.EraserControls = function(frame, brushWidth) {
  this.eraser       = null;
  this.currentTouch = null;
  this.currentFrame = frame;
  this.brushWidth   = brushWidth;
  this.prevX        = undefined;
  this.prevY        = undefined;
}

ParaPara.EraserControls.prototype.startErasing = function() {
  console.assert(!this.eraser, "Already erasing?");

  this.mouseDownHandler   = this.mouseDown.bind(this);
  this.mouseMoveHandler   = this.mouseMove.bind(this);
  this.mouseUpHandler     = this.mouseUp.bind(this);
  this.touchStartHandler  = this.touchStart.bind(this);
  this.touchMoveHandler   = this.touchMove.bind(this);
  this.touchEndHandler    = this.touchEnd.bind(this);
  this.touchCancelHandler = this.touchEnd.bind(this);

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

ParaPara.EraserControls.prototype.prepArtworkForErasing =
function() {
  // Get current scale for working out how thick the lines *really* are
  // (not that we're expecting uniform scale to just the 'a' value of the
  // transform matrix will do).
  var currentScale = this.currentFrame.getScreenCTM().a;

  var children = this.currentFrame.childNodes;
  for (var i = 0; i < children.length; ++i) {
    var child = children[i];
    if (child.className && child.className.baseVal != "fatLine") {
      child.setAttribute("pointer-events", "visiblePainted");
    }
    this.fattenThinLine(child, currentScale);
  }
}

ParaPara.EraserControls.prototype.fattenThinLine =
function(elem, currentScale) {
  // XXX We really should be re-performing this operation every time the
  // window is resized but we don't and just assume things will stay the
  // same within the one erase operation.
  // (Not a great assumption since it's quite conceivable someone might
  // rotate their tablet 90 degrees to enlarge the canvas so they can more
  // accurately erase something.)
  // Need to work out first if this fattenning is really necessary or not
  if (elem.tagName != "path")
    return;

  if (elem.className && elem.className.baseVal == "fatLine")
    return;

  // Lines get hard to select once they're thinner than this
  const minWidth = 14;

  var strokeWidth =
    window.getComputedStyle(elem, null).
      getPropertyValue("stroke-width", null);
  var lineWidth = strokeWidth * currentScale;

  if (lineWidth > minWidth)
    return;

  var clone = elem.cloneNode(false);
  clone.setAttribute("stroke", "none");
  clone.setAttribute("stroke-width", (minWidth / currentScale).toFixed(1));
  clone.setAttribute("pointer-events", "stroke");
  clone.setAttribute("class", "fatLine");

  // Insert after the element
  // (This is really important because this method is called in a loop
  //  that iterates over a live list of child nodes of the frame. If we
  //  insert the clone *before* elem the next iteration will visit elem
  //  again and so on forever. If we need to insert this before then we
  //  will have to make the node list non-live.)
  elem.parentNode.insertBefore(clone, elem.nextSibling);
}

ParaPara.EraserControls.prototype.restoreArtworkFromErasing =
function() {
  // XXX
  // restore pointer-events on all lines
  // remove fattened lines
}

ParaPara.EraserControls.prototype.finishErasing = function() {
  // XXX
  // remove event listeners
  this.restoreArtworkFromErasing();
}

ParaPara.EraserControls.prototype.mouseDown = function(evt) {
  evt.preventDefault();
  if (this.eraser)
    return;

  this.eraser = new ParaPara.Eraser(this.currentFrame, this.brushWidth);
  this.eraseFromEvent(evt);
}

ParaPara.EraserControls.prototype.mouseMove = function(evt) {
  evt.preventDefault();
  if (!this.eraser)
    return;
  this.eraseFromEvent(evt);
}

ParaPara.EraserControls.prototype.mouseUp = function(evt) {
  evt.preventDefault();
  if (!this.eraser)
    return;
  this.eraser = null;
  this.prevX = this.prevY = undefined;
}

ParaPara.EraserControls.prototype.touchStart = function(evt) {
  evt.preventDefault();
  if (this.eraser)
    return;
  this.currentTouch = evt.changedTouches[0].identifier;
  this.eraser = new ParaPara.Eraser(this.currentFrame, this.brushWidth);
  this.eraseFromEvent(evt);
}

ParaPara.EraserControls.prototype.touchMove = function(evt) {
  evt.preventDefault();
  if (!this.eraser)
    return;
  this.eraseFromEvent(evt);
}

ParaPara.EraserControls.prototype.touchEnd = function(evt) {
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
}

ParaPara.EraserControls.prototype.eraseFromEvent = function(evt) {
  console.assert(this.eraser, "No eraser to use");

  var eventTargetAndCoords = this.getTargetAndCoordsFromEvent(evt);

  var candidateShapes = [];
  var pt = this.getLocalCoords(eventTargetAndCoords.x,
                               eventTargetAndCoords.y, this.currentFrame);

  if (eventTargetAndCoords.target) {
    candidateShapes.push(eventTargetAndCoords.target);
  } else {
    // If we didn't get a direct hit get a list of lines to test
    candidateShapes = this.getCandidateShapes(pt.x, pt.y);
    var ids = [];
    for (var i = 0; i < candidateShapes.length; i++) {
      ids.push(candidateShapes[i].id);
    }
  }

  this.eraser.erase(pt.x, pt.y, candidateShapes);

  this.prevX = pt.x;
  this.prevY = pt.y;
}

ParaPara.EraserControls.prototype.getTargetAndCoordsFromEvent = function(evt) {
  var result = { target: null, x: undefined, y: undefined };
  var elem = null;

  // Mouse events are easy
  if (!evt.changedTouches) {
    elem = evt.target;
    result.x = evt.clientX;
    result.y = evt.clientY;
  // Touches take a little more work
  } else {
    for (var i = 0; i < evt.changedTouches.length; ++i) {
      var touch = evt.changedTouches[i];
      if (touch.identifier == this.currentTouch) {
        result.x = touch.clientX;
        result.y = touch.clientY;
        elem = document.elementFromPoint(result.x, result.y);
        break;
      }
    }
  }
  if (!elem)
    return result;

  // If we have an artificially fattened line, choose the "real" line
  // before it
  if (elem.className && elem.className.baseVal == "fatLine") {
    elem = elem.previousElementSibling;
  }

  // Check the target is part of the current frame
  var parent = elem.parentNode;
  while (parent && parent !== this.currentFrame) {
    parent = parent.parentNode;
  }
  if (!parent)
    return result;

  result.target = elem;
  return result;
}

ParaPara.EraserControls.prototype.getCandidateShapes = function(x, y) {
  // If this is the first mouse/touch event then just ignore it since if
  // it was on a line we would have got a direct hit already
  // XXX Not sure if this is what we want
  if (!this.prevX || !this.prevY)
    return [];

  // Go through shapes backwards so we return a list from top to bottom
  var shapes = this.currentFrame.childNodes;
  var hitShapes = [];
  for (var i = shapes.length-1; i >= 0; --i) {
    var shape = shapes[i];
    if (shape.nodeType != Node.ELEMENT_NODE)
      continue;
    if (shape.className && shape.className.baseVal == "fatLine")
      continue;

    // Theoretically, we should extend the test line by the maximum of the
    // finger width and stroke width but for now we'll see how this works
    if (ParaPara.Geometry.lineIntersectsRect([this.prevX, this.prevY, x, y],
                                              shape.getBBox())) {
      hitShapes.push(shape);
    }
  }

  return hitShapes;
}

ParaPara.EraserControls.prototype.getLocalCoords = function(x, y, elem) {
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
  var scaledBrushWidth = this.brushWidth / this.currentScale;
  var len = candidateShapes.length;
  for (var i = 0; i < len; ++i) {
    var shape = candidateShapes[i];
    if (shape.tagName == "path") {
      console.assert(shape.className && shape.className.baseVal != "fatLine",
        "Shouldn't be testing the line fattening");

      // Work out the amount we should extend our test line / test point
      // to account for the width of stroke / width of the user's "brush"
      var strokeWidth = parseFloat(window.getComputedStyle(shape, null).
                          getPropertyValue("stroke-width", null));
      var tolerance = Math.max(scaledBrushWidth, strokeWidth) / 2;

      // Since the line will have stroke-linecap:round, we need to make
      // the brushWidth a bit larger to account for the space taken up by
      // the rounded ends of the cut line
      var effectiveBrushWidth = scaledBrushWidth + strokeWidth / 2;

      if (this.prevX === undefined) {
        // We only have one point so make two little lines in an X and try
        // each
        if (this.cutPath(x-tolerance, y-tolerance,
                         x+tolerance, y+tolerance, shape,
                         effectiveBrushWidth))
          continue;
        this.cutPath(x+tolerance, y-tolerance,
                     x-tolerance, y+tolerance, shape,
                     effectiveBrushWidth);
      } else {
        // Extend the end of the path by the tolerance
        var angle = Math.atan2(y - this.prevY, x - this.prevX);
        var x1 = this.prevX - tolerance * Math.cos(angle);
        var y1 = this.prevY - tolerance * Math.sin(angle);
        var x2 = x + tolerance * Math.cos(angle);
        var y2 = y + tolerance * Math.sin(angle);
        this.cutPath(x1, y1, x2, y2, shape, effectiveBrushWidth);
      }
    } else if (shape.tagName == "circle") {
      // XXX This is easy
      // Just work out if the distance between x,y is less than the
      // maximum of the circle radius and the scaledBrushWidth??
      // That won't work if we get a fast sweep that generates one touch
      // on each side of the circle?? Do an intersection between the line
      // and a bounding box
    } else {
      console.assert(false, "Got unexpected shape type: " + shape.tagName);
    }
  }

  this.prevX = x;
  this.prevY = y;
}

ParaPara.Eraser.prototype.cutPath = function(x1, y1, x2, y2, path, brushWidth) {
  addDebuggingLine(x1, y1, x2, y2);
  var segList = path.pathSegList;
  var currentPoint = undefined;
  var didCut = false;
  var segObjects = new Array();
  for (var i=0; i < segList.numberOfItems; ++i) {
    var seg = segList.getItem(i);
    var newSeg = this.getSegObject(seg, currentPoint);
    var cutSegments = newSeg.cut([x1, y1, x2, y2], brushWidth);
    if (cutSegments != newSeg)
      didCut = true;
    segObjects = segObjects.concat(cutSegments);
    currentPoint = { x: seg.x, y: seg.y };
  }

  if (didCut) {
    var fattenedPath = path.nextElementSibling &&
         path.nextElementSibling.getAttribute("class") == "fatLine"
       ? path.nextElementSibling
       : null;
    segObjects = segObjects.filter(ParaPara.Eraser.filterSuperfluousMoveTo);
    if (!segObjects.length) {
      path.parentNode.removeChild(path);
      if (fattenedPath)
        fattenedPath.parentNode.removeChild(fattenedPath);
    } else {
      var d = segObjects.join("");
      path.setAttribute("d", d);
      if (fattenedPath)
        fattenedPath.setAttribute("d", d);
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

// ---------------------- Geometry -------------------------

ParaPara.Geometry = {};

// Based on:
// http://community.topcoder.com/tc?module=Static&d1=tutorials&d2=geometry2
// and:
// http://processingjs.nihongoresources.com/bezierinfo/
ParaPara.Geometry.lineIntersectsLine = function(line1, line2) {
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

ParaPara.Geometry.lineIntersectsLineSegment = function(line1, line2) {
  var isBetween = ParaPara.Geometry.isBetween;
  var pt = ParaPara.Geometry.lineIntersectsLine(line1, line2);
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

  // Transform the rect so that the line runs along the x-axis
  // (XXXperf On second thoughts, this is not the most efficient way to do
  //  things. Should probably just call lineIntersectsLine on each of the
  //  edges.)

  // Calculate the transformation
  var angle = Math.atan2(line[3] - line[1], line[2] - line[0]) * 180 / Math.PI;
  var mx = ParaPara.svgRoot.createSVGMatrix();
  mx = mx.rotate(-angle, 0, 0);
  mx = mx.translate(-line[0], -line[1]);

  // Transform the points of the box
  var pts = [];
  var pt = ParaPara.svgRoot.createSVGPoint();
  for (var i = 0; i < coords.length; i += 2) {
    pt.x = coords[i];
    pt.y = coords[i+1];
    pts.push(pt.matrixTransform(mx));
  }

  // Test for intersection
  var length = ParaPara.Geometry.lineLength(line[0], line[1], line[2], line[3]);
  for (var i = 0; i < pts.length; ++i) {
    var a = pts[i];
    var b = pts[i+1==pts.length ? 0 : i+1];
    if (a.y == b.y) // Parallel to x-axis
      continue;
    if ((a.y<0)==(b.y<0)) // Completely above or below x-axis
      continue;
    var x = -a.y * (b.x - a.x) / (b.y - a.y) + a.x;
    if (x > 0 && x < length) {
      return true;
    }
  }

  return false;
}

ParaPara.Geometry.lineLength = function(x1, y1, x2, y2) {
  return Math.sqrt((x2 -= x1)*x2 + (y2 -= y1)*y2);
}

ParaPara.Geometry.isBetween = function (x, a, b) {
  const tolerance = 0.000001;
  return x >= Math.min(a, b) - tolerance && x <= Math.max(a, b) + tolerance;
}

// ==================== SEGMENT TYPES ======================

// -------------------- Move to segment --------------------

ParaPara.MoveToSegment = function(point) {
  console.assert(point instanceof Array &&
                 point.length == 2, "Unexpected segment length");
  this.point = point;
}

ParaPara.MoveToSegment.prototype.cut = function(line, brushWidth) {
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

ParaPara.LineToSegment.prototype.cut = function(line, brushWidth) {
  var pt = ParaPara.Geometry.lineIntersectsLineSegment(line, this.points);
  if (!pt)
    return this;

  // We could actually do much better than this, and consider the angle between
  // the two lines and artificially increase the brushWidth as the angle becomes
  // more acute but for now we're not expecting to encounter straight lines
  // much and once we fix the line smoothing, not at all.

  var offset =
    ParaPara.Geometry.lineLength(this.points[0], this.points[1], pt[0], pt[1]);
  var initialLineLength =
    ParaPara.Geometry.lineLength(this.points[0], this.points[1],
               this.points[2], this.points[3]);
  var atStart  = offset <= brushWidth / 2;
  var atEnd    = initialLineLength - offset <= brushWidth / 2;
  var pieces   = [];
  var angle    = Math.atan2(this.points[3] - this.points[1],
                            this.points[2] - this.points[0]);
  var xDelta   = brushWidth / 2 * Math.cos(angle);
  var yDelta   = brushWidth / 2 * Math.sin(angle);
  var x1       = pt[0] - xDelta;
  var y1       = pt[1] - yDelta;
  var x2       = pt[0] + xDelta;
  var y2       = pt[1] + yDelta;
  var segmentA = this.points.slice(0,2).concat(x1, y1);
  var segmentB = [x2, y2].concat(this.points.slice(2));

  var MoveToSegment = ParaPara.MoveToSegment;
  var LineToSegment = ParaPara.LineToSegment;

  if (atStart && atEnd) {
    pieces.push(new MoveToSegment(this.points.slice(2)));
  } else if (atStart) {
    pieces.push(new MoveToSegment(segmentB.slice(0,2)));
    pieces.push(new LineToSegment(segmentB));
  } else if (atEnd) {
    pieces.push(new LineToSegment(segmentA));
    pieces.push(new MoveToSegment(segmentA.slice(2)));
  } else {
    pieces.push(new LineToSegment(segmentA));
    pieces.push(new MoveToSegment(segmentB.slice(0,2)));
    pieces.push(new LineToSegment(segmentB));
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

ParaPara.CurveToSegment.prototype.cut = function(line, brushWidth) {
  const MoveToSegment             = ParaPara.MoveToSegment;
  const CurveToSegment            = ParaPara.CurveToSegment;
  const lineLength                = ParaPara.Geometry.lineLength;
  const lineIntersectsLineSegment = ParaPara.Geometry.lineIntersectsLineSegment;

  // XXX Try with/without this and see if it really helps.
  var bbox = this.getBBox();
  addDebuggingRect(bbox);
  if (!ParaPara.Geometry.lineIntersectsRect(line, bbox)) {
    return this;
  }

  // If this is a short segment just drop it altogether
  var segmentLength = lineLength(this.points[0], this.points[1],
                                 this.points[6], this.points[7]);
  if (segmentLength < brushWidth) {
    return new MoveToSegment(this.points.slice(6));
  }

  const steps = 8;
  var step = 1.0 / steps;
  var x1 = this.getX(0);
  var y1 = this.getY(0);
  for (var t = step; t<=1.0; t+=step) {
    var x2 = this.getX(t);
    var y2 = this.getY(t);
    addDebuggingLine(x1, y1, x2, y2);
    var pt = lineIntersectsLineSegment(line, [x1, y1, x2, y2]);
    if (pt) {
      var stepLength = lineLength(x1, y1, x2, y2);
      var offset = lineLength(x1, y1, pt[0], pt[1]) / stepLength;
      var intersectT = t-step + step * offset;
      addDebuggingPoint(this.getX(intersectT), this.getY(intersectT));

      var pieces = [];

      var gapWidth = step / stepLength * brushWidth;
      var startT   = intersectT - gapWidth / 2;
      var endT     = intersectT + gapWidth / 2;
      var atStart  = startT <= gapWidth;
      var atEnd    = 1.0 - endT <= gapWidth;

      // XXX When we divide smaller paths, we should use a larger step
      //     value
      if (atStart && atEnd) {
        pieces.push(new MoveToSegment(this.points.slice(6)));
      } else if (atStart) {
        var segments = this.splitPath(endT);
        pieces.push(new MoveToSegment(segments[1].slice(0,2)));
        var lastSegment = new CurveToSegment(segments[1]);
        pieces = pieces.concat(lastSegment.cut(line, brushWidth));
      } else if (atEnd) {
        var segments = this.splitPath(startT);
        pieces.push(new CurveToSegment(segments[0]));
        pieces.push(new MoveToSegment(segments[1].slice(6)));
      } else {
        var segments = this.splitPath(startT);
        var partA = segments[0];
        segments = this.splitPath(endT);
        var partB = segments[1];
        pieces.push(new CurveToSegment(partA));
        pieces.push(new MoveToSegment(partB.slice(0,2)));
        var lastSegment = new CurveToSegment(partB);
        pieces = pieces.concat(lastSegment.cut(line, brushWidth));
      }
      return pieces;
    }
    x1 = x2;
    y1 = y2;
  }
  return this;
}

ParaPara.CurveToSegment.prototype.splitPath = function(t) {
  // De Casteljau's algorithm
  // 2 iterations, i is the number of segments between control points
  var segA = [this.points[0], this.points[1]];
  var segB = [this.points[6], this.points[7]];
  var readPts = this.points;
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

/* Debugging hooks */
if (Function.prototype.addDebuggingLine !== "function") {
  addDebuggingLine = function() {};
}
if (Function.prototype.addDebuggingPoint !== "function") {
  addDebuggingPoint = function() {};
}
if (Function.prototype.addDebuggingRect !== "function") {
  addDebuggingRect = function() {};
}
if (Function.prototype.addDebuggingBox !== "function") {
  addDebuggingBox = function() {};
}
