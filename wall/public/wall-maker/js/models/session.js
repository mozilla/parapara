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
    initialize: function() {
      // Sessions has some funny URL handling where it uses a different API for
      // fetching to saving. Unfortunately, backbone doesn't allow you to just
      // override the URL so simply--if you do, it will end up applying that URL
      // to the models if fetches as well (it just blindly sets options
      // everywhere).
      //
      // So at this point, this.url may actually point to the API
      // endpoint for the collection so we need to manuallly restore it.
      this.url = function() {
        return _.result(this.collection, 'url') +
               (this.isNew() ? "" : "/" + this.id);
      }

      // Transform characters attribute into a collection
      this.characters = new Characters(this.get("characters"));
      this.listenTo(this, "sync", function() {
        this.characters.set(this.get("characters"));
      });

      // Bubble events from characters collection
      this.characters.on('all', function(event) {
        // Copy (probably updated) characters collection to attribute
        this.attributes.characters = this.characters.models;
        this.trigger.apply(this, arguments);
      }, this);
    }
  });
});
