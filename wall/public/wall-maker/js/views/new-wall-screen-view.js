/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/base-view',
         'views/design-selection-view',
         'text!templates/new-wall-screen.html' ],
function(_, Backbone, webL10n, BaseView, DesignSelectionView, template) {
  return BaseView.extend({
    el: $("#screen-new"),
    initialize: function() {
      this.designSelectionView =
        new DesignSelectionView({ collection: this.options.designs });
    },
    render: function() {
      // There are no variables in the template for this view so far so we can
      // just pass the template directly.
      this.$el.html(template);
      webL10n.translate(this.el);

      // Render design selection
      this.renderSubview('.designSelection', this.designSelectionView);

      return this;
    }
  });
});
