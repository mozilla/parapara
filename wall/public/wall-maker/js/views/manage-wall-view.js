/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'views/base-view',
         'text!templates/manage-wall-screen.html' ],
function(_, Backbone, BaseView, template) {
  return BaseView.extend({
    el: $("#screen-manage"),
    initialize: function() {
      this.listenTo(this.model, "change", this.render);
      // XXX Trigger async refresh of wall data
      // XXX Trigger async load of characters
    },
    render: function() {
      return this.renderTemplate(template, { wall: this.model.toJSON() });
    }
  });
});
