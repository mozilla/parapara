/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'collections/sessions' ],
function($, _, Backbone, Sessions) {
  return Backbone.Model.extend({
    idAttribute: 'wallId',

    initialize: function() {
      // Flag to indicate if we have fetched the sessions so we can distinguish
      // between having zero sessions or simply not having fetched them
      this.sessionsLoaded = false;

      // Deferred object for session-loading status
      this._sessionsDefer = $.Deferred();
      this.sessionsPromise = this._sessionsDefer.promise();

      // Define the sessions property so users can register for events on it but
      // don't fetch it until necessary (i.e. someone calls fetchCharacters).
      this.sessions = new Sessions(null, { wallId: this.id });
    },

    fetchCharacters: function() {
      var self = this;
      return this.sessions.fetch(
           { success: function() {
               if (self._sessionsDefer.state() == "pending") {
                 self._sessionsDefer.resolve(self.sessions);
               }
               self.sessionsLoaded = true;
             }
           });
    },

    startSession: function(options) {
      // If sessions have not been loaded, do that first
      if (!this.sessionsLoaded) {
        this.fetchCharacters();
      }

      // Set up function to start the session
      var self = this;
      this.sessionsPromise.done(function(sessions) {
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
          sessions.trigger('error', model, resp, options);
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
      });
    },

    endSession: function(options) {
      this._modifySession({ end: true }, options);
    },

    restartSession: function(options) {
      this._modifySession({ end: null }, options);
    },

    _modifySession: function(attr, options) {
      if (!this.sessionsLoaded)
        return;

      // Get latest session
      if (!this.get("latestSession")) {
        console.log("No session to end/restart");
        return;
      }
      var latestSession =
        this.sessions.get(this.get("latestSession").sessionId);

      // Wrap error to take care of parallel changes.
      this.wrapError(options);

      // Wrap success so we make sure our latestSession gets updated
      var success = options.success;
      var self = this;
      options.success = function(model, resp, options) {
        // Update latest session
        self.attributes.latestSession = _.clone(model.attributes);

        // Call original callback
        if (success) success(model, resp, options);
      };

      // Save changes
      return latestSession.save(attr, _.extend({ wait: true }, options));
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
