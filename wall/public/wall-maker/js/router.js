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
      'walls/:wallid(/:section)': 'manageWall',
      'walls/:wallid/:section(/:subsection)': 'manageWall',
      'walls/:wallid/:section/:subsection/characters/:character': 'manageWall',
      '*actions': 'home'
    }
  });

  // Update the router's regexp management to allow a named segment to
  // terminate with a hash
  var toReplace  = /\(\[\^\\\/\]\+\)/g;
  WallmakerRouter.prototype._routeToRegExp = function(route) {
    // We want to replace "([^\/]+)" with "([^\/#]+)"
    var regex = Backbone.Router.prototype._routeToRegExp(route);
    var newRegex = regex.source.replace(toReplace, "([^\\/#]+)");
    return new RegExp(newRegex);
  };

  var initialize = function(login) {

    // Set up router
    var router = new WallmakerRouter();

    // Override fragment handling--we want to support BOTH paths and hashes.
    //
    // This means this app won't work properly with browsers that don't support
    // HTML's pushState API but that's ok.
    var trailingSlash = /\/$/;
    Backbone.history.getFragment = function(fragment, forcePushState) {
      if (fragment == null) {
        var hash = this.getHash();
        fragment = this.location.pathname
                 + (hash.length ? '#' + hash : '');
        var root = this.root.replace(trailingSlash, '');
        if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
      }
      return Backbone.History.prototype.getFragment(fragment, forcePushState);
    };

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
