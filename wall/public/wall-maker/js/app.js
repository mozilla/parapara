/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'bootstrap',
         'wallmaker/router',
         'wallmaker/login',
         'wallmaker/normalize-xhr',
         'wallmaker/link-watcher',
         'wallmaker/collections/walls',
         'wallmaker/collections/designs',
         'views/home-screen-view',
         'views/language-selection-view',
         'views/login-status-view',
         'views/login-screen-view',
         'views/manage-wall-screen-view',
         'views/message-box-view',
         'views/new-wall-screen-view' ],
function ($, _, Backbone, Bootstrap,
          Router,
          Login,
          NormalizeXHR,
          LinkWatcher,
          Walls,
          Designs,
          HomeScreenView,
          LanguageSelectionView,
          LoginStatusView,
          LoginScreenView,
          ManageWallScreenView,
          MessageBoxView,
          NewWallScreenView) {

  // Make the root URL available to all views (for templating)
  Backbone.View.appRoot = WallMaker.rootUrl;

  var initialize = function() {

    var self = this;

    // Collections
    var walls;

    // Persistent views (not removed on logout)
    var fixedViews =
      { loginStatus:        new LoginStatusView(),
        loginScreen:        new LoginScreenView(),
        languageSelection:  new LanguageSelectionView(),
        errorScreenMessage: new MessageBoxView(
                              { el: $('#screen-error .alert') }) };
    fixedViews.errorScreenMessage.on("retry", loadCurrentPage);

    // Logged-in screens (cleared on logout)
    var userScreens =
      { homeScreen: null,
        newWallScreen: null,
        manageWallScreen: null };

    // Login management
    this.login = new Login({ sessionName: 'WMSESSID',
                             siteName: 'Parapara Animation' });
    this.login.on("login", function(email) {
      fixedViews.loginStatus.loggedIn(email);
      loadCurrentPage();
    });

    this.login.on("loginerror", function(error, detail) {
      fixedViews.loginScreen.setError(error);
      toggleScreen(fixedViews.loginScreen.$el);
    });

    this.login.on("loginverify", function() {
      // This is called when the Persona window has closed and it is up to us to
      // verify the assertion. So we show a loading window while we wait.
      toggleScreen($('#screen-loading'));
    });

    this.login.on("logout", function() {
      if (Backbone.history.started) {
        Backbone.history.stop();
      }

      // Show logged out view
      fixedViews.loginStatus.loggedOut();
      toggleScreen(fixedViews.loginScreen.$el);

      // Clear all models
      walls = undefined;
      designs = undefined;

      // Clear all screens so user data is not available by inspecting the DOM
      _.each(userScreens, function (screen, index, array) {
        if (screen) {
          screen.remove();
        }
        array[index] = null;
      });
    });

    fixedViews.loginStatus.on("logout", function() {
      self.login.logout();
    });

    // Set up router
    var router = Router.initialize();

    router.on("route:home",
      function() {
        if (!userScreens.homeScreen) {
          userScreens.homeScreen = new HomeScreenView({ collection: walls });
          $('#page').append(userScreens.homeScreen.el);
        }
        toggleScreen(userScreens.homeScreen.render().$el);
      });

    router.on("route:new",
      function() {
        if (!userScreens.newWallScreen) {
          userScreens.newWallScreen = new NewWallScreenView(
            { designs: designs, walls: walls });
          $('#page').append(userScreens.newWallScreen.el);
        }
        toggleScreen(userScreens.newWallScreen.render().$el);
      });

    router.on("route:manageWall",
      function(wallId) {
        // Sanitize input
        wallId = wallId ? parseInt(wallId) : null;
        var wallScreen = userScreens.manageWallScreen;

        // Load wall
        if (!wallScreen || wallScreen.model.id !== wallId) {
          // Remove any old views
          if (wallScreen) {
            wallScreen.remove();
            userScreens.manageWallScreen = null;
          }
          // Fetch wall
          var wall = walls.get(wallId);
          if (!wall) {
            fixedViews.errorScreenMessage.setMessage('wall-not-found',
              { back: true });
            toggleScreen($('#screen-error'));
            return;
          }
          // Create and render screen
          wallScreen = userScreens.manageWallScreen =
            new ManageWallScreenView({ model: wall, designs: designs });
          $('#page').append(wallScreen.el);
          toggleScreen(wallScreen.render().$el);
        } else if (userScreens.manageWallScreen.$el.attr('hidden')) {
          // We already have a view for the requested wall but we're not
          // currently showing it.
          // Refresh its data and show it.
          wallScreen.refreshData();
          toggleScreen(wallScreen.$el);
        } else {
          // Currently we never navigate modal to modal so its safe to clear
          // this across the board.
          // (In the above branches toggleScreen does this.)
          clearModals();
        }

        // Switch to section
        wallScreen.showSection.apply(wallScreen,
          Array.prototype.slice.call(arguments, 1));

        // Watch for changes to the session and update the URL accordingly
        wallScreen.on('changed-session', function(sessionId) {
          var newUrl = 'walls/' + wallId + '/sessions'
                     + (sessionId ? '/' + sessionId : '');
          router.navigate(newUrl, { replace: true });
        });
      });

    // Link watching
    var linkWatcher = new LinkWatcher(WallMaker.rootUrl);
    var sessionPage = /^walls\/\d+\/sessions/;
    linkWatcher.on("navigate", function(href) {
      // If we navigate from one session page to another then we should not add
      // a new entry to the history
      var sessionPageMatch = sessionPage.exec(href);
      if (sessionPageMatch !== null &&
          Backbone.history.getFragment().indexOf(sessionPageMatch[0]) == 0) {
        router.navigate(href, { replace: true, trigger: true });
      } else {
        router.navigate(href, { trigger: true });
      }
    });

    // Adjust XHR handling to:
    //  - translate our error codes into AJAX errors
    //  - automatically log us out when the error code is 'logged-out'
    //  - automatically serialize objects as JSON (and adjusts content-type)
    //    for any data that hasn't been automatically converted to a string
    NormalizeXHR(Backbone.$, this.login);
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
    this.login.initialize();

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
          Backbone.history.loadUrl();
        })
        .fail(function() {
          walls = undefined;
          designs = undefined;
          fixedViews.errorScreenMessage.setMessage('load-error',
            { retry: true });
          toggleScreen($('#screen-error'));
        });
      } else {
        Backbone.history.loadUrl();
      }
    }

    // Generic screen navigation function
    function toggleScreen(targetScreen) {
      clearModals();
      $('div.screen').attr('hidden', 'hidden');
      targetScreen.removeAttr('hidden');
    };

    // Stop showing any modal dialogs
    function clearModals() {
      $("div.modal").modal("hide");
    }
  };

  return { initialize: initialize };
});
