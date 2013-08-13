/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone' ],
function($, _, Backbone) {
  return Backbone.Model.extend({
    idAttribute: 'sessionId',

    initialize: function(attributes, options) {
      // Initialize URL
      this.updateUrl(options);
      // If we haven't got an ID yet we will have to update it when the model is
      // changed
      this.listenTo(this, "change", this.updateUrl);
    },

    updateUrl: function(options) {
      var wallId = this.collection.wallId;
      if (!wallId)
        throw "No wall Id for session";
      if (this.id)
        this.url = '/api/walls/' + wallId + '/sessions/' + this.id;
    }
  });
});
