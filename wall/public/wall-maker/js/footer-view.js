/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'webL10n' ],
function($, _, Backbone, webL10n) {
  return Backbone.View.extend({
    initialLoad: true,
    el: $('footer'),
    events: {
      "change #lang": "switchLanguage"
    },
    initialize: function() {
      $(window).on("localized", null, this.localized.bind(this));
    },
    localized: function() {
      // Get the language we apparently applied
      var selectedLang = webL10n.getLanguage();
      var dir = webL10n.getDirection();

      // On the initial load we have to take care of two special behaviors:
      //
      //  (a) Restoring a previously selected language
      //  (b) Matching the UA language to something in the list
      //
      // Both of these are covered below.
      if (this.initialLoad) {
        // Reset initial load flag
        this.initialLoad = false;

        // (a) If this is the first load, check if we have a previously selected
        // language, and, if so, set that.
        var previousLanguage = localStorage.getItem("previousLanguage");
        if (previousLanguage !== null &&
            $('select#lang option:lang('+previousLanguage+')').length != 0) {
          webL10n.setLanguage(previousLanguage);
          // Calling setLanguage above will cause this function to be called
          // again so we can return early for now.
          return;
        }

        // (b) When webL10n initially loads, it gets the language from
        // navigator.language and just applies whatever strings it can that
        // match this (including strings in the default '*' language).
        //
        // It then just returns whatever it got from navigator.language which
        // may not match any of the items in our list. Therefore, in order to
        // find the appropriate item to pre-select in our language drop-down
        // we have to do a bit of guessing about what got matched.
        //
        // For example, if navigator.language was 'da' and there's no 'da'
        // item in the list, we should use the default language which is 'en'
        // in this case (this is just a hard-coded thing).
        //
        // On the other hand, the UA may report 'ja-JP' as the language.
        // webL10n is smart enough to match this with a resource for the 'ja'
        // language. So, we too, have to do a bit of that kind of matching.
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
          selectedLangItem = this.el.querySelector("#lang option:lang(en)");
        }
        selectedLang = selectedLangItem.value;

        // Update direction to match language
        dir = selectedLangItem.dir || "ltr";
      }

      // Update document element -- this lets our CSS use language selectors
      // that reflect what language we're currently showing
      document.documentElement.lang = selectedLang;
      document.documentElement.dir = dir;

      // Update menu selection
      this.$('select#lang').val(selectedLang);
    },
    switchLanguage: function(evt) {
      webL10n.setLanguage(evt.target.value);
      localStorage.setItem("previousLanguage", evt.target.value);
    },
  });
});
