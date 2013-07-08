/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'webL10n' ],
function($, _, Backbone, webL10n) {
  return Backbone.View.extend({
    el: $('footer'),
    events: {
      "select #lang": "switchLanguage"
    },
    initialize: function() {
      $(window).on("localized", null, this.localized);
    },
    localized: function() {
      // Get the language we apparently applied
      var selectedLang = webL10n.getLanguage();
      var dir = webL10n.getDirection();

      // Check if we actually offer this language or if we fell back to the
      // default resource
      // XXX

      // Update document element -- this lets our CSS use language selectors
      // that reflect what language we're currently showing
      document.documentElement.lang = selectedLang;
      document.documentElement.dir = dir;

      // Update menu selection
      // XXX
    },
    switchLanguage: function() {
      // XXX
      // webL10n.setLanguage(...)
    },
  });
});
