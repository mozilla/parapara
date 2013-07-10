/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'text!templates/wall-grid.html' ],
function(_, Backbone, webL10n, template) {
  return Backbone.View.extend({
    render: function() {
      this.$el.html(_.template(template,
                    { walls: this.collection.toJSON(),
                      appRoot: Backbone.View.appRoot }));
      webL10n.translate(this.el);
      return this;
    }
  });
});
