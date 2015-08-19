<?php
/* vim: set syn=javascript: */
require_once("../../../wall/lib/parapara.inc");
header("Content-Type: application/javascript; charset=UTF-8");
?>
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var EditorUI = EditorUI || {};

// -------------- Constants -----------

// Speed control
EditorUI.MIN_SPEED_FPS     = 0.65;
EditorUI.MAX_SPEED_FPS     = 12.5;
EditorUI.INITIAL_SPEED_FPS = 3.3;
EditorUI.SPEED_STEP_FPS    = 0.3;

// UI key repeat control
EditorUI.LONG_PRESS_DELAY_MS = 350;
EditorUI.BACKGROUND_SELECT_DELAY_MS = 1500;
EditorUI.LONG_PRESS_RATE_MS  = 120;

// API paths
EditorUI.UPLOAD_SERVER = "<?php echo $config['editor']['upload_server']; ?>";

// -------------- Initialisation -----------

EditorUI.init = function() {
  var paraparaRoot = document.getElementById("parapara");
  ParaPara.init(paraparaRoot);
  EditorUI.editMode = 'draw'; // 'draw' | 'animate'
  EditorUI.stillPressing = false;
  EditorUI.initControls();
  EditorUI.updateLayout();

  // Check we have a wall to post to
  // (In future we'll just turn the "Send" button into a "Save" button in this
  // case)
  if (!EditorUI.getWallName()) {
    EditorUI.displayNote("noteNoWall");
  }
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
  EditorUI.initSettingsMenu();
  EditorUI.initKeyControls();

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

// -------------- Localization -----------

EditorUI.localized = function() {
  // Get the language we apparently applied
  var selectedLang = document.webL10n.getLanguage();
  var dir = document.webL10n.getDirection();

  // Temporary hack to replace ja-JP with ja.
  // XXX This needs to be incorporated into the matching below.
  if (selectedLang.toLowerCase() === "ja-jp") {
    selectedLang = "ja";
  }

  // Check if we actually offer this language or if we fell back to the default 
  // resource
  var selectedLangItem =
    document.querySelector(".settingsMenu li.lang:lang(" + selectedLang + ")");

  // If not, use the default language. This needs to be synced with locales.ini
  if (!selectedLangItem) {
    // NOTE: If we ever offer en-UK and en-US we'll need to make this reflect 
    // the default resource
    selectedLangItem =
      document.querySelector(".settingsMenu li.lang:lang(en)");
    selectedLang = "en";
    dir = "ltr";
  }

  // Update document element -- this lets our CSS use language selectors that 
  // reflect what language we're currently showing
  document.documentElement.lang = selectedLang;
  document.documentElement.dir = dir;

  // Update UI

  // Update menu selection
  var options = document.querySelectorAll(".settingsMenu li.lang")
  for (var i = 0; i < options.length; i++) {
    options[i].setAttribute("aria-checked",
      options[i] === selectedLangItem ? "true" : "false");
  }

  // Update summary icon
  var summarySpan = document.getElementById("langSummary");
  summarySpan.setAttribute("lang", selectedLang);
  summarySpan.textContent = selectedLangItem.textContent.trim();
}
window.addEventListener('localized', EditorUI.localized, false);

// Set the preferred language on the document
//
// We need to do this before webL10n does its start-up sequence which is 
// triggered by the DOMContentLoaded event. That means that *this* script should
// not be included as async or defer to ensure the following runs before 
// DOMContentLoaded is fired on webL10n.
//
// (The alternative, detecting if webL10n has started or not, and whether it has
// started but is still waiting for resources to load, far more complex.)
{
  var preferredLang = localStorage.getItem("preferredLang");
  if (preferredLang !== null) {
    document.documentElement.lang = preferredLang;
  }
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

EditorUI.getWallName = function() {
  var wallName = document.location.pathname.replace(/^\//, '');
  // Test the wall name is at least one char long and has no slashes or dots
  return /^[^\/.]+$/.test(wallName) ? wallName : null;
}

// -------------- Sending -----------

EditorUI.promptMetadata = function() {
  // We pause animations before putting up prompts because Fennec (14) flickers 
  // pretty badly when we overlay stuff on top of the animation.
  ParaPara.pauseAnimation();
  EditorUI.displayNote("noteMetadata");
}

EditorUI.send = function() {
  EditorUI.displayNote("noteSending");
  var metadata = {};
  metadata.title  = document.forms[0].title.value.trim();
  metadata.author = document.forms[0].name.value.trim();

  // Build path
  var server   = EditorUI.UPLOAD_SERVER.replace(/\/$/, '');
  var wallName = EditorUI.getWallName();
  if (!wallName) {
    console.log("Bad wall name");
    EditorUI.sendFail('no-access');
    return;
  }
  var uploadPath =
    [server,'api','walls','byname',wallName,'characters'].join('/');

  ParaPara.send(uploadPath, EditorUI.sendSuccess, EditorUI.sendFail, metadata);
}

EditorUI.cancelSending = function() {
  ParaPara.abortRequest();
  EditorUI.returnToAnimation();
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
  var url = response.galleryUrlShort
          ? response.galleryUrlShort
          : response.galleryUrl;
  if (url) {
    // If we have a URL, prepare the sharing screen to be shown after the
    // success screen

    // Prepare email part of form
    if (response.emailUrl) {
      EditorUI.clearEmailForm();
      var form = document.forms["email-form"];
      form['email-url'].value = response.emailUrl;
    } else {
      EditorUI.hideEmailForm();
    }

    // Prepare the link block
    var parts = [];

    // Prepare QR code
    var qr = new QRCode(0, QRCode.QRErrorCorrectLevel.M);
    qr.addData(url);
    qr.make();
    var image = qr.getImage(4 /*cell size*/);
    parts.push("<img src=\"" + image.data +
               "\" width=\"" + image.width +
               "\" height\"" + image.height +
               "\" alt=\"" + url + "\">");

    // We deliberately DON'T wrap the URL in an <a> element since we don't
    // really want users following the link and navigating away from the editor.
    // It's just there so they can copy it down into a notepad as a last resort.
    parts.push("<div class=\"url\">" + url + "</div>");

    // Set the link block
    var linkBlock = document.getElementById("animation-link");
    linkBlock.innerHTML = parts.join("");

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

EditorUI.sendFail = function(key) {
  switch (key) {
    case 'no-animation':
      EditorUI.displayNote("noteNoAnimation");
      console.debug("No animation to send");
      break;

    case 'timeout':
      EditorUI.displayNote("noteSendingFailed");
      console.debug("Timed out sending animation");
      break;

    case 'send-fail':
      EditorUI.displayNote("noteSendingFailedFatal");
      console.debug("Failed to send animation");
      break;

    case 'no-access':
      EditorUI.displayNote("noteSendingFailed");
      console.debug("No access to remote server");
      break;

    case 'server-error':
      EditorUI.displayNote("noteSendingFailed");
      console.debug("Server error");
      break;

    case 'no-active-session':
      EditorUI.displayNote("noteNotActive");
      console.debug("No active session");
      break;

    default:
      EditorUI.displayNote("noteSendingFailed");
      console.debug("Sending failed:" + key);
      break;
  }
}

EditorUI.returnToAnimation = function() {
  EditorUI.clearNote();
  ParaPara.resumeAnimation();
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
  currentNote.addEventListener("webkitAnimationEnd", onend, false);
  currentNote.addEventListener("oanimationend", onend, false);
  currentNote.addEventListener("MSAnimationEnd", onend, false);
}

EditorUI.finishFade = function(evt) {
  evt.target.classList.remove("fadeOut");
  EditorUI.clearNote();
}

// -------------- Sending email -----------

EditorUI.clearEmailForm = function() {
  var form = document.forms["email-form"];
  form.reset();
  EditorUI.clearEmailStatus();
}

EditorUI.hideEmailForm = function() {
  var form = document.forms["email-form"];
  form.style.display = 'none';
}

EditorUI.sendEmail = function() {
  EditorUI.clearEmailStatus();

  // If no address, ignore
  var addressField = document.forms["email-form"].email;
  var address = addressField.value.trim();
  if (!address)
    return;

  // Email address validation: For UAs that support HTML5 form validation, we
  // won't get this far if the address isn't valid. For other UAs, we'll just
  // rely on the server to do the validation.

  // Get the URL to send to
  var emailUrl = document.forms["email-form"].elements["email-url"].value;
  if (!emailUrl) {
    // Generally we should hide the email field if there is no URL to send to so
    // if we're reaching here, something has gone unexpectedly wrong.
    console.warn("Email URL not valid");
    EditorUI.setEmailStatus("failed");
    return;
  }

  // Disable submit button so we don't get double-submits from those who like to
  // double-click everything
  document.getElementById("email-button").disabled = true;

  // Send away
  EditorUI.setEmailStatus("waiting");
  ParaPara.sendEmail(address, emailUrl, document.webL10n.getLanguage(),
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

EditorUI.sendEmailFail = function(key) {
  // Update status
  console.log("Failed to send email: " + key);
  EditorUI.setEmailStatus("failed");
  document.getElementById("email-button").disabled = false;
}

// -------------- Colors -----------

EditorUI.initColors = function() {
  var picker = document.getElementById("picker");
  EditorUI.setColor(picker.contentDocument.getRandomColor());
  picker.contentDocument.addEventListener("pencilselect", EditorUI.selectPencil,
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

EditorUI.onBackgroundColorChange = function(evt) {
  if (EditorUI.editMode != 'draw') {
    EditorUI.returnToEditing();
  }
  var color = evt.detail.color;
  EditorUI.setBackgroundColor(color);
}

EditorUI.setColor = function(color) {
  ParaPara.currentStyle.currentColor = color;
  EditorUI.updateBrushPreviewColor(color);
}

EditorUI.setBackgroundColor = function(color) {
  var background = document.querySelector(".canvas-background");
	background.style.backgroundColor = color;
}

EditorUI.updateBrushPreviewColor = function(color) {
  var widths = document.getElementById("widths");
  widths.contentDocument.setColor(color);
}

// -------------- Widths -----------

// Width values
EditorUI.strokeWidthTable = new Array();
EditorUI.strokeWidthTable[0] = 4;
EditorUI.strokeWidthTable[1] = 8;
EditorUI.strokeWidthTable[2] = 12;

EditorUI.eraseWidthTable = new Array();
EditorUI.eraseWidthTable[0] = 4;
EditorUI.eraseWidthTable[1] = 8;
EditorUI.eraseWidthTable[2] = 90;

EditorUI.initWidths = function() {
  var widths = document.getElementById("widths");
  ParaPara.currentStyle.strokeWidth = EditorUI.strokeWidthTable[1];
  ParaPara.currentStyle.eraseWidth = EditorUI.eraseWidthTable[1];
  widths.contentDocument.setWidth(1);
  widths.contentDocument.addEventListener("widthchange", EditorUI.onWidthChange,
                                          false);
}

EditorUI.onWidthChange = function(evt) {
  if (EditorUI.editMode != 'draw') {
    EditorUI.returnToEditing();
  }
  EditorUI.setWidth(evt.detail.width);
}

EditorUI.matchWidthToTool = function() {
  var widths = document.getElementById("widths");
  var currentWidth = widths.contentDocument.getWidth();
  EditorUI.setWidth(currentWidth);
}

EditorUI.setWidth = function(index) {
  var table = ParaPara.getMode() === "draw"
            ? EditorUI.strokeWidthTable
            : EditorUI.eraseWidthTable;
  console.assert(index >= 0 && index < table.length,
                 "Out of range width value");
  var widthValue = table[index];

  // Apply change
  if (ParaPara.getMode() === "draw") {
    ParaPara.currentStyle.strokeWidth = widthValue;
  } else {
    ParaPara.currentStyle.eraseWidth = widthValue;
  }
}

// -------------- Tools -----------

EditorUI.initTools = function() {
  var picker = document.getElementById("picker");
  picker.contentDocument.addEventListener("eraserselect", EditorUI.selectEraser,
                                          false);
  EditorUI.changeTool("pencil");
}

EditorUI.selectPencil = function(evt) {
  var hasThemeBackground = (EditorUI.getWallName() != "sandbox");
  if (hasThemeBackground) {
    EditorUI.onColorChange(evt);
  } else {
    var shortPressCallback = function() { EditorUI.onColorChange(evt) };
    var longPressCallback = function() { EditorUI.onBackgroundColorChange(evt) };
    EditorUI.beginPencilPress(evt, shortPressCallback, longPressCallback);
  }
}

EditorUI.beginPencilPress = function(evt, shortPressCallback, longPressCallback) {
  EditorUI.isLongPress = false;
  EditorUI.pencilPressListener = function(evt) {
    EditorUI.finishPencilPress(evt, shortPressCallback);
  }
  EditorUI.longPressTimer = setTimeout(
    function() {
      EditorUI.isLongPress = true;
      longPressCallback();
    },
    EditorUI.BACKGROUND_SELECT_DELAY_MS);
  var endEvent = evt.detail.eventType == "touchstart" ? "touchend" : "mouseup";
  evt.target.addEventListener(endEvent, EditorUI.pencilPressListener, false);
}

EditorUI.finishPencilPress = function(evt, shortPressCallback) {
  clearTimeout(EditorUI.longPressTimer);
  if (!EditorUI.isLongPress) {
    shortPressCallback();
  }
  evt.target.ownerDocument.removeEventListener(evt.type, EditorUI.pencilPressListener, false);
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
      EditorUI.matchWidthToTool();
      break;
    case "eraser":
      EditorUI.showEraser();
      EditorUI.matchWidthToTool();
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
  ParaPara.svgRoot.addEventListener("changehistory",
    EditorUI.updateFrame, false);
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

EditorUI.updateFrame = function(evt) {
  var filmstrip = document.getElementById("filmstrip").contentDocument;
  switch (evt.detail.cmd) {
    case 'insert':
      filmstrip.addFrame(false, evt.detail.index);
    case 'update':
      filmstrip.updateFrame(evt.detail.index, evt.detail.svg);
      break;
    case 'delete':
      filmstrip.removeFrame(evt.detail.index);
      break;
  }
  filmstrip.selectFrame(evt.detail.index);
}

// -------------- Nav controls -----------

EditorUI.initNavControls = function() {
  var play = document.getElementById("play");
  play.addEventListener("click", EditorUI.toggleEditMode, false);
  play.contentDocument.showPlay();
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
  send.addEventListener("touchend", EditorUI.promptMetadata, false);

  var animControls = document.getElementById("anim-controls");
  animControls.addEventListener("transitionend",
    EditorUI.finishAnimControlsFade, false);
  animControls.addEventListener("webkitTransitionEnd",
    EditorUI.finishAnimControlsFade, false);
  animControls.addEventListener("otransitionend",
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
  EditorUI.beginLongPress(evt, EditorUI.goSlower, EditorUI.LONG_PRESS_DELAY_MS);
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
  EditorUI.beginLongPress(evt, EditorUI.goFaster, EditorUI.LONG_PRESS_DELAY_MS);
}

EditorUI.goFaster = function() {
  var newSpeed = Math.min(EditorUI.currentSpeed + EditorUI.SPEED_STEP_FPS,
                          EditorUI.MAX_SPEED_FPS);
  if (newSpeed === EditorUI.currentSpeed) {
    EditorUI.vibrate(50);
  }
  EditorUI.setSpeed(newSpeed);
}

EditorUI.beginLongPress = function(evt, callback, delay) {
  evt.preventDefault();
  callback();
  EditorUI.stillPressing = true;
  var endEvent = evt.type == "touchstart" ? "touchend" : "mouseup";
  document.addEventListener(endEvent, EditorUI.finishLongPress, false);
  window.setTimeout(
    function() { EditorUI.continueLongPress(callback); },
    delay);
}

EditorUI.continueLongPress = function(callback) {
  if (!EditorUI.stillPressing)
    return;
  callback();
  window.setTimeout(
    function() { EditorUI.continueLongPress(callback); },
    EditorUI.LONG_PRESS_RATE_MS);
}

EditorUI.finishLongPress = function(evt) {
  EditorUI.stillPressing = false;
  document.removeEventListener(evt.type, EditorUI.finishLongPress, false);
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

// -------------- Settings menu -----------

EditorUI.initSettingsMenu = function() {
  // Init menu expansion
  var menus = document.getElementsByClassName("settingsMenu");
  for (var i = 0; i < menus.length; i++) {
    menus[i].addEventListener("click", EditorUI.toggleSettingsMenu, false);
  }

  // Init full-screen item
  var fullscreen = document.getElementById('full-screen-menu');
  // Full screen is currently disabled since there are the following bugs on 
  // mobile:
  // * 3 times out of 4 the window is position somewhat offset from the top-left
  //   making some UI inaccessible and the touch position not align with what is
  //   drawn
  // * Media queries on landscape mode don't appear to work---we get the wrong 
  //   set of pencils
  // * Overlays don't display while in full-screen mode (works on desktop)
  // * Check box glyphs are rendered as solid boxes
  if (false && (document.fullScreenEnabled ||
      document.mozFullScreenEnabled ||
      document.webkitFullScreenEnabled)) {
    fullscreen.addEventListener("click", EditorUI.toggleFullScreen, false);
    document.addEventListener("fullscreenchange", EditorUI.fullScreenChange, 
      false);
    document.addEventListener("mozfullscreenchange", EditorUI.fullScreenChange, 
      false);
    document.addEventListener("webkitfullscreenchange", 
      EditorUI.fullScreenChange, false);
  } else {
    fullscreen.style.display = "none";
  }

  // Init language menu
  EditorUI.initLangMenu();
}

EditorUI.toggleSettingsMenu = function(evt) {
  var details = evt.currentTarget.getElementsByTagName("details");
  if (!details.length)
    return;
  var details = details[0];

  if (details.hasAttribute("open")) {
    details.removeAttribute("open");
  } else {
    details.setAttribute("open", "open");
  } 
}

EditorUI.isFullScreen = function() {
  return !!document.fullscreenElement ||
         !!document.fullScreenElement ||
         !!document.mozFullScreenElement ||
         !!document.webkitFullScreenElement;
}

EditorUI.toggleFullScreen = function(evt) {
  if (EditorUI.isFullScreen()) {
    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
  } else {
    var elem = document.body;
    if (elem.requestFullScreen) {
      elem.requestFullScreen();
    } else if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullScreen) {
      elem.webkitRequestFullScreen();
    }
  }
}

EditorUI.fullScreenChange = function(evt) {
  var fullscreen = document.getElementById('full-screen-menu');
  fullscreen.setAttribute("aria-checked",
    EditorUI.isFullScreen() ? "true" : "false");
  EditorUI.updateLayout();
}

// -------------- Language menu -----------

EditorUI.initLangMenu = function() {
  var langOptions = document.querySelectorAll(".settingsMenu menu li.lang");
  for (var i = 0; i < langOptions.length; i++) {
    langOptions[i].addEventListener("click", EditorUI.selectLang, false);
  }
}

EditorUI.selectLang = function(evt) {
  var options = evt.currentTarget.parentNode.getElementsByTagName("li");
  var selectedLang;
  for (var i = 0; i < options.length; i++) {
    if (options[i] === evt.currentTarget) {
      selectedLang = options[i].getAttribute("lang");
      break;
    }
  }
  document.webL10n.setLanguage(selectedLang);
  localStorage.setItem("preferredLang", selectedLang);
}

// -------------- UI layout -----------

EditorUI.updateLayout = function() {
  // A bunch of hacks to work around limitations in layout on the Web platform.
  // Hopefully we can remove most or all of this code when:
  // a) CSS calc is widely implemented
  // b) CSS flexbox is widely available
  // c) SVG2 promotes viewbox to a CSS property
  // d) Safari on iOS resizes SVG files properly (fixed in iOS6???)

  EditorUI.updateSVGCanvasSize();
  EditorUI.updateToolbox();
  EditorUI.updateFilmstrip();
}
window.addEventListener("resize", EditorUI.updateLayout, false);
window.addEventListener("orientationchange", EditorUI.updateLayout, false);

EditorUI.updateSVGCanvasSize = function() {
  /*
   * We size the SVG manually. This is because regardless of the size and 
   * orientation of the device, we want to keep the HEIGHT of the characters 
   * roughly the same. The width can flex as needed.
   *
   * In future I think we need to make the viewBox property settable via media
   * queries so you can have responsive graphics that change aspect ratio.
   *
   * (I've proposed this for SVG 2 and, if I get time, will see to it that it 
   * gets added to the spec.)
   */
  var controlsHeight = controlsWidth = 0;
  var controls = document.getElementsByClassName("controlPanel");
  for (var i = 0; i < controls.length; i++) {
    var panel = controls[i];
    // Check if the panel is oriented vertically or horizontally
    if (panel.offsetHeight >= window.innerHeight) {
      controlsWidth += panel.offsetWidth;
    } else {
      controlsHeight += panel.offsetHeight;
    }
  }
  var availHeight = window.innerHeight - controlsHeight;
  var availWidth  = window.innerWidth - controlsWidth;
  var vbHeight = 300; // This is fixed
  var vbWidth = vbHeight * availWidth / availHeight;

  // There seems to be an invalidation bug in Fennec (Bug 887113) that causes 
  // a strip along the top of the canvas to not be rendered. We work around this
  // by shifting the canvas up and adjusting the viewbox accordingly.
  var overlap = 50;

  // Set the SVG canvas size explicitly.
  var canvas = document.getElementById("canvas");
  canvas.setAttribute("width", availWidth);
  canvas.setAttribute("height", availHeight + overlap);
  canvas.setAttribute("viewBox",
                      [0, -50, vbWidth, vbHeight + overlap].join(" "));
  if (overlap) {
    canvas.parentElement.style.marginTop = '-' + overlap + 'px';
  }
}

EditorUI.updateToolbox = function() {
  // This bunch of hacks is to compensate for:
  // * Lack of calc support in Safari on iOS 5.
  // * Safari on iOS 5's disregard for the intrinsic aspect ratio of SVG images
  // * Lack of enabled flexbox support in shipping browsers

  var portrait = window.matchMedia("(orientation: portrait)").matches;

  // First, determine and adjust the area we have to play with
  console.assert(document.getElementsByClassName("inner-border").length === 1,
    "More containers than expected");
  var border = document.getElementsByClassName("inner-border")[0];
  var borderStyle = window.getComputedStyle(border);
  var borderWidth =
    parseInt(borderStyle.getPropertyValue('border-top-width')) || 0;
  var borderMargin = parseInt(borderStyle.getPropertyValue('margin-top')) || 0;
  var parentHeight =
    parseInt(window.getComputedStyle(border.parentNode).height) || 0;
  var borderHeight = parentHeight - (borderWidth + borderMargin) * 2;
  border.style.height = borderHeight + 'px';
  var borderWidth = parseInt(borderStyle.getPropertyValue('width')) || 0;

  // Second, perform the following three steps for each panel:
  // - determine the available space to play with
  // - determine the preferred width/height of each panel and set the size
  //   (this fixes Safari)
  // - calculate the desired space required
  var availWidth  = borderWidth;
  var availHeight = borderHeight;
  var desiredWidth  = 0;
  var desiredHeight = 0;
  var contents = border.getElementsByClassName("panelContents");
  for (var i = 0; i < contents.length; i++) {
    var panel = contents[i];
    // Reset width/height set on element style
    // (This mostly matter when we switch between portait and landscape mode 
    // since we rely on one of the dimensions being set to some percentage of 
    // the available space)
    panel.style.width  = "";
    panel.style.height = "";
    var style = window.getComputedStyle(panel);
    var ratio = EditorUI.getAspectRatio(panel);
    if (portrait) {
      var hMargin = (parseFloat(style.paddingLeft) || 0) +
                    (parseFloat(style.paddingRight) || 0) +
                    (parseFloat(style.marginLeft) || 0) +
                    (parseFloat(style.marginRight) || 0);
      availWidth  -= hMargin;
      // In portrait mode, we simply say the picker has a minimum width of 40% 
      // of the available space which we can't calculate until later
      if (panel.id !== 'picker') {
        var desiredPanelWidth = parseFloat(style.height) * ratio;
        panel.style.width = desiredPanelWidth + 'px';
        desiredWidth += desiredPanelWidth;
      }
    } else {
      var vMargin = (parseFloat(style.paddingTop) || 0) +
                    (parseFloat(style.paddingBottom) || 0) +
                    (parseFloat(style.marginTop) || 0) +
                    (parseFloat(style.marginBottom) || 0);
      availHeight -= vMargin;
      var desiredPanelHeight = parseFloat(style.width) / ratio;
      panel.style.height = desiredPanelHeight + 'px';
      desiredHeight += desiredPanelHeight;
    }
  }

  // Handle the picker specially because it has unusual resizing behaviour in 
  // portrait mode
  var usedWidth = desiredWidth;
  if (portrait) {
    var picker = document.getElementById("picker");
    desiredWidth += availWidth * 0.45;
  }

  // Thirdly, if the desired space is less than the available space, do some 
  // scaling
  var avail   = portrait ? availWidth   : availHeight;
  var desired = portrait ? desiredWidth : desiredHeight;
  if (avail < desired) {
    var scale = avail / desired;
    usedWidth *= scale;
    for (var i = 0; i < contents.length; i++) {
      var panel = contents[i];
      var style = window.getComputedStyle(panel);
      var ratio = EditorUI.getAspectRatio(panel);
      if (portrait) {
        if (panel.id !== 'picker') {
          panel.style.width = parseFloat(style.height) * ratio * scale + 'px';
        }
      } else {
        panel.style.height = parseFloat(style.width) / ratio * scale + 'px';
      }
    }
  }

  // Make sure, after scaling, the picker still has the correct aspect ratio
  var picker = document.getElementById("picker");
  if (portrait) {
    // In portrait mode, the desired size of the picker is simply the remaining 
    // space
    var remainingWidth = availWidth - usedWidth;
    picker.style.width = remainingWidth - 1 + 'px';
  } else {
    var ratio = EditorUI.getAspectRatio(picker);
    picker.style.width = parseFloat(picker.style.height) * ratio + 'px';
  }
  // Needed for WebKit
  if (picker.contentDocument.updateViewbox) {
    picker.contentDocument.updateViewbox();
  }
}

EditorUI.getAspectRatio = function(panel) {
  // For the picker we just always return a fixed aspect ratio.
  // This is the ratio when the picker is in portrait orientation.
  // Somehow this just works.
  if (panel.id === 'picker') {
    return 0.6845;
  }
  var viewBox = panel.contentDocument.documentElement.getAttribute("viewBox");
  if (!viewBox) {
    // This can happen during loading when the contentDocument can be set to 
    // about:blank
    return 1;
  }
  var parts = viewBox.split(" ");
  return parseFloat(parts[2]) / parseFloat(parts[3]);
}

EditorUI.updateFilmstrip = function() {
  if (EditorUI.isCalcSupported())
    return;

  var filmstrip = document.getElementById("filmstrip");
  filmstrip.style.width = '100%';
  var settingsMenu = document.getElementsByClassName("settingsMenu")[0];
  filmstrip.style.width =
    parseFloat(window.getComputedStyle(filmstrip).width) -
    parseFloat(window.getComputedStyle(settingsMenu).width) + 'px';
}

EditorUI._calcSupported = null;

EditorUI.isCalcSupported = function() {
  if (EditorUI._calcSupported !== null)
    return EditorUI._calcSupported;

  // This code is based on Modernizr, used under MIT license
  // https://github.com/Modernizr/Modernizr/blob/master/feature-detects/css-calc.js
  var prop = 'width:';
  var value = 'calc(10px);';
  var el = document.createElement('div');

  el.style.cssText = prop + "-moz-" + value
                   + prop + "-webkit-" + value
                   + prop + value;

  EditorUI._calcSupported = !!el.style.length;
  return EditorUI._calcSupported;
};

// -------------- Key controls -----------
EditorUI.initKeyControls = function() {
  document.addEventListener("keydown", EditorUI.onKeyDown, false);
}

EditorUI.onKeyDown = function(evt) {
  if (evt.ctrlKey && (evt.key === 'z' || evt.keyIdentifier === 'U+005A' || evt.keyCode === 90)) {
    // Ctrl + Z
    ParaPara.history.undo();
  }
  if (evt.ctrlKey && (evt.key === 'y' || evt.keyIdentifier === 'U+0059' || evt.keyCode === 89)) {
    // Ctrl + Y
    ParaPara.history.redo();
  }
}
