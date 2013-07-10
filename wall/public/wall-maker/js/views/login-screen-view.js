/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'webL10n' ],
function($, _, Backbone, webL10n) {
  return Backbone.View.extend({
    el: $('#screen-login'),
    setError: function(errorKey) {
      var errorBlock = this.$('#loginError');
      if (errorKey) {
        var message;
        switch (errorKey) {
          case 'timeout':
            // Timeout, advise user to try again.
            message = webL10n.get('login-timeout-try-again');
            break;

          case 'login-fail':
            // Login failed, advise user to try again.
            message = webL10n.get('login-failed-try-again');
            break;

          default:
            // All others. Includes all sorts of internal errors with the
            // server. Not really worth trying again.
            message = webL10n.get('login-failed');
            break;
        }
        errorBlock.html(message);
        errorBlock.removeAttr('hidden');
      } else {
        errorBlock.attr('hidden', 'hidden');
        errorBlock.html();
      }
    },
    clearError: function() {
      this.setError();
    }
  });
});
