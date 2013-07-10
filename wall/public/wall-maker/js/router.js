/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery', 'underscore', 'backbone',
          'wallmaker/login',
          'views/login-status-view' ],
function($, _, Backbone, Login, LoginView) {
  var WallmakerRouter = Backbone.Router.extend({
    routes: {
      'new': 'new',
      'wall/:wallid(#*tab)': 'manageWall',
      'wall/:wallid/session/:sessionid': 'manageSession',
      '*actions': 'home'
    }
  });

  var initialize = function(login) {

    // Set up router
    var router = new WallmakerRouter();

    // We don't want to use hashes as a fallback since we use the hash
    // component to represent parts within a resource
    //  e.g. /wall/25#design
    Backbone.history.start(
      {
        pushState: true,
        hashChange: false,
        root: "/wall-maker/",
        // We don't jump to the current URL until we finish logging in which we
        // assumed hasn't happened yet
        silent: true
      }
    );

    return router;
  };

  return { initialize: initialize };
});
