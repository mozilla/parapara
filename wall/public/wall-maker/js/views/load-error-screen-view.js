/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'webL10n' ],
function($, _, Backbone, webL10n) {
  return Backbone.View.extend({
    el: $('#screen-load-error'),
    events: {
      "click .retry": "reload"
    },
    reload: function() {
      this.options.onreload();
    }
  });
});
