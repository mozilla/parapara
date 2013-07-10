/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'wallmaker/router',
         'wallmaker/login',
         'wallmaker/login-status-view',
         'wallmaker/login-screen-view',
         'wallmaker/footer-view',
         'wallmaker/collections/walls',
         'wallmaker/normalize-xhr',
         'wallmaker/link-watcher' ],
function ($, _, Backbone,
          WallmakerRouter,
          Login,
          LoginStatusView,
          LoginScreenView,
          FooterView,
          Walls,
          NormalizeXHR,
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
    var loginScreenView = new LoginScreenView();
    var footerView      = new FooterView();

    // Login management
    var login = new Login({ sessionName: 'WMSESSID',
                            siteName: 'Parapara Animation' });
    login.on("login", function(email) {
      loginStatusView.loggedIn(email);
      toggleScreen($('#screen-loading'));
      // XXX Trigger load of user walls and designs (in parallel) and fill out
      // models
      // THEN do the following...
      var walls = new Walls();
      walls.fetch({});
      Backbone.history.loadUrl();
    });

    login.on("loginerror", function(error, detail) {
      loginScreenView.setError(error);
      toggleScreen(loginScreenView.$el);
    });

    login.on("loginverify", function() {
      // This is called when the Persona window has closed and it is up to us to
      // verify the assertion. So we show a loading window while we wait.
      toggleScreen($('#screen-loading'));
    });

    login.on("logout", function() {
      if (Backbone.history.started) {
        Backbone.history.stop();
      }

      // Show logged out view
      loginStatusView.loggedOut();
      toggleScreen(loginScreenView.$el);

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
          loginScreenView.clearError();
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

    // Adjust XHR handling to:
    //  - translate our error codes into AJAX errors
    //  - automatically log us out when the error code is 'logged-out'
    //  - automatically serialize objects as JSON (and adjusts content-type)
    //    for any data that hasn't been automatically converted to a string
    NormalizeXHR(Backbone.$, login);
    Backbone.$.ajaxSetup(
      { checkForErrors: true,
        autoLogout: true,
        // Turn off automatic conversion of objects to strings since we will
        // convert objects to JSON in the normalization function
        processData: false,
        dataType: 'json',
        accepts: { json: 'application/json' },
        timeout: 8000
      }
    );

    // Restore previous login state
    login.init();
  };

  return { init: init };
});
