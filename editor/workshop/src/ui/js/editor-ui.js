/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var EditorUI = EditorUI || {};

EditorUI.MIN_SPEED_FPS     = 0.65;
EditorUI.MAX_SPEED_FPS     = 12.5;
EditorUI.INITIAL_SPEED_FPS = 3.3;
EditorUI.SPEED_STEP_FPS    = 0.3;

EditorUI.LONG_PRESS_DELAY_MS = 350;
EditorUI.LONG_PRESS_RATE_MS  = 120;

EditorUI.UPLOAD_PATH       = "api/upload_anim.php";
EditorUI.SEND_EMAIL_PATH   = "api/email_anim.php";

EditorUI.init = function() {
  var paraparaRoot = document.getElementById("parapara");
  ParaPara.init(paraparaRoot);
  EditorUI.editMode = 'draw'; // 'draw' | 'animate'
  EditorUI.stillPressing = false;
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
  // This method gets called on init and ALSO on reset. Therefore, we must
  // assume it will be called multiple times. When adding event listeners we
  // must be sure to pass exactly the same function object so that
  // addEventListener can detect the duplicate and filter it out. If we use
  // function objects generated on the fly we'll end up accumulating event
  // listeners and, at best, getting slower and slower.
  EditorUI.initColors();
  EditorUI.initWidths();
  EditorUI.initTools();
  EditorUI.initFrameControls();
  EditorUI.initNavControls();
  EditorUI.initAnimControls();

  EditorUI.currentSpeed = EditorUI.INITIAL_SPEED_FPS;

  // Add a catch-all handler to call preventDefault on mouse events.
  // This is necessary for disabling the chrome that flies in from offscreen
  // when you drag in old versions of the Fennec tablet UI (i.e. Firefox 9-ish)
  var container = document.getElementById("container");
  container.addEventListener("mousemove", EditorUI.catchAll, false);
  container.addEventListener("touchmove", EditorUI.catchAll, false);
}

EditorUI.catchAll = function(e) {
  e.preventDefault();
}

// -------------- Navigation -----------

EditorUI.animate = function() {
  EditorUI.editMode = 'animate';

  ParaPara.animate(EditorUI.currentSpeed);
  document.getElementById("play").contentDocument.showPause();
  EditorUI.showAnimControls();
}

EditorUI.returnToEditing = function() {
  EditorUI.editMode = 'draw';

  ParaPara.removeAnimation();
  document.getElementById("play").contentDocument.showPlay();
  EditorUI.hideAnimControls();
}

EditorUI.reset = function() {
  document.forms[0].reset();
  document.forms[1].reset();
  ParaPara.reset();
  if (EditorUI.editMode != 'draw') {
    EditorUI.returnToEditing();
  }
  EditorUI.initControls();
}

// -------------- Sending -----------

EditorUI.promptMetadata = function() {
  EditorUI.displayNote("noteMetadata");
}

EditorUI.send = function() {
  EditorUI.displayNote("noteSending");
  var metadata = {};
  metadata.title  = document.forms[0].title.value.trim();
  metadata.author = document.forms[0].name.value.trim();
  ParaPara.send(EditorUI.UPLOAD_PATH, EditorUI.sendSuccess, EditorUI.sendFail,
                metadata);
}

EditorUI.getRadioValue = function(radio) {
  for (var i = 0; i < radio.length; ++i) {
    if (radio[i].checked)
      return radio[i].value;
  }
  return undefined;
}

EditorUI.sendSuccess = function(response) {
  EditorUI.displayNote("noteSendingComplete");
  if (response.url) {
    // If we have a URL, prepare the sharing screen to be shown after the
    // success screen
    var parts = [];
    if (response.qrcode) {
      parts.push("<img src=\"" + response.qrcode + "\" class=\"qrcode\">");
    } else {
      var qr = new QRCode(0, QRCode.QRErrorCorrectLevel.M);
      qr.addData(response.url);
      qr.make();
      var image = qr.getImage(4 /*cell size*/);
      parts.push("<img src=\"" + image.data +
                 "\" width=\"" + image.width +
                 "\" height\"" + image.height +
                 "\" alt=\"" + response.url + "\">");
    }
    // We deliberately DON'T wrap the URL in an <a> element since we don't
    // really want users following the link and navigating away from the editor.
    // It's just there so they can copy it down into a notepad as a last resort.
    parts.push("<div class=\"url\">" + response.url + "</div>");
    parts.push("<input type=\"hidden\" name=\"animation-id\" value=\"" +
      response.id + "\">");
    var linkBlock = document.getElementById("animation-link");
    linkBlock.innerHTML = parts.join("");
    EditorUI.clearEmailForm();
    // Sharing screen is ready, queue it to display after the success note has
    // ended
    EditorUI.fadeNote(
      function() { EditorUI.displayNote("noteShare"); }
    );
    // EditorUI.reset() will be called when the sharing screen is dismissed
  } else {
    // No URL, just show success message
    EditorUI.fadeNote();
    EditorUI.reset();
  }
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
      console.debug("Server not live");
      break;

    default:
      EditorUI.displayNote("noteSendingFailed");
      console.debug("Unknown error");
      break;
  }
}

EditorUI.clearNoteAndReset = function() {
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

EditorUI.fadeNote = function(callback) {
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
  var onend = callback
    ? function(evt) { EditorUI.finishFade(evt); callback(); }
    : EditorUI.finishFade;
  currentNote.addEventListener("animationend", onend, false);
}

EditorUI.finishFade = function(evt) {
  evt.target.classList.remove("fadeOut");
  EditorUI.clearNote();
}

// -------------- Sending email -----------

EditorUI.clearEmailForm = function() {
  var form = document.forms["email-form"];
  form.reset();
  form.email.classList.add("placeholder");
  EditorUI.toggleEmailPlaceholder();
  EditorUI.clearEmailStatus();
}

EditorUI.toggleEmailPlaceholder = function() {
  var emailField = document.forms["email-form"].email;
  if (document.activeElement == emailField) {
    if (emailField.classList.contains("placeholder")) {
      emailField.value = "";
      emailField.classList.remove("placeholder");
    }
  } else if (!emailField.value) {
    emailField.classList.add("placeholder");
    emailField.value = "例：parapara@yahoo.co.jp";
    emailField.validity.valid = true;
  }
}

EditorUI.sendEmail = function() {
  EditorUI.clearEmailStatus();

  // If no email, ignore
  var emailField = document.forms["email-form"].email;
  var email = emailField.value.trim();
  if (!email || emailField.classList.contains("placeholder"))
    return;

  // Email address validation: For UAs that support HTML5 form validation, we
  // won't get this far if the address isn't valid. For other UAs, we'll just
  // rely on the server to do the validation.

  // Get ID for animation (stored in a hidden field)
  // (We send the ID rather than the animation URL so that people don't
  // commandeer the server to send arbitrary URLs)
  var animationId =
    parseInt(document.forms["email-form"].elements["animation-id"].value);
  if (!animationId) {
    EditorUI.setEmailStatus("failed");
    return;
  }

  // Disable submit button so we don't get double-submits from those who like to
  // double-click everything
  document.getElementById("email-button").disabled = true;

  // Send away
  EditorUI.setEmailStatus("waiting");
  ParaPara.sendEmail(email, animationId, EditorUI.SEND_EMAIL_PATH,
                     EditorUI.sendEmailSuccess, EditorUI.sendEmailFail);
}

EditorUI.clearEmailStatus = function() {
  EditorUI.setEmailStatus("");
}

EditorUI.setEmailStatus = function(statusClass) {
  var progressIcon = document.getElementById("email-progress");
  progressIcon.classList.remove("waiting");
  progressIcon.classList.remove("failed");
  progressIcon.classList.remove("ok");
  if (statusClass) {
    progressIcon.classList.add(statusClass);
  }
}

EditorUI.sendEmailSuccess = function() {
  // Clear email field for sending another email
  EditorUI.clearEmailForm();
  document.getElementById("email-button").disabled = false;

  // Update status
  EditorUI.setEmailStatus("ok");
}

EditorUI.sendEmailFail = function() {
  // Update status
  EditorUI.setEmailStatus("failed");
  document.getElementById("email-button").disabled = false;
}

// -------------- Colors -----------

EditorUI.initColors = function() {
  var picker = document.getElementById("picker");
  EditorUI.setColor(picker.contentDocument.getRandomColor());
  picker.contentDocument.addEventListener("colorchange", EditorUI.onColorChange,
                                          false);
}

EditorUI.onColorChange = function(evt) {
  if (EditorUI.editMode != 'draw') {
    EditorUI.returnToEditing();
  }
  var color = evt.detail.color;
  EditorUI.setColor(color);
  EditorUI.changeTool("pencil");
}

EditorUI.setColor = function(color) {
  ParaPara.currentStyle.currentColor = color;
  EditorUI.updateBrushPreviewColor(color);
}

EditorUI.updateBrushPreviewColor = function(color) {
  var widths = document.getElementById("widths");
  widths.contentDocument.setColor(color);
}

// -------------- Widths -----------

// Width values
EditorUI.widthTable = new Array();
EditorUI.widthTable[0] = 4;
EditorUI.widthTable[1] = 8;
EditorUI.widthTable[2] = 12;

EditorUI.initWidths = function() {
  var widths = document.getElementById("widths");
  ParaPara.currentStyle.strokeWidth = EditorUI.widthTable[1];
  ParaPara.currentStyle.eraseWidth = EditorUI.widthTable[1];
  widths.contentDocument.setWidth(1);
  widths.contentDocument.addEventListener("widthchange", EditorUI.onWidthChange,
                                          false);
}

EditorUI.onWidthChange = function(evt) {
  if (EditorUI.editMode != 'draw') {
    EditorUI.returnToEditing();
  }
  var width = evt.detail.width;
  console.assert(width >= 0 && width < EditorUI.widthTable.length,
                 "Out of range width value");
  var widthValue = EditorUI.widthTable[width];

  // Apply change
  if (ParaPara.getMode() === "draw")
    ParaPara.currentStyle.strokeWidth = widthValue;
  else
    ParaPara.currentStyle.eraseWidth = widthValue;
}

// -------------- Tools -----------

EditorUI.initTools = function() {
  var picker = document.getElementById("picker");
  picker.contentDocument.addEventListener("eraserselect", EditorUI.selectEraser,
                                          false);
  EditorUI.changeTool("pencil");
}

EditorUI.selectEraser = function() {
  if (EditorUI.editMode != 'draw') {
    EditorUI.returnToEditing();
  }
  EditorUI.changeTool("eraser");
}

EditorUI.showEraser = function() {
  var widths = document.getElementById("widths");
  widths.contentDocument.setEraserMode();
}

// tool = "pencil" | "eraser"
EditorUI.changeTool = function(tool) {
  var changed = false;
  switch (tool) {
    case "pencil":
      changed = ParaPara.setDrawMode();
      break;
    case "eraser":
      changed = ParaPara.setEraseMode();
      break;
  }
  if (!changed)
    return;

  // Update width picker
  switch (tool) {
    case "pencil":
      EditorUI.updateBrushPreviewColor(ParaPara.currentStyle.currentColor);
      break;
    case "eraser":
      EditorUI.showEraser();
      break;
  }
}

// -------------- Frame controls -----------

EditorUI.initFrameControls = function() {
  var filmstrip = document.getElementById("filmstrip");
  filmstrip.contentDocument.resetFrames();
  filmstrip.contentDocument.addEventListener("appendframe",
    EditorUI.appendFrame, false);
  filmstrip.contentDocument.addEventListener("selectframe",
    EditorUI.selectFrame, false);
  filmstrip.contentDocument.addEventListener("requestdelete",
    EditorUI.requestDeleteFrame, false);
  ParaPara.svgRoot.addEventListener("changegraphic",
    EditorUI.updateThumbnails, false);
}

EditorUI.appendFrame = function() {
  if (EditorUI.editMode != 'draw') {
    EditorUI.returnToEditing();
  }
  ParaPara.appendFrame();
  EditorUI.changeTool("pencil");
}

EditorUI.selectFrame = function(evt) {
  if (EditorUI.editMode != 'draw') {
    EditorUI.returnToEditing();
  }
  ParaPara.selectFrame(evt.detail.index);
}

EditorUI.requestDeleteFrame = function(evt) {
  if (EditorUI.editMode != 'draw') {
    EditorUI.returnToEditing();
  }
  var index = evt.detail.index;
  var callback = evt.detail.callback;
  document.getElementById("confirmDeleteButton").onclick =
    function() {
      EditorUI.clearNote();
      callback();
      ParaPara.deleteFrame(index);
    };
  EditorUI.displayNote("noteConfirmDelete");
}

EditorUI.updateThumbnails = function() {
  var currentFrame = ParaPara.getCurrentFrame();
  var filmstrip = document.getElementById("filmstrip");
  filmstrip.contentDocument.updateFrame(currentFrame.index, currentFrame.svg);
}

// -------------- Nav controls -----------

EditorUI.initNavControls = function() {
  var play = document.getElementById("play");
  play.contentDocument.addEventListener("click", EditorUI.toggleEditMode,
                                        false);
  play.contentDocument.showPlay();

  // iOS Safari seems to have trouble listening to click events on <object>
  // elements (at least for SVG) so we wrap the object in a <div> and listen on
  // that instead.
  var playContainer = document.getElementById("play-container");
  playContainer.addEventListener("click", EditorUI.toggleEditMode, false);
}

EditorUI.toggleEditMode = function() {
 if (EditorUI.editMode === 'draw') {
   EditorUI.animate();
 } else {
   EditorUI.returnToEditing();
 }
}

// -------------- Anim control -----------

EditorUI.initAnimControls = function() {
  var slower = document.getElementById("slower");
  var faster = document.getElementById("faster");
  if ('ontouchstart' in window) {
    slower.addEventListener("touchstart", EditorUI.onGoSlowTouch, false);
    faster.addEventListener("touchstart", EditorUI.onGoFastTouch, false);
  } else {
    slower.addEventListener("mousedown", EditorUI.onGoSlowPress, false);
    faster.addEventListener("mousedown", EditorUI.onGoFastPress, false);
  }

  var send = document.getElementById("send");
  send.addEventListener("click", EditorUI.promptMetadata, false);

  var animControls = document.getElementById("anim-controls");
  animControls.addEventListener("transitionend",
    EditorUI.finishAnimControlsFade, false);
  animControls.addEventListener("webkitTransitionend",
    EditorUI.finishAnimControlsFade, false);
  animControls.addEventListener("oTransitionend",
    EditorUI.finishAnimControlsFade, false);
  animControls.addEventListener("MSTransitionend",
    EditorUI.finishAnimControlsFade, false);
}

EditorUI.showAnimControls = function() {
  var animControls = document.getElementById("anim-controls");
  animControls.style.display = 'block';
  animControls.style.opacity = 1;
}

EditorUI.hideAnimControls = function() {
  document.getElementById("anim-controls").style.opacity = 0;
}

EditorUI.finishAnimControlsFade = function() {
  var animControls = document.getElementById("anim-controls");
  var opacity = parseInt(window.getComputedStyle(animControls).opacity);
  if (opacity === 0) {
    animControls.style.display = 'none';
  }
}

EditorUI.onGoSlowPress = function(evt) {
  EditorUI.beginLongPress(evt, EditorUI.goSlower, false);
}

EditorUI.onGoSlowTouch = function(evt) {
  EditorUI.beginLongPress(evt, EditorUI.goSlower, true);
}

EditorUI.goSlower = function() {
  var newSpeed = Math.max(EditorUI.currentSpeed - EditorUI.SPEED_STEP_FPS,
                          EditorUI.MIN_SPEED_FPS);
  if (newSpeed === EditorUI.currentSpeed) {
    EditorUI.vibrate(50);
  }
  EditorUI.setSpeed(newSpeed);
}

EditorUI.onGoFastPress = function(evt) {
  EditorUI.beginLongPress(evt, EditorUI.goFaster, false);
}

EditorUI.onGoFastTouch = function(evt) {
  EditorUI.beginLongPress(evt, EditorUI.goFaster, true);
}

EditorUI.goFaster = function() {
  var newSpeed = Math.min(EditorUI.currentSpeed + EditorUI.SPEED_STEP_FPS,
                          EditorUI.MAX_SPEED_FPS);
  if (newSpeed === EditorUI.currentSpeed) {
    EditorUI.vibrate(50);
  }
  EditorUI.setSpeed(newSpeed);
}

EditorUI.beginLongPress = function(evt, callback, isTouch) {
  evt.preventDefault();
  callback();
  EditorUI.stillPressing = true;
  if (isTouch) {
    document.addEventListener("touchend", EditorUI.finishLongTouch, false);
  } else {
    document.addEventListener("mouseup", EditorUI.finishLongPress, false);
  }
  window.setTimeout(
    function() { EditorUI.continueLongPress(callback); },
    EditorUI.LONG_PRESS_DELAY_MS);
}

EditorUI.continueLongPress = function(callback) {
  if (!EditorUI.stillPressing)
    return;
  callback();
  window.setTimeout(
    function() { EditorUI.continueLongPress(callback); },
    EditorUI.LONG_PRESS_RATE_MS);
}

EditorUI.finishLongPress = function() {
  EditorUI.stillPressing = false;
  document.removeEventListener("mouseup", EditorUI.finishLongPress, false);
}

EditorUI.finishLongTouch = function() {
  EditorUI.stillPressing = false;
  document.removeEventListener("touchend", EditorUI.finishLongTouch, false);
}

EditorUI.setSpeed = function(newSpeed) {
  if (newSpeed === EditorUI.currentSpeed)
    return;
  EditorUI.currentSpeed = newSpeed;
  if (!ParaPara.animator)
    return;
  ParaPara.animator.setSpeed(newSpeed);
}

EditorUI.vibrate = function(millis) {
  if (navigator.vibrate) {
    navigator.vibrate(millis);
  } else if (navigator.mozVibrate) {
    navigator.mozVibrate(millis);
  } else if (navigator.webkitVibrate) {
    navigator.webkitVibrate(millis);
  }
}

// -------------- UI layout -----------

EditorUI.updateLayout = function() {
  /*
   * We size the SVG manually. This is because we want to resize the viewBox for
   * the following reasons:
   *
   * a) Regardless of the size and orientation of the device, we want to keep
   *    the HEIGHT of the characters roughly the same. The width can flex as
   *    needed.
   * b) By resizing the viewbox, we can have graphics such as a ground pattern,
   *    with height / width 100% and be sure it will fill the viewable area
   *    regardless of the setting of preserveAspectRatio.
   *
   * In future I think we need to make the viewBox property settable via media
   * queries so you can have responsive graphics that change aspect ratio.
   */
  var controlsHeight = controlsWidth = 0;
  var controls = document.getElementsByClassName("controlPanel");
  for (var i = 0; i < controls.length; i++) {
    var panel = controls[i];
    // Check if the panel is oriented vertically or horizontally
    if (panel.offsetWidth < panel.offsetHeight) {
      controlsWidth += panel.offsetWidth;
    } else {
      controlsHeight += panel.offsetHeight;
    }
  }
  var availHeight = window.innerHeight - controlsHeight;
  var availWidth  = window.innerWidth - controlsWidth;
  // We need to account for the fact that we have a bit of overlap with the
  // control panel
  if (window.innerWidth > window.innerHeight) {
    availWidth += 15;
  } else {
    availHeight += 15;
  }
  var vbHeight = 300;
  var vbWidth = vbHeight * availWidth / availHeight;

  // Set the SVG canvas size explicitly.
  var canvas = document.getElementById("canvas");
  canvas.setAttribute("width", availWidth);
  canvas.setAttribute("height", availHeight);
  canvas.setAttribute("viewBox", [0, 0, vbWidth, vbHeight].join(" "));

  // Workaround Safari bugs regarding resizing SVG by setting the height of
  // referenced SVG files explicitly
  var contents = document.getElementsByClassName("panelContents");
  for (var i = 0; i < contents.length; i++) {
    var specifiedRatio =
      parseFloat(contents[i].getAttribute('data-aspect-ratio'));
    if (!specifiedRatio)
       continue;
    var style = window.getComputedStyle(contents[i]);
    var actualRatio = parseInt(style.width) / parseInt(style.height);
    // If the actual ratio differs from the specified ratio by more than 5%
    // update the height
    var error = Math.abs(specifiedRatio - actualRatio) / specifiedRatio;
    if (Math.abs(specifiedRatio - actualRatio) / specifiedRatio >= 0.05) {
      var adjustedHeight = parseInt(style.width) / specifiedRatio;
      contents[i].setAttribute("height", adjustedHeight);
    }
  }

  // Manually perform calc() behavior for browsers that don't support it
  var portrait = window.matchMedia("(orientation: portrait)").matches;
  var borders = document.getElementsByClassName("inner-border");
  for (var i = 0; i < borders.length; i++) {
    var border = borders[i];
    var style = window.getComputedStyle(border);
    var actualHeight = parseInt(style.height) || 0;
    var borderWidth =
      parseInt(style.getPropertyValue('border-top-width')) || 0;
    var margin = parseInt(style.getPropertyValue('margin-top')) || 0;
    var parentHeight = portrait
           ? parseInt(window.getComputedStyle(border.parentNode).height) || 0
           : window.innerHeight;
    var minHeight = parentHeight - (borderWidth + margin) * 2;
    if (actualHeight != minHeight) {
      border.style.height = minHeight + 'px';
    }
  }
}
window.addEventListener("resize", EditorUI.updateLayout, false);
window.addEventListener("orientationchange", EditorUI.updateLayout, false);
