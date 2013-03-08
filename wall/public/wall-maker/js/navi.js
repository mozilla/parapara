/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Navigation
 */

var Navigation =
{
  newRe:              /(^|\/)new$/,
  wallRe:             /(^|\/)wall\/(\d+)$/,
  wallReOptionalHash: /(^|\/)wall\/(\d+)($|#)/,

  goToScreen: function (path) {
    var absPath = path.indexOf(WallMaker.rootUrl) === 0
                ? path
                : WallMaker.rootUrl + '/' + path;
    // For the management screen we don't want to generate history entries every
    // time we change tab so if we're already looking at a management screen,
    // just update the history location
    if (document.location.pathname.match(Navigation.wallRe) &&
        path.match(Navigation.wallReOptionalHash)) {
      history.replaceState({}, null, absPath);
    } else {
      history.pushState({}, null, absPath);
    }
    Navigation.goToCurrentScreen();
  },

  // Loads the screen at the current path and screen (if set).
  //
  // The path is read from document.location and hence this should be updated
  // before calling this function.
  goToCurrentScreen: function() {
    var path = document.location.pathname;

    if (path.match(Navigation.newRe)) {
      screenId = "screen-new";
    } else if (path.match(Navigation.wallRe)) {
      screenId = "screen-manage";
      var wallId = RegExp.$2;
      var tab = document.location.hash.substr(1);
      ManageWallController.show(wallId, tab);
    } else {
      screenId = "screen-home";
    }

    Navigation.showScreen(screenId);
  },

  // Displays the selected screen
  showScreen: function(screenId) {
    var screens = document.getElementsByClassName("screen");
    for (var i = 0; i < screens.length; i++) {
      var screen = screens[i];
      if (screen.id == screenId) {
        screen.setAttribute("aria-hidden", "false");
      } else {
        screen.setAttribute("aria-hidden", "true");
      }
    }
  },

  getCurrentScreen: function() {
    return document.querySelector(".screen[aria-hidden=true]");
  },

  showErrorPage: function(msg, buttons) {
    // Set error message
    var msgBlock = document.querySelector("#screen-error .errorMessage");
    msgBlock.innerHTML = msg;

    // Show the return if 'buttons' is not provided or if it is explicitly set
    // to true
    var returnButton = document.querySelector("#screen-error .return");
    returnButton.setAttribute('aria-hidden',
      (!buttons || (buttons && buttons['return'])) ? 'false' : 'true');

    // Show retry button if set and adjust its handler
    var retryButton = document.querySelector("#screen-error .retry");
    if (buttons && buttons['retry']) {
      retryButton.setAttribute('aria-hidden', 'false');
      retryButton.onclick = buttons['retry'];
    } else {
      retryButton.setAttribute('aria-hidden', 'true');
    }

    // Switch to the screen
    Navigation.showScreen("screen-error");
  },

  init: function() {
    // Register link handlers
    Navigation.registerLinkHandler('new',
      function() {
        CreateWallController.start();
        Navigation.goToScreen("new");
      });
    Navigation.registerLinkHandler('login',
      function() { LoginController.login(); });
    Navigation.registerLinkHandler('logout',
      function() { LoginController.logout(); });
    Navigation.registerLinkHandler('',
      function() { Navigation.goToScreen(''); });

    // Handle history changes (e.g. using the back button)
    window.addEventListener('popstate',
      function(evt) {
        if (LoginController.isLoggedIn()) {
          Navigation.goToCurrentScreen();
        } else {
          LoginController.loggedOut();
        }
      },
      false);

    // Restore old session
    LoginController.relogin();
  },

  registerLinkHandler: function(href, handler) {
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
};

window.addEventListener('load', Navigation.init, false);
