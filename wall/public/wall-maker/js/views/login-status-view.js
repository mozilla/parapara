/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'views/base-view',
         'text!templates/login-status.html' ],
function($, _, Backbone, BaseView, template) {
  return BaseView.extend({
    el: $('#loginStatus'),
    events: {
      "click button": function() { this.trigger("logout"); }
    },
    email: null,
    render: function() {
      return this.renderTemplate(template, { email: this.email });
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
