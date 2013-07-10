/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'webL10n',
         'text!templates/login-status.html' ],
function($, _, Backbone, webL10n, template) {
  return Backbone.View.extend({
    el: $('#loginStatus'),
    email: null,
    render: function() {
      this.$el.html(_.template(template,
                    { email: this.email, appRoot: Backbone.View.appRoot }));
      webL10n.translate(this.el);
    },
    loggedIn: function(email) {
      this.email = email;
      this.render();
    },
    loggedOut: function() {
      this.email = null;
      this.render();
    }
  });
});
