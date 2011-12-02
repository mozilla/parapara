/*
 * SVG version of Frank Yan's html5slider
 *
 * The key difference, apart from the SVG UI is that this version should work
 * well with Firefox Android and touch events. Otherwise it is largely the same.
 *
 * License for html5slider is as follows:
 */
/*
html5slider - a JS implementation of <input type=range> for Firefox 4 and up
https://github.com/fryn/html5slider

Copyright (c) 2010-2011 Frank Yan, <http://frankyan.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function() {

// Test for native support
// (Even though we probably want to use the SVG UI even on browsers that support
// <input type=range> for now we don't because the following code uses some
// features not supported in those browsers such as Array.forEach)
var test = document.createElement('input');
try {
  test.type = 'range';
  if (test.type == 'range')
    return;
} catch (e) {
  return;
}

const SVG_NS = "http://www.w3.org/2000/svg";

var defs;

var onChange = document.createEvent('HTMLEvents');
onChange.initEvent('change', true, false);

if (document.readyState == 'loading')
  document.addEventListener('DOMContentLoaded', initialize, true);
else
  initialize();

function initialize() {
  // create initial sliders
  Array.forEach(document.querySelectorAll('input[type=range]'), transform);
  // create sliders on-the-fly
  document.addEventListener('DOMNodeInserted', onNodeInserted, true);
}

function onNodeInserted(e) {
  check(e.target);
  if (e.target.querySelectorAll)
    Array.forEach(e.target.querySelectorAll('input'), check);
}

function check(input, async) {
  if (input.localName != 'input' || input.type == 'range');
  else if (input.getAttribute('type') == 'range')
    transform(input);
  else if (!async)
    setTimeout(check, 0, input, true);
}

function transform(slider) {

  var isValueSet, areAttrsSet, isChanged, prevValue, rawValue, prevX;
  var min, max, step, range, value = slider.getAttribute('value');
  var svg;
  var dragListener, dragEndListener;

  const thumbRadius = 20;

  // lazily create shared svg definitions
  if (!defs) {
    defs = document.body.appendChild(document.createElement('div'));
    defs.setAttribute("style", "position:fixed;top:-999999px");
    defs.innerHTML =
      '<svg>' +
       '<defs>' +
        '<linearGradient id="__slidertrack_filled_grad__" x2="0" y2="100%">' +
         '<stop offset="0" stop-color="skyblue"/>' +
         '<stop offset="1" stop-color="dodgerblue"/>' +
        '</linearGradient>' +
        '<linearGradient id="__slidertrack_unfilled_grad__" x2="0" y2="100%">' +
         '<stop offset="0" stop-color="gainsboro"/>' +
         '<stop offset="1" stop-color="white"/>' +
        '</linearGradient>' +
        '<linearGradient id="__sliderthumb_grad__" x2="0" y2="100%">' +
         '<stop offset="0" stop-color="white"/>' +
         '<stop offset="1" stop-color="gainsboro"/>' +
        '</linearGradient>' +
        '<linearGradient id="__sliderthumb_depressed_grad__" x2="0" y2="100%">'+
         '<stop offset="0" stop-color="gainsboro"/>' +
         '<stop offset="1" stop-color="white"/>' +
        '</linearGradient>' +
       '</defs>' +
      '</svg>';
  }

  // reimplement value and type properties
  var getValue = function() { return '' + value; };
  var setValue = function setValue(val) {
    value = '' + val;
    isValueSet = true;
    draw();
    delete slider.value;
    slider.value = value;
    slider.__defineGetter__('value', getValue);
    slider.__defineSetter__('value', setValue);
  };
  slider.__defineGetter__('value', getValue);
  slider.__defineSetter__('value', setValue);
  slider.__defineGetter__('type', function() { return 'range'; });

  // sync properties with attributes
  ['min', 'max', 'step'].forEach(function(prop) {
    if (slider.hasAttribute(prop))
      areAttrsSet = true;
    slider.__defineGetter__(prop, function() {
      return this.hasAttribute(prop) ? this.getAttribute(prop) : '';
    });
    slider.__defineSetter__(prop, function(val) {
      val === null ? this.removeAttribute(prop) : this.setAttribute(prop, val);
    });
  });

  // initialize slider
  slider.readOnly = true;
  createSVG(slider);
  update();

  slider.addEventListener('DOMAttrModified', function(e) {
    // note that value attribute only sets initial value
    if (e.attrName == 'value' && !isValueSet) {
      value = e.newValue;
      draw();
    }
    else if (~['min', 'max', 'step'].indexOf(e.attrName)) {
      update();
      areAttrsSet = true;
    }
  }, true);

  dragListener = onDrag.bind(slider);
  dragEndListener = onDragEnd.bind(slider);

  function onDragStart(e) {
    if (e.button || !range)
      return;
    e.preventDefault();

    // XXX detect multiple fingers and ignore all but the first
    var thumb = getThumb();
    thumb.setAttribute("fill", "url(#__sliderthumb_depressed_grad__)");
    rawValue = value;
    prevX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;

    document.addEventListener('mousemove', dragListener, true);
    document.addEventListener('touchmove', dragListener, true);
    document.addEventListener('mouseup', dragEndListener, true);
    document.addEventListener('touchend', dragEndListener, true);
  }

  function onDrag(e) {
    e.preventDefault();
    var width = parseFloat(getComputedStyle(slider, null).width);
    var multiplier = (width - thumbRadius) / range;
    if (!multiplier)
      return;
    var clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    rawValue += (clientX - prevX) / multiplier;
    prevX = clientX;
    isChanged = true;
    this.value = rawValue;
  }

  function onDragEnd(e) {
    e.preventDefault();
    var thumb = getThumb();
    thumb.setAttribute("fill", "url(#__sliderthumb_grad__)");

    document.removeEventListener('mousemove', dragListener, true);
    document.removeEventListener('touchmove', dragListener, true);
    document.removeEventListener('mouseup', dragEndListener, true);
    document.removeEventListener('touchend', dragEndListener, true);
  }

  function onSeekStart(e) {
    if (e.button || !range)
      return;
    var width = parseFloat(getComputedStyle(slider, null).width);
    var multiplier = (width - thumbRadius) / range;
    if (!multiplier)
      return;
    var clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    // distance between click and center of thumb
    var dev = clientX - this.getBoundingClientRect().left - thumbRadius / 2 -
              (value - min) * multiplier;
    // move thumb to click location
    if (Math.abs(dev) > thumbRadius) {
      isChanged = true;
      slider.value -= -dev / multiplier;
    }
    onDragStart(e);
  }

  function onKeyDown(e) {
    if (e.keyCode > 36 && e.keyCode < 41) { // 37-40: left, up, right, down
      onFocus.call(this);
      isChanged = true;
      this.value = value + (e.keyCode == 38 || e.keyCode == 39 ? step : -step);
    }
  }

  function onFocus() {
    // XXX
  }

  function onBlur() {
    this.style.boxShadow = '';
  }

  // determines whether value is valid number in attribute form
  function isAttrNum(value) {
    return !isNaN(value) && +value == parseFloat(value);
  }

  function createSVG(slider) {

    svg = document.createElementNS(SVG_NS, 'svg');
    var width = window.getComputedStyle(slider, null).getPropertyValue('width');
    svg.setAttribute("style", "width:" + width + ";height:40px");

    // Clipping rect for filled vs unfilled part of slider
    var defs = document.createElementNS(SVG_NS, 'defs');
    var clipPath = document.createElementNS(SVG_NS, 'clipPath');
    var clipPathId = "__slidertrack_clip_" + guid() + "__";
    clipPath.setAttribute("id", clipPathId);
    var clipRect = document.createElementNS(SVG_NS, 'rect');
    clipRect.setAttribute("width", "100%");
    clipRect.setAttribute("height", "40");
    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    // Catch all rect for click events
    var hitTestRect = document.createElementNS(SVG_NS, 'rect');
    hitTestRect.setAttribute("width", "100%");
    hitTestRect.setAttribute("height", "100%");
    hitTestRect.setAttribute("fill", "none");
    hitTestRect.setAttribute("pointer-events", "all");
    hitTestRect.setAttribute("class", "hitTest");
    svg.appendChild(hitTestRect);

    // Track (filled)
    var trackFilled = document.createElementNS(SVG_NS, 'rect');
    trackFilled.setAttribute("x", thumbRadius);
    trackFilled.setAttribute("y", "10");
    trackFilled.setAttribute("width", parseFloat(width) - 2 * thumbRadius);
    trackFilled.setAttribute("height", "20");
    trackFilled.setAttribute("rx", "10");
    trackFilled.setAttribute("fill", "url(#__slidertrack_filled_grad__)");
    trackFilled.setAttribute("stroke-width", "0.5");
    trackFilled.setAttribute("stroke", "navy");
    trackFilled.setAttribute("pointer-events", "none");
    svg.appendChild(trackFilled);

    // Track (unfilled)
    var trackUnfilled = document.createElementNS(SVG_NS, 'rect');
    trackUnfilled.setAttribute("x", thumbRadius);
    trackUnfilled.setAttribute("y", "10");
    trackUnfilled.setAttribute("width", parseFloat(width) - 2 * thumbRadius);
    trackUnfilled.setAttribute("height", "20");
    trackUnfilled.setAttribute("rx", "10");
    trackUnfilled.setAttribute("fill", "url(#__slidertrack_unfilled_grad__)");
    trackUnfilled.setAttribute("stroke-width", "0.5");
    trackUnfilled.setAttribute("stroke", "darkgrey");
    trackUnfilled.setAttribute("clip-path", "url(#" + clipPathId + ")");
    trackUnfilled.setAttribute("pointer-events", "none");
    svg.appendChild(trackUnfilled);

    // Slider thumb
    var thumb = document.createElementNS(SVG_NS, 'circle');
    thumb.setAttribute("cx", thumbRadius);
    thumb.setAttribute("cy", 20);
    thumb.setAttribute("r", thumbRadius-2);
    thumb.setAttribute("fill", "url(#__sliderthumb_grad__)");
    thumb.setAttribute("stroke-width", "1");
    thumb.setAttribute("stroke", "darkgrey");
    thumb.setAttribute("pointer-events", "all");
    svg.appendChild(thumb);

    // Stick it in the tree
    slider.parentNode.insertBefore(svg, slider);
    slider.style.display = "none";

    // Attach listeners
    hitTestRect.addEventListener('mousedown', onSeekStart, true);
    hitTestRect.addEventListener('touchstart', onSeekStart, true);
    thumb.addEventListener('mousedown', onDragStart, true);
    thumb.addEventListener('touchstart', onDragStart, true);
    svg.addEventListener('keydown', onKeyDown, true);
    svg.addEventListener('focus', onFocus, true);
    svg.addEventListener('blur', onBlur, true);
  }

  // The following two functions courtesy of:
  //   http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
  function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }

  function guid() {
    return (S4()+S4()+S4()+S4()+S4()+S4()+S4()+S4());
  }

  // validates min, max, and step attributes and redraws
  function update() {
    min = isAttrNum(slider.min) ? +slider.min : 0;
    max = isAttrNum(slider.max) ? +slider.max : 100;
    if (max < min)
      max = min > 100 ? min : 100;
    step = isAttrNum(slider.step) && slider.step > 0 ? +slider.step : 1;
    range = max - min;
    draw(true);
  }

  // recalculates value property
  function calc() {
    if (!isValueSet && !areAttrsSet)
      value = slider.getAttribute('value');
    if (!isAttrNum(value))
      value = (min + max) / 2;
    // snap to step intervals (WebKit sometimes does not - bug?)
    value = Math.round((value - min) / step) * step + min;
    if (value < min)
      value = min;
    else if (value > max)
      value = min + ~~(range / step) * step;
  }

  // renders slider
  function draw(attrsModified) {
    calc();
    if (isChanged && value != prevValue)
      slider.dispatchEvent(onChange);
    isChanged = false;
    if (!attrsModified && value == prevValue)
      return;
    prevValue = value;
    var position = range ? (value - min) / range : 0;

    var width =
      parseFloat(window.getComputedStyle(slider, null).
                 getPropertyValue('width'));
    var thumbPos = thumbRadius + position * (width - thumbRadius * 2);
    var thumb = getThumb();
    thumb.setAttribute("cx", thumbPos);

    var clipPath = svg.getElementsByTagName("clipPath")[0];
    clipPath.childNodes[0].setAttribute("x", thumbPos);
  }

  function getThumb() {
    return svg.getElementsByTagName("circle")[0];
  }
}

})();
