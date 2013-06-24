/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery', 'underscore', 'backbone',
          'wallmaker/login',
          'wallmaker/login-status-view' ],
function($, _, Backbone, Login, LoginView) {
  var WallmakerRouter = Backbone.Router.extend({
    routes: {
      '/new': 'new',
      '/wall/:wallid(#*tab)': 'manageWall',
      '/wall/:wallid/session/:sessionid': 'manageSession',
      '*actions': 'home'
    }
  });

  var init = function(login) {

    // Set up router
    var router = new WallmakerRouter();

    // If we're not already logged-in, don't jump to the current URL since we
    // should show the login screen but keep the same URL.
    // Once login is complete, we'll jump to the current screen.
    var silent = !login.email;

    // We don't want to use hashes as a fallback since we use the hash
    // component to represent parts within a resource
    //  e.g. /wall/25#design
    Backbone.history.start(
      {
        pushState: true,
        hashChange: false,
        root: "/wall-maker/",
        silent: silent
      }
    );

    return router;
  };

  return { init: init };
});
