/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'webL10n' ],
function($, _, Backbone, webL10n) {
  return Backbone.View.extend({
    initialize: function() {
      $(window).on("localized", null, this.render.bind(this));
    },
    render: function() {
      if (this.messageKey) {
        // Setup message
        // Try keys in order:
        //   i.   prefix-key
        //   ii.  key
        //   iii. prefix
        var candidateKeys = this.messageOptions.keyPrefix
          ?  [ this.messageOptions.keyPrefix + '-' + this.messageKey,
               this.messageKey,
               this.messageOptions.keyPrefix ]
          : [ this.messageKey ];
        var key =
          _.find(candidateKeys,
            function(candidate) {
              return !!webL10n.getData()[candidate]; }
          );
        var message = key ? webL10n.get(key) : "Something went wrong.";
        this.$el.html(message);

        // Add dismissal button
        if (this.messageOptions.dismiss)
          this.$el.prepend('<button type="button" class="close"' +
            ' data-dismiss="alert">&times;</button>');

        // Update classes
        var container = this.$el;
        ['error', 'success', 'info'].forEach(
          function (category) { container.removeClass('alert-' + category); });
        container.addClass('alert-' + this.messageOptions.category);

        // Show
        this.$el.removeAttr('hidden');
      } else {
        this.$el.attr('hidden', 'hidden');
        this.$el.empty();
      }
    },
    setMessage: function(messageKey, options) {
      this.messageKey = messageKey;
      this.messageOptions =
        _.defaults(options || {}, { category: 'error', dismiss: false } );
      if (this.el) {
        this.render();
      }
    },
    clearMessage: function() {
      this.setMessage();
    }
  });
});
