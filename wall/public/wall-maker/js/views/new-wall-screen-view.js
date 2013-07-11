/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/base-view',
         'text!templates/new-wall-screen.html' ],
function(_, Backbone, webL10n, BaseView, template) {
  return BaseView.extend({
    el: $("#screen-new"),
    initialize: function() {
      // XXX Create new DesignView
    },
    render: function() {
      this.renderTemplate(template, { });
      // There are no variables in the template for this view so far so we can
      // just pass the template directly.
      this.$el.html(template);
      webL10n.translate(this.el);
      // XXX Render design selection
      // this.renderSubview('.designSelection', );
      return this;
    }
  });
});
