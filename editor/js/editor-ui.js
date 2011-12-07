var EditorUI = EditorUI || {};

EditorUI.init = function() {
  var svgRoot = document.getElementById("canvas");
  ParaPara.init(svgRoot);
  EditorUI.initColors();
  EditorUI.updateLayout();
}
window.addEventListener("load", EditorUI.init, false);

// -------------- Navigation -----------

EditorUI.nextFrame = function() {
  ParaPara.addFrame();
}

EditorUI.finish = function() {
  document.getElementById("frameControls").style.display = "none";
  document.getElementById("animControls").style.display = "";
  var speedAdjust = document.getElementById("speedAdjust");
  ParaPara.animate(speedAdjust.value);
}

// -------------- Colors -----------

EditorUI.initColors = function() {
  var buttons = document.getElementsByClassName("colorButton");
  for (var i = 0; i < buttons.length; i++) {
    var button = buttons[i];
    button.addEventListener("click",
      function(evt) { EditorUI.changeColor(evt.target); }, false);
  }
  if (buttons.length) {
    EditorUI.changeColor(buttons[0]);
  }
}

EditorUI.changeColor = function(button) {
  var buttons = document.getElementsByClassName("colorButton");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove("active");
  }
  button.classList.add("active");
  button.blur(); // Get rid of outline that appears on tablets
                 // (unfortunately outline:none doesn't seem to work)
  ParaPara.currentStyle.currentColor = EditorUI.getColorFromButton(button);
}

EditorUI.getColorFromButton = function(elem) {
  var elemsWithAFill = elem.querySelectorAll("*[fill]");
  if (!elemsWithAFill.length)
    return "black";
  return elemsWithAFill[0].getAttribute("fill");
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
  var containers = document.getElementsByClassName("container");
  for (var i = 0; i < containers.length; i++) {
    containers[i].style.setProperty("width", maxDim + "px", "");
  }
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
    canvas.style.setProperty("margin-top",
      (availHeight - maxDim) / 2 + "px", "");
  } else {
    canvas.style.removeProperty("margin-top");
  }
}
window.addEventListener("resize", EditorUI.updateLayout, false);
window.addEventListener("orientationchange", EditorUI.updateLayout, false);
