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

    startSession: function(options) {
      // Set up function to start the session
      var self = this;
      var collection = this.sessions;
      var doStart = function() {
        // Wrap error function
        //
        // This is because we set wait: true and that means that if there is an
        // error then the newly created model won't yet have been added to the
        // collection so any error-callbacks registered at the collection-level
        // won't fire.
        //
        // So we manually trigger the collection callback in that case.
        var error = options.error;
        options.error = function(model, resp, options) {
          if (error) error(model, resp, options);
          collection.trigger('error', model, resp, options);
        };

        // And wrap error again to take care of parallel changes.
        // It's like a russian doll or a game of pass-the-parcel.
        self.wrapError(options);

        // Wrap success
        //
        // Before returning we should make sure the model is update-to-date.
        // Specifically we need to:
        //  - Close the previous session
        //  - Update the latest session details
        //
        // We do this by just overwriting the attributes since we don't want to
        // marked these as changed.
        var success = options.success;
        options.success = function(model, resp, options) {
          // Close previous session
          var previousSession = self.get("latestSession")
            ? self.sessions.get(self.get("latestSession").sessionId)
            : null;
          if (previousSession) {
            previousSession.attributes.end = model.get("start");
          }

          // Update latest session
          self.attributes.latestSession = _.clone(model.attributes);

          // Call original callback
          if (success) success(model, resp, options);
        };

        // Send request
        var latestSessionId = self.get("latestSession")
                            ? self.get("latestSession").sessionId
                            : null;
        return self.sessions.create({ },
          _.extend({
            attrs: { latestSessionId: latestSessionId },
            wait: true,
            url: '/api/walls/' + self.id + '/sessions'
          }, options));
      };

      // Check sessions have been loaded before trying to start new ones
      if (!this.sessionsLoaded) {
        // XXX Test this codepath
        return this.fetchCharacters.then(doStart);
      } else {
        return doStart();
      }
    },

    endSession: function() {
      // XXX Make sure sessions have been fetched first
      // XXX Make XHR request
    },

    restartSession: function(options) {
    },

    wrapError: function(options) {
      // Introduce special handling for parallel changes
      //
      // If there is a parallel change we try to automatically refresh the
      // session data before completing error handling.
      var error = options.error;
      var self  = this;
      options.error = function(model, resp, options) {
        if (resp.responseJSON &&
            resp.responseJSON.error_key == 'parallel-change') {
          self.fetchCharacters()
            .done(function() {
                resp.responseJSON.error_key = 'parallel-change-refreshed';
                if (error) error(model, resp, options);
              })
            .error(function() {
                resp.responseJSON.error_key = 'parallel-change-refresh-failed';
                if (error) error(model, resp, options);
              });
        } else {
          if (error) error(model, resp, options);
        }
      };
    }
  });
});
