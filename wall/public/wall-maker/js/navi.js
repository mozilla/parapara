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
    if (document.location.pathname.match(this.wallRe) &&
        path.match(this.wallReOptionalHash)) {
      history.replaceState({}, null, absPath);
    } else {
      history.pushState({}, null, absPath);
    }
    this.goToCurrentScreen();
  },

  // Loads the screen at the current path and screen (if set).
  //
  // The path is read from document.location and hence this should be updated
  // before calling this function.
  goToCurrentScreen: function() {
    var path = document.location.pathname;

    if (path.match(this.newRe)) {
      screenId = "screen-new";
      CreateWallController.show();
    } else if (path.match(this.wallRe)) {
      // Parse anchor refs but for managing we DON'T want to add history
      // references every time we switch tabs. This might need some changes
      // upstream.
      screenId = "screen-manage";
      var wallId = RegExp.$2;
      ManageWallController.show(wallId);
    } else {
      screenId = "screen-home";
    }

    this.showScreen(screenId);
  },

  // Displays the selected screen
  showScreen: function(screenId) {
    var screens = document.getElementsByClassName("screen");
    for (var i = 0; i < screens.length; i++) {
      var screen = screens[i];
      if (screen.id == screenId) {
        screen.style.display = "block";
      } else {
        screen.style.display = "none";
      }
    }
  },

  showErrorPage: function(msg) {
    var msgBlock = document.querySelector("#screen-error .error");
    msgBlock.innerHTML = msg;
    this.showScreen("screen-error");
  },

  init: function() {
    // Register link handlers
    this.registerLinkHandler('new',
      function() {
        CreateWallController.start();
        this.goToScreen("new");
      });
    this.registerLinkHandler('login', function() { LoginController.login(); });
    this.registerLinkHandler('logout',
                             function() { LoginController.logout(); });
    this.registerLinkHandler('', function() { Navigation.goToScreen(''); });

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

window.addEventListener('load', Navigation.init.bind(Navigation), false);
