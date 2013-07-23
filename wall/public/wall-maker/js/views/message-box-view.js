/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/base-view',
         'text!templates/message-box.html' ],
function(_, Backbone, webL10n, BaseView, template) {
  return BaseView.extend({
    events: {
      "click .retry": function() { this.trigger("retry"); },
      "click .return": function() { this.trigger("back"); }
    },
    render: function() {
      if (this.messageKey) {
        // Find message key
        //
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
            function(candidate) { return !!webL10n.getData()[candidate]; }
          );

        // Render
        this.renderTemplate(template,
          { messageKey: key,
            dismiss: this.messageOptions.dismiss,
            back: this.messageOptions.back,
            retry: this.messageOptions.retry });

        // Update classes
        var container = this.$el;
        ['error', 'success', 'info'].forEach(
          function (category) { container.removeClass('alert-' + category); });
        container.addClass('alert-' + this.messageOptions.category);

        // Show
        this.$el.removeAttr('hidden');
      } else {
        // Hide
        this.$el.attr('hidden', 'hidden');
        this.$el.empty();
      }

      return this;
    },
    setMessage: function(messageKey, options) {
      this.messageKey = messageKey;
      this.messageOptions =
        _.defaults(options || {},
                   { category: 'error',
                     dismiss: false,
                     retry: false,
                     back: false } );
      if (this.el) {
        this.render();
      }
    },
    clearMessage: function() {
      this.setMessage();
    }
  });
});
