/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var WallMaker = WallMaker || {};

WallMaker.newRe                = /(^|\/)new$/;
WallMaker.manageRe             = /(^|\/)manage\/\d+$/;
WallMaker.manageReOptionalHash = /(^|\/)manage\/\d+($|#)/;

function goToScreen(path) {
  console.log("goToScreen: " + path);
  // For the management screen we don't want to generate history entries every
  // time we change tab so if we're already looking at a management screen, just
  // update the history location
  if (document.location.pathname.match(WallMaker.manageRe) &&
      path.match(WallMaker.manageReOptionalHash)) {
    history.replaceState({}, null, path);
  } else {
    history.pushState({}, null, path);
  }
  goToCurrentScreen();
}

// Loads the screen at the current path and screen (if set).
//
// The path is read from document.location and hence this should be updated
// before calling this function.
function goToCurrentScreen() {
  console.log("goToCurrentScreen");
  var path = document.location.pathname;

  if (path.match(WallMaker.newRe)) {
    screenId = "screen-new";
  } else if (path.match(WallMaker.manageRe)) {
    // Parse anchor refs but for managing we DON'T want to add history
    // references every time we switch tabs. This might need some changes
    // upstream.
  } else {
    screenId = "screen-home";
  }

  showScreen(screenId);
}

// Displays the selected screen
function showScreen(screenId, transition /*="none"*/) {
  console.log("showScreen " + screenId);
  transition = (typeof transition == "undefined") ? "none" : transition;

  var screens = document.getElementsByClassName("screen");
  for (var i = 0; i < screens.length; i++) {
    var screen = screens[i];
    if (screen.id == screenId) {
      screen.style.display = "block";
    } else {
      screen.style.display = "none";
    }
  }
}

function navInit() {
  // Handle links to "new"
  var links = document.querySelectorAll("a[href=\"new\"]");
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener(
      'click',
      function(evt) {
        evt.preventDefault ? evt.preventDefault() : evt.returnvalue = false;
        goToScreen("new");
      },
      false
    );
  }
  // Handle history changes (e.g. using the back button)
  // NOTE: Some browsers fire popstate on load, others don't. To provide
  // consistent behavior we don't register the listener until after page load.
  window.addEventListener('popstate', goToCurrentScreen, false);
}
window.addEventListener('load', navInit, false);
