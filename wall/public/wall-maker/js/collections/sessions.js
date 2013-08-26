/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery',
         'underscore',
         'backbone',
         'models/session' ],
function($, _, Backbone, Session) {
  return Backbone.Collection.extend({
    model: Session,
    initialize: function(models, options) {
      this.wall = options.wall;
    },
    url: function() {
      return _.result(this.wall, 'url') + '/sessions';
    },
    sync: function(method, model, options) {
      // When reading we use a different API endpoint which fetches the
      // characters as well as the sessions
      if (method == 'read') {
        options.url = _.result(this.wall, 'url') + '/characters';
      }
      Backbone.sync.call(this, method, model, options);
    }
  });
});
