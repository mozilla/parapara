var EditorUI = EditorUI || {};

EditorUI.init = function() {
  var svgRoot = document.getElementById("canvas");
  ParaPara.init(svgRoot);
  EditorUI.initTools();
  EditorUI.initStrokeWidths();
  EditorUI.initColors();
  EditorUI.initEraseWidths();
  EditorUI.updateLayout();
}
window.addEventListener("load", EditorUI.init, false);

// -------------- Navigation -----------

EditorUI.nextFrame = function() {
  ParaPara.addFrame();
  this.changeTool(document.getElementById("pencilTool"));
}

EditorUI.finish = function() {
  document.getElementById("frameControls").style.display = "none";
  document.getElementById("animControls").style.display = "";
  var speedAdjust = document.getElementById("speedAdjust");
  ParaPara.animate(speedAdjust.value);
}

EditorUI.send = function() {
  // XXX disable animControls
  // XXX display some sort of spinner
  // XXX get title and author
  var title  = "タイトル";
  var author = "名前";
  ParaPara.send(EditorUI.sendSuccess, EditorUI.sendFail, title, author);
}

EditorUI.sendSuccess = function() {
  console.log("Send succeeded");
  // XXX Display success message that fades away
  document.getElementById("animControls").style.display = "none";
  // XXX Re-enable animControls
  EditorUI.reset();
}

EditorUI.sendFail = function(code) {
  switch (code) {
    case ParaPara.SEND_ERROR_NO_ANIMATION:
      // XXX Message to user?
      console.log("No animation");
      break;

    case ParaPara.SEND_ERROR_TIMEOUT:
      // XXX Prompt to re-try
      console.log("Timeout");
      break;

    case ParaPara.SEND_ERROR_FAILED_SEND:
      // XXX Give up
      console.log("Failed to send");
      break;

    case ParaPara.SEND_ERROR_NO_ACCESS:
      // XXX Prompt to retry
      console.log("No access");
      break;

    case ParaPara.SEND_ERROR_SERVER_ERROR:
      // XXX Prompt to retry
      console.log("Server error");
      break;

    default:
      console.log("Unknown error");
      break;
  }
  // XXX Display failure message that stays
  // XXX Re-enable animControls
}

EditorUI.reset = function() {
  document.getElementById("frameControls").style.display = "";
  // XXX Clear canvas
  // XXX Reset tool state? At very least, make sure the pencil is selected
  //     Probably should reset the speed dial too
}

// -------------- Tools -----------

EditorUI.initTools = function() {
  EditorUI.initButtonGroup("toolButton", EditorUI.changeTool, 0);
}

EditorUI.changeTool = function(button) {
  var button = EditorUI.selectButtonInGroup(button, "toolButton");
  if (!button)
    return;

  var controlSets = document.getElementsByClassName("controlSet");
  for (var i = 0; i < controlSets.length; i++) {
    controlSets[i].style.display = "none";
  }
  if (button.id == "pencilTool") {
    ParaPara.setDrawMode();
    var drawControls = document.getElementById("drawControls");
    drawControls.style.display = "inline";
  } else if (button.id ="eraserTool") {
    ParaPara.setEraseMode();
    var eraseControls = document.getElementById("eraseControls");
    eraseControls.style.display = "inline";
  } else {
    console.assert("Unknown tool selected");
  }
}

// -------------- Stroke width -----------

EditorUI.initStrokeWidths = function() {
  EditorUI.initButtonGroup("strokeWidthButton", EditorUI.changeStrokeWidth, 1);
}

EditorUI.changeStrokeWidth = function(button) {
  var button = EditorUI.selectButtonInGroup(button, "strokeWidthButton");
  if (!button)
    return;
  ParaPara.currentStyle.strokeWidth = EditorUI.getStrokeWidthFromButton(button);
}

EditorUI.getStrokeWidthFromButton = function(elem) {
  var circles = elem.getElementsByTagName("circle");
  if (!circles.length)
    return "4";
  return parseFloat(circles[0].getAttribute("r")) * 2;
}

// -------------- Colors -----------

EditorUI.initColors = function() {
  EditorUI.initButtonGroup("colorButton", EditorUI.changeColor, 0);
}

EditorUI.changeColor = function(button) {
  var button = EditorUI.selectButtonInGroup(button, "colorButton");
  if (!button)
    return;
  ParaPara.currentStyle.currentColor = EditorUI.getColorFromButton(button);
}

EditorUI.getColorFromButton = function(elem) {
  var elemsWithAFill = elem.querySelectorAll("*[fill]");
  if (!elemsWithAFill.length)
    return "black";
  return elemsWithAFill[0].getAttribute("fill");
}

// -------------- Erase width -----------

EditorUI.initEraseWidths = function() {
  EditorUI.initButtonGroup("eraseWidthButton", EditorUI.changeEraseWidth, 1);
}

EditorUI.changeEraseWidth = function(button) {
  var button = EditorUI.selectButtonInGroup(button, "eraseWidthButton");
  if (!button)
    return;
  ParaPara.eraseControls.setBrushWidth(
    EditorUI.getStrokeWidthFromButton(button));
}

// -------------- Common button handling -----------

EditorUI.initButtonGroup = function(className, handler, selectedIndex) {
  var buttons = document.getElementsByClassName(className);
  for (var i = 0; i < buttons.length; i++) {
    var button = buttons[i];
    button.addEventListener("click",
      function(evt) { handler(evt.target); }, false);
  }
  if (selectedIndex <= buttons.length - 1) {
    handler(buttons[selectedIndex]);
  }
}

EditorUI.selectButtonInGroup = function(evtTarget, className) {
  var button;
  for (button = evtTarget;
       button && button.tagName != "BUTTON";
       button = button.parentNode);
  if (!button)
    return null;

  var buttons = document.getElementsByClassName(className);
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove("active");
  }
  button.classList.add("active");
  button.blur(); // Get rid of outline that appears on tablets
                 // (unfortunately outline:none doesn't seem to work)
  return button;
}

// -------------- Speed control -----------

EditorUI.changeSpeed = function(sliderValue) {
  if (!ParaPara.animator)
    return;
  ParaPara.animator.setSpeed(sliderValue);
}

// -------------- UI layout -----------

EditorUI.updateLayout = function() {
  var controlsHeight = 0;
  var controls = document.getElementsByClassName("controls");
  for (var i = 0; i < controls.length; i++) {
    controlsHeight += controls[i].offsetHeight;
  }
  var availHeight = window.innerHeight - controlsHeight;
  var availWidth  = window.innerWidth;
  // The minus 8 is a fudge factor to get rid of scrollbars
  var maxDim = Math.min(availHeight, availWidth) - 8;
  // Update the width of the containing block
  var container = document.getElementsByClassName("container")[0];
  container.style.setProperty("width", maxDim + "px", "");
  // Set the SVG canvas size explicitly. This is mostly for WebKit
  // compatibility. Otherwise we could just set the <svg> width/height to
  // 100%
  var canvas = document.getElementById("canvas");
  canvas.style.setProperty("width", maxDim + "px", "");
  canvas.style.setProperty("height", maxDim + "px", "");
  // Resize slider
  var speedAdjust = document.getElementById("speedAdjust");
  speedAdjust.style.setProperty("width", maxDim * 0.8 + "px", "");
  // If we have extra vertical space, centre vertically
  if (availHeight > availWidth) {
    container.style.setProperty("padding-top",
      (availHeight - maxDim) / 2 + "px", "");
  } else {
    container.style.removeProperty("padding-top");
  }
  EditorUI.updateStrokeWidth(maxDim);
}
window.addEventListener("resize", EditorUI.updateLayout, false);
window.addEventListener("orientationchange", EditorUI.updateLayout, false);

// As the SVG resizes, keep the stroke width icons in sync
EditorUI.updateStrokeWidth = function(svgDim) {
  // The SVG viewBox is 300x300 so get its current scale ratio
  var svgScaleRatio = svgDim / 300;
  // Work out the actual dimension of the icon (we might tweak the width,
  // so use the height)
  var svgs = document.querySelectorAll("button.strokeWidthButton svg");
  if (!svgs.length)
    return;
  var height = parseFloat(window.getComputedStyle(svgs[0], null).
                 getPropertyValue('height'));
  // Go through each button's svg and adjust the viewBox accordingly.
  var viewBoxSize = height / svgScaleRatio;
  var minDim = -viewBoxSize / 2;
  var viewBox = [minDim, minDim, viewBoxSize, viewBoxSize].join(" ");
  for (var i = 0; i < svgs.length; i++) {
    svgs[i].setAttribute("viewBox", viewBox);
  }
}
