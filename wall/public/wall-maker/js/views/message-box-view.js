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
        // Try keys in order:
        //   i.   prefix-key
        //   ii.  key
        //   iii. prefix
        var key =
          _.find(
            [ this.keyPrefix + '-' + this.messageKey,
              this.messageKey,
              this.keyPrefix ],
            function(candidate) {
              return !!webL10n.getData()[candidate]; }
          );
        var message = key ? webL10n.get(key) : "Something went wrong.";
        this.$el.html(message);
        this.$el.removeAttr('hidden');
      } else {
        this.$el.attr('hidden', 'hidden');
        this.$el.empty();
      }
    },
    setMessage: function(messageKey, keyPrefix) {
      this.messageKey = messageKey;
      this.keyPrefix  = keyPrefix;
      if (this.el) {
        this.render();
      }
    },
    clearMessage: function() {
      this.setMessage();
    }
  });
});
