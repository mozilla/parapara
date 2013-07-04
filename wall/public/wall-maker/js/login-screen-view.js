/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone' ],
function($, _, Backbone, webl10n) {
  return Backbone.View.extend({
    el: $('#screen-login'),
    setError: function(errorKey) {
      var errorBlock = this.$('#loginError');
      if (errorKey) {
        errorBlock.removeAttr('hidden');
        // XXXl10n Fetch message
        var message = errorKey;
        errorBlock.html(message);
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
