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
      this.urlRoot = '/api/walls/' + this.collection.wallId + '/sessions/';

      // Transform characters attribute into a collection
      this.characters = new Characters(this.get("characters"));
      this.listenTo(this, "change", function() {
        this.characters.models = this.get("characters");
      });
    }
  });
});
