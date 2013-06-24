/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'wallmaker/router',
         'wallmaker/login',
         'wallmaker/login-status-view',
         'wallmaker/link-watcher' ],
function ($, _, Backbone,
          WallmakerRouter,
          Login,
          LoginStatusView,
          LinkWatcher) {

  // Make the root URL available to all views (for templating)
  Backbone.View.appRoot = WallMaker.rootUrl;

  var init = function() {

    // Generic screen navigation function
    var toggleScreen = function(targetScreen) {
      $('div.screen').attr('hidden', 'hidden');
      targetScreen.removeAttr('hidden');
    };

    // Persistant views
    var loginStatusView = new LoginStatusView();

    // Login management
    var login = new Login({ sessionId: 'WMSESSID',
                            siteName: 'Parapara Animation' });
    login.on("login", function(email) {
      loginStatusView.loggedIn(email);
      toggleScreen($('#screen-loading'));
      // XXX Trigger load of user walls and designs (in parallel) and fill out
      // models
      // THEN do the following...
      Backbone.history.loadUrl();
    });

    login.on("loginerror", function(error, detail) {
      // XXX Show error block and fill in
      // $('loginError').show();
    });

    login.on("logout", function() {
      if (Backbone.history.started) {
        Backbone.history.stop();
      }

      // Show logged out view
      loginStatusView.loggedOut();
      toggleScreen($('#screen-login'));

      // XXX Clear all models

      // Clear all screens so user data is not available by inspecting the DOM
      _.each(userScreens, function (screen, index, array) {
        if (screen) {
          screen.$el.remove();
        }
        array[index] = null;
      });
    });

    // Screen navigation

    // Logged-in screens (cleared on logout)
    var userScreens =
      { wallsView: null,
        createWallView: null,
        manageWallView: null };

    // Set up router
    var router = WallmakerRouter.init(login);

    router.on("home",
      function() {
        toggleScreen($('screen-home'));
        /*
        if (!userScreens.wallsView) {
          userScreens.wallsView = new WallView(walls);
        }
        toggleScreen(userScreens.wallsView.render());
        */
      });
    /*
    router.on("new",
      function() {
        if (!userScreens.createWallView) {
          userScreens.createWallView = new CreateWallView(designs);
        }
        toggleScreen(userScreens.createWallView.render());
      });
    router.on("manageWall",
      function(wall, tab) {
        // XXX Download wall info
        if (!userScreens.manageWallView) {
          userScreens.manageWallView = new ManageWallView(wall, designs);
        } else {
          userScreens.manageWallView.model = wall;
        }
        toggleScreen(userScreens.manageWallView.render());
      });
    router.on("manageSession", function() { } );
    */

    // Link watching
    var linkWatcher = new LinkWatcher(WallMaker.rootUrl);
    linkWatcher.on("navigate", function(href) {
      switch (href) {
        case 'login':
          login.login();
          break;

        case 'logout':
          login.logout();
          break;

        default:
          Backbone.history.navigate(href, { trigger: true });
          break;
      }
    });

    // Restore previous login state
    login.init();
  };

  return { init: init };
});
