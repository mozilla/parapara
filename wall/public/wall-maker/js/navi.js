/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Navigation
 */

var WallMaker = WallMaker || {};

WallMaker.newRe                = /(^|\/)new$/;
WallMaker.manageRe             = /(^|\/)manage\/(\d+)$/;
WallMaker.manageReOptionalHash = /(^|\/)manage\/(\d+)($|#)/;

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
  var path = document.location.pathname;
//  console.log("goToCurrentScreen:"+path);

  if (path.match(WallMaker.newRe)) {
    screenId = "screen-new";
    CreateWallController.show();
  } else if (path.match(WallMaker.manageRe)) {
    // Parse anchor refs but for managing we DON'T want to add history
    // references every time we switch tabs. This might need some changes
    // upstream.
    screenId = "screen-manage";
    var wallId = RegExp.$2;
    ManageWallController.show(wallId);
  } else {
    screenId = "screen-home";
  }

  showScreen(screenId);
}

// Displays the selected screen
function showScreen(screenId, transition /*="none"*/) {
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
  // Register link handlers
  registerLinkHandler('new',
    function() {
      CreateWallController.start();
      goToScreen("new");
    });
  registerLinkHandler('login', function() { LoginController.login(); });
  registerLinkHandler('logout', function() { LoginController.logout(); });

  // Handle history changes (e.g. using the back button)
  window.addEventListener('popstate',
    function(evt) {
      if (LoginController.isLoggedIn()) {
        goToCurrentScreen();
      } else {
        LoginController.loggedOut();
      }
    },
    false);

  // Restore old session
  LoginController.relogin();
}
window.addEventListener('load', navInit, false);

function registerLinkHandler(href, handler) {
  var links = document.querySelectorAll(
    "a[href=\"" + WallMaker.rootUrl + '/' + href + "\"]");
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener(
      'click',
      function(evt) {
        evt.preventDefault ? evt.preventDefault() : evt.returnvalue = false;
        handler(evt);
      },
      false
    );
  }
}
