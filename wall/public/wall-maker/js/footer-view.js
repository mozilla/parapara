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
      $(window).on("localized", null, this.localized.bind(this));
    },
    localized: function() {
      // Get the language we apparently applied
      var selectedLang = webL10n.getLanguage();
      var dir = webL10n.getDirection();

      // When webL10n initially loads, it gets the language from
      // navigator.language and just applies whatever strings it can that match
      // this (including strings in the default '*' language).
      //
      // It then just returns whatever it got from navigator.language which may
      // not match any of the items in our list. Therefore, in order to find the
      // appropriate item to pre-select in our language drop-down we have to do
      // a bit of guessing about what got matched.
      //
      // For example, navigator.language was 'da' and there's no 'da' item in
      // the list, we should use the default language which is 'en' in this
      // case (this is just a hard-coded thing).
      //
      // On the other hand, a UA may report 'ja-JP' as the language. webL10n is
      // smart enough to match this with a resource for the 'ja' language. So,
      // we too, have to do a bit of that kind of matching.
      //
      // If we ever support bi-di languages this is going to get a lot harder.
      var selectedLangItem =
        this.el.querySelector(
          "select#lang option:lang(" + selectedLang.toLowerCase() + ")");
      if (!selectedLangItem) {
        var genericLang = selectedLang.replace(/-[a-z]+$/i, '');
        selectedLangItem =
          this.el.querySelector(
            "select#lang option:lang(" + genericLang.toLowerCase() + ")");
      }
      if (!selectedLangItem) {
        selectedLangItem = this.$("#lang option:lang(en)");
      }

      // Update direction to match language
      dir = selectedLangItem.dir || "ltr";

      // Update document element -- this lets our CSS use language selectors
      // that reflect what language we're currently showing
      document.documentElement.lang = selectedLang;
      document.documentElement.dir = dir;

      // Update menu selection
      this.$('select#lang').val(selectedLangItem.value);
    },
    switchLanguage: function() {
      // XXX
      // webL10n.setLanguage(...)
    },
  });
});
