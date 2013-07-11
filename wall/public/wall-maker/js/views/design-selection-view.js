/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'views/base-view',
         'text!templates/design-selection.html' ],
function(_, Backbone, BaseView, template) {
  return BaseView.extend({
    render: function() {
      this.renderTemplate(template, { designs: this.collection.toJSON() });
      return this;
    }
  });
});
