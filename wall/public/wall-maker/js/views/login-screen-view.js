/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'backbone',
         'wallmaker/app',
         'views/message-box-view' ],
function($, Backbone, app, MessageBoxView) {
  return Backbone.View.extend({
    el: $('#screen-login'),

    events: {
      "click #sign-in": "signIn"
    },

    initialize: function() {
      this.messageBoxView = new MessageBoxView();
      // Since we don't currently call 'render' on this view, we just directly
      // set the element on the subview (normally this happens in the call to
      // renderSubview)
      this.messageBoxView.setElement(this.$('#loginError'));
    },

    setError: function(errorKey) {
      // When we get a login-fail message it's usually an authentication problem
      // which is non-fatal so tell the user to try again.
      if (errorKey == "login-fail")
        errorKey = "try-again";
      this.messageBoxView.setMessage(errorKey, { keyPrefix: "login-failed" });
    },

    clearError: function() {
      this.setError();
    },

    signIn: function() {
      this.clearError();
      require("wallmaker/app").login.login();
    }
  });
});
