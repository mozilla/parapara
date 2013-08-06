/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone' ],
function($, _, Backbone) {
  return Backbone.Model.extend({
    idAttribute: 'wallId',
    fetchSessionsAndCharacters: function() {
      if (!this.sessions) {
        this.sessions = new (Backbone.Collection.extend({
          url: '/api/walls/' + this.get(this.idAttribute) + '/characters'
        }));
      }
      return this.sessions.fetch();
    },
    startSession: function() {
      // XXX Make XHR request
    },
    endSession: function() {
      // XXX Make XHR request
    }
  });
});
