/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'collections/characters' ],
function($, _, Backbone, Characters) {
  return Backbone.Model.extend({
    idAttribute: 'sessionId',
    initialize: function(attributes) {
      // This is quite crazy, but basically we have two API endpoints
      //
      //  /api/walls/<wall-id>/sessions
      //    Returns all the sessions only. This is where we POST to create
      //    a session
      //  Likewise, /api/walls/<wall-id>/sessions/<session-id> is where we PUT
      //    to update sessions
      //
      // However, in the wall we actually use
      //
      //  /api/walls/<wall-id>/characters
      //
      // As the API end point for fetching the Sessions collection. Because this
      // allows us to fetch all the characters at the same time.
      //
      // When we go to create a session we pass in /api/walls/<wall-id>/sessions
      // as the 'url'. If we leave it like that we end up with a hard-coded
      // url that doesn't include the session ID so here we overwrite that to
      // restore the real URL.
      //
      // XXX Fix this
      this.urlRoot = '/api/walls/' + this.collection.wall.id + '/sessions';
      this.url = this._url;

      // Transform characters attribute into a collection
      this.characters = new Characters(this.get("characters"));
      this.listenTo(this, "change", function() {
        this.characters.models = this.get("characters");
      });
    },
    _url: function() {
      return this.urlRoot + '/' + this.id;
    }
  });
});
