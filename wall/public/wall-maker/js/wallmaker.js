/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'wallmaker/router',
         'wallmaker/login',
         'wallmaker/normalize-xhr',
         'wallmaker/link-watcher',
         'collections/walls',
         'collections/designs',
         'views/language-selection-view',
         'views/home-screen-view',
         'views/login-status-view',
         'views/login-screen-view',
         'views/load-error-screen-view' ],
function ($, _, Backbone,
          Router,
          Login,
          NormalizeXHR,
          LinkWatcher,
          Walls,
          Designs,
          LanguageSelectionView,
          HomeScreenView,
          LoginStatusView,
          LoginScreenView,
          LoadErrorScreenView) {

  // Make the root URL available to all views (for templating)
  Backbone.View.appRoot = WallMaker.rootUrl;

  var initialize = function() {

    // Collections
    var walls;

    // Persistent views (not removed on logout)
    var fixedViews =
      { loginStatus:       new LoginStatusView(),
        loginScreen:       new LoginScreenView(),
        languageSelection: new LanguageSelectionView(),
        loadErrorScreen:   new LoadErrorScreenView(
                                 { onreload: loadCurrentPage } ) };

    // Login management
    var login = new Login({ sessionName: 'WMSESSID',
                            siteName: 'Parapara Animation' });
    login.on("login", function(email) {
      fixedViews.loginStatus.loggedIn(email);
      loadCurrentPage();
    });

    login.on("loginerror", function(error, detail) {
      fixedViews.loginScreen.setError(error);
      toggleScreen(fixedViews.loginScreen.$el);
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
      fixedViews.loginStatus.loggedOut();
      toggleScreen(fixedViews.loginScreen.$el);

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
      { homeScreen: null,
        createWallView: null,
        manageWallView: null };

    // Set up router
    var router = Router.initialize();

    router.on("route:home",
      function() {
        if (!userScreens.homeScreen) {
          userScreens.homeScreen = new HomeScreenView({ collection: walls });
        }
        toggleScreen(userScreens.homeScreen.render().$el);
      });

    /*
    router.on("route:new",
      function() {
        if (!userScreens.createWallView) {
          userScreens.createWallView = new CreateWallView(designs);
        }
        toggleScreen(userScreens.createWallView.render());
      });
    router.on("route:manageWall",
      function(wall, tab) {
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
          fixedViews.loginScreen.clearError();
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
    login.initialize();

    // Load the current page and any resources needed
    function loadCurrentPage() {
      // Show loading screen while we wait
      toggleScreen($('#screen-loading'));
      // If we haven't loaded common data needed for all pages, do that now
      if (!walls || !designs) {
        walls = new Walls();
        designs = new Designs();
        $.when(walls.fetch(), designs.fetch())
        .then(function() {
          var matched = Backbone.history.loadUrl();
        })
        .fail(function() {
          walls = undefined;
          toggleScreen($('#screen-load-error'));
        });
      } else {
        Backbone.history.loadUrl();
      }
    }

    // Generic screen navigation function
    function toggleScreen(targetScreen) {
      $('div.screen').attr('hidden', 'hidden');
      targetScreen.removeAttr('hidden');
    };

  };

  return { initialize: initialize };
});
