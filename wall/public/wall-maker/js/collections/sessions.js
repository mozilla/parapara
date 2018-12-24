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
      this.url = '/api/walls/' + options.wallId + '/characters';
      this.wallId = options.wallId;
    }
  });
});
