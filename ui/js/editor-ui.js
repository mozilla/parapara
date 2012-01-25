var EditorUI = EditorUI || {};

EditorUI.INITIAL_SPEED_FPS = 3.3;
EditorUI.UPLOAD_PATH       = "server/upload-success";

EditorUI.init = function() {
  var paraparaRoot = document.getElementById("parapara");
  ParaPara.init(paraparaRoot);
  EditorUI.initControls();
  // Disabling full-screen mode for now since:
  // a) there's no UI for it for tablets
  // b) it prevents our overlays from appearing
  /*
  var elem = document.getElementById("container");
  if (elem.requestFullScreen) {
    elem.requestFullScreen();
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullScreen) {
    elem.webkitRequestFullScreen();
  }
  */
  EditorUI.updateLayout();
}
window.addEventListener("load", EditorUI.init, false);

EditorUI.initControls = function() {
  EditorUI.initTools();
  EditorUI.initStrokeWidths();
  EditorUI.initColors();
  EditorUI.initEraseWidths();
  var speedAdjust = document.getElementById("speedAdjust");
  speedAdjust.value = EditorUI.INITIAL_SPEED_FPS;
}

// -------------- Navigation -----------

EditorUI.prevFrame = function() {
  ParaPara.prevFrame();
}

EditorUI.nextFrame = function() {
  var result = ParaPara.nextFrame();
  if (result.added)
    this.changeTool(document.getElementById("pencilTool"));
}

EditorUI.finish = function() {
  document.getElementById("toolBox").style.visibility = "hidden";
  document.getElementById("frameControls").style.display = "none";
  document.getElementById("animControls").style.display = "";
  EditorUI.updateLayout();
  var speedAdjust = document.getElementById("speedAdjust");
  ParaPara.animate(speedAdjust.value);
}

EditorUI.returnToEditing = function() {
  ParaPara.removeAnimation();
  document.getElementById("toolBox").style.visibility = "";
  document.getElementById("frameControls").style.display = "";
  document.getElementById("animControls").style.display = "none";
  EditorUI.updateLayout();
}

EditorUI.reset = function() {
  document.getElementById("toolBox").style.visibility = "";
  document.getElementById("frameControls").style.display = "";
  document.getElementById("animControls").style.display = "none";
  EditorUI.updateLayout();
  ParaPara.reset();
  EditorUI.initControls();
}

// -------------- Sending -----------

EditorUI.send = function() {
  EditorUI.displayNote("noteSending");
  // XXX get title and author -- leaving this until we have a design for this
  var metadata = {};
  metadata.title  = "タイトル";
  metadata.author = "名前";
  ParaPara.send(EditorUI.UPLOAD_PATH, EditorUI.sendSuccess, EditorUI.sendFail,
                metadata);
}

EditorUI.sendSuccess = function() {
  EditorUI.displayNote("noteSendingComplete");
  EditorUI.fadeNote();
  document.getElementById("animControls").style.display = "none";
  EditorUI.reset();
}

EditorUI.sendFail = function(code) {
  switch (code) {
    case ParaPara.SEND_ERROR_NO_ANIMATION:
      EditorUI.displayNote("noteNoAnimation");
      console.debug("No animation to send");
      break;

    case ParaPara.SEND_ERROR_TIMEOUT:
      EditorUI.displayNote("noteSendingFailed");
      console.debug("Timed out sending animation");
      break;

    case ParaPara.SEND_ERROR_FAILED_SEND:
      EditorUI.displayNote("noteSendingFailedFatal");
      console.debug("Failed to send animation");
      break;

    case ParaPara.SEND_ERROR_NO_ACCESS:
      EditorUI.displayNote("noteSendingFailed");
      console.debug("No access to remote server");
      break;

    case ParaPara.SEND_ERROR_SERVER_ERROR:
      EditorUI.displayNote("noteSendingFailed");
      console.debug("Server error");
      break;

    case ParaPara.SEND_ERROR_SERVER_NOT_LIVE:
      EditorUI.displayNote("noteNotLive");
      console.debug("Server error");
      break;

    default:
      EditorUI.displayNote("noteSendingFailed");
      console.debug("Unknown error");
      break;
  }
}

EditorUI.cancelSend = function() {
  EditorUI.clearNote();
  EditorUI.reset();
}

// -------------- Error messages -----------

EditorUI.displayNote = function(id) {
  var notes = document.getElementsByClassName("overlay-contents");
  for (var i = 0; i < notes.length; ++i) {
    var note = notes[i];
    note.style.display = note.id == id ? "block" : "none";
  }
  var overlay = document.getElementById("overlay");
  overlay.style.display = "";
}

EditorUI.clearNote = function() {
  var overlay = document.getElementById("overlay");
  overlay.style.display = "none";
}

EditorUI.fadeNote = function() {
  var notes = document.getElementsByClassName("overlay-contents");
  var currentNote = null;
  for (var i = 0; i < notes.length; ++i) {
    var note = notes[i];
    if (note.style.display !== "none") {
      currentNote = note;
      break;
    }
  }
  if (!currentNote)
    return;
  currentNote.classList.add("fadeOut");
  currentNote.addEventListener("animationend", EditorUI.finishFade, false);
}

EditorUI.finishFade = function(evt) {
  evt.target.classList.remove("fadeOut");
  EditorUI.clearNote();
}

// -------------- Tools -----------

EditorUI.initTools = function() {
  EditorUI.initButtonGroup("toolButton", EditorUI.changeTool, 0);
}

EditorUI.changeTool = function(buttonOrEvent) {
  var button = EditorUI.selectButtonInGroup(buttonOrEvent, "toolButton");
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

EditorUI.changeStrokeWidth = function(buttonOrEvent) {
  var button = EditorUI.selectButtonInGroup(buttonOrEvent, "strokeWidthButton");
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

EditorUI.changeColor = function(buttonOrEvent) {
  var button = EditorUI.selectButtonInGroup(buttonOrEvent, "colorButton");
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

EditorUI.changeEraseWidth = function(buttonOrEvent) {
  var button = EditorUI.selectButtonInGroup(buttonOrEvent, "eraseWidthButton");
  if (!button)
    return;
  ParaPara.currentStyle.eraseWidth = EditorUI.getStrokeWidthFromButton(button);
}

// -------------- Common button handling -----------

EditorUI.initButtonGroup = function(className, handler, selectedIndex) {
  var buttons = document.getElementsByClassName(className);
  for (var i = 0; i < buttons.length; i++) {
    var button = buttons[i];
    // addEventListener detects and ignores attempts to register the same event
    // listener twice (so long as we're not using an anonymous function)
    button.addEventListener("click", handler, false);
  }
  if (selectedIndex <= buttons.length - 1) {
    handler(buttons[selectedIndex]);
  }
}

EditorUI.selectButtonInGroup = function(evtTarget, className) {
  var button;
  if (evtTarget instanceof Event)
    evtTarget = evtTarget.target;
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
  var controlsHeight = controlsWidth = 0;
  var controls = document.getElementsByClassName("controls");
  for (var i = 0; i < controls.length; i++) {
    if (controls[i].classList.contains('vertical')) {
      controlsWidth += controls[i].offsetWidth;
    } else {
      controlsHeight += controls[i].offsetHeight;
    }
  }
  var availHeight = window.innerHeight - controlsHeight;
  var availWidth  = window.innerWidth - controlsWidth;
  var maxDim = Math.min(availHeight, availWidth);

  // Set the SVG canvas size explicitly. This is mostly for WebKit
  // compatibility. Otherwise we could just set the <svg> width/height to
  // 100%
  var canvas = document.getElementById("canvas");
  canvas.style.setProperty("width", maxDim + "px", "");
  canvas.style.setProperty("height", maxDim + "px", "");
  // Resize slider
  var speedAdjust = document.getElementById("speedAdjust");
  speedAdjust.style.setProperty("width", maxDim * 0.7 + "px", "");

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
