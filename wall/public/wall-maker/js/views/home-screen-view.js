/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'views/container-view',
         'views/wall-grid-view',
         'webL10n',
         'text!templates/home-screen.html' ],
function(_, Backbone, ContainerView, WallGridView, webL10n, template) {
  return ContainerView.extend({
    el: $("#screen-home"),
    initialize: function() {
      this.wallGridView = new WallGridView({ collection: this.options.walls });
    },
    render: function() {
      this.$el.html(_.template(template, { walls: this.options.walls.toJSON(),
                                           appRoot: Backbone.View.appRoot }));
      webL10n.translate(this.el);

      this.renderSubview('#wallSummary', this.wallGridView);

      return this;
    }
  });
});
