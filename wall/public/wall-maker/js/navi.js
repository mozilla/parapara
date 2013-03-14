/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Navigation
 */

var Navigation =
{
  init: function() {
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

  goToScreen: function (path) {
    // Normalize path
    var path = Navigation._normalizePath(path);

    // Handle pseudo-paths
    // (These paths don't actual alter history, they just trigger an action)
    if (path == 'login') {
      LoginController.login();
      return;
    } else if (path == 'logout') {
      LoginController.logout();
      return;
    }

    // Generate full path for updating history:
    //
    //   #abc -> <current-path>#abc
    //   abc -> <root>abc
    var fullPath = path.substr(0, 1) == '#'
                 ? document.location.pathname + path
                 : Navigation.rootUrl + path;

    // Currently we have the policy that we don't generate new history entries
    // for local hash changes.
    // We may revisit this as we add different kinds of navigation but at least
    // for the management screen we don't want to fill up the history every time
    // you click a tab.
    if (path.substr(0, 1) == "#") {
      history.replaceState({}, null, fullPath);
    } else {
      history.pushState({}, null, fullPath);
    }

    // Now show the screen
    Navigation.goToCurrentScreen();
  },

  // Loads the screen at the current path and screen (if set).
  //
  // The path is read from document.location and hence this should be updated
  // before calling this function.
  goToCurrentScreen: function() {
    // Get current path
    var path = Navigation._normalizePath(document.location.pathname);

    // The master routing table
    // (pseudo-paths are dealt with in goToScreen)

    // new
    if (path == 'new') {
      screenId = 'screen-new';
      CreateWallController.start();
    // wall/<id>#tab
    } else if (path.match(/wall\/(\d+)$/)) {
      var wallId = RegExp.$1;
      var tab    = document.location.hash.substr(1);
      // If we are already on the manage screen just update the tab
      // XXX This is not right. The wallId may be different
      if (Navigation._getCurrentlyShowingScreenId() == 'screen-manage') {
        ManageWallController.selectTab(tab);
        screenId = null;
      } else {
        ManageWallController.show(wallId, tab);
        screenId = "screen-manage";
      }
    // other
    } else {
      screenId = "screen-home";
    }

    if (screenId) {
      Navigation.showScreen(screenId);
    }
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

  // Normalize path to drop the root path.
  //
  // This makes us consistent since in markup we always use an absolute root
  // (e.g. '/wall-maker/wall/5')--that way the link works even if we don't
  // catch it.
  //
  // However, when calling internally we drop it for simplicity
  // (e.g. goToScreen('wall/5') )
  _normalizePath: function (path) {
    return path.indexOf(Navigation.rootUrl) === 0
           ? path.substring(Navigation.rootUrl.length)
           : path;
  },

  get rootUrl() {
    // Make sure the root URL DOES have a trailing slash
    return WallMaker.rootUrl.substr(-1) != '/'
           ? WallMaker.rootUrl + '/'
           : WallMaker.rootUrl;
  },

  _getCurrentlyShowingScreenId: function () {
    return document.querySelector('.screen[aria-hidden=false]').id;
  }
};

// Class to automatically handle clicks to all local links and redirect them to
// the appropriate screen
var LinkHandler =
{
  init: function(basePath) {
    this.basePath = basePath.substr(-1) != '/'
                  ? basePath + '/'
                  : basePath;

    // We store the handler.
    // This way we can continue to call addEventListener and as long as we pass
    // in this same object we will only register once per link.
    this.handler = this.handleLink.bind(this);

    // Register with all links currently in the document
    var links = document.getElementsByTagName("a");
    for (i = 0; i < links.length; i++) {
      this.possiblyAddListener(links[i]);
    }

    // Watch for new links, or links whose href has changed
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        switch (mutation.type) {
          case 'childList':
            var links = [];
            [].slice.call(mutation.addedNodes).forEach(
              function (newNode) {
                if (newNode.nodeType != Node.ELEMENT_NODE)
                  return;
                links =
                  links.concat(
                    [].slice.call(newNode.getElementsByTagName("a")));
              }.bind(this)
            );
            links.forEach(this.possiblyAddListener.bind(this));
            break;

          case 'attributes':
            this.possiblyAddListener(mutation.target);
            break;
        }
      }.bind(this));
    }.bind(this));
    observer.observe(document,
      { attributes: true,
        attributeFilter: [ 'href' ],
        childList: true,
        subtree: true }
    );
  },

  handleLink: function(evt) {
    // Don't follow the link
    // (Doing this first means we won't change page even if there is an
    // unhandled exception in the code that follows)
    evt.preventDefault ? evt.preventDefault() : evt.returnValue = false;

    // Go to the appropriate screen
    var href = evt.currentTarget.getAttribute('href');
    Navigation.goToScreen(href);
  },

  possiblyAddListener: function(elem) {
    if (elem.pathname.indexOf(this.basePath) == 0) {
      elem.addEventListener('click', this.handler, true);
    } else {
      elem.removeEventListener('click', this.handler, true);
    }
  },
};

window.addEventListener('load',
  function() { LinkHandler.init(WallMaker.rootUrl); }, false);
window.addEventListener('load', Navigation.init, false);
