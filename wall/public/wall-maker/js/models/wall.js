/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'collections/Sessions' ],
function($, _, Backbone, Sessions) {
  return Backbone.Model.extend({
    idAttribute: 'wallId',

    initialize: function() {
      // Flag to indicate if we have fetched the sessions so we can distinguish
      // between having zero sessions or simply not having fetched them
      this.sessionsLoaded = false,

      // Define the sessions property so users can register for events on it but
      // don't fetch it until necessary (i.e. someone calls fetchCharacters).
      this.sessions =
        new Sessions(null, { wallId: this.get(this.idAttribute) });
    },

    fetchCharacters: function() {
      var self = this;
      return this.sessions.fetch(
             { success: function() { self.sessionsLoaded = true; } });
    },

    startSession: function() {
      // XXX Make sure sessions have been fetched first
      // XXX Make XHR request
    },

    endSession: function() {
      // XXX Make sure sessions have been fetched first
      // XXX Make XHR request
    }
  });
});
