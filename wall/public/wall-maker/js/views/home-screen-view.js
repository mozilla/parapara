/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'views/base-view',
         'webL10n',
         'text!templates/home-screen.html' ],
function(_, Backbone, BaseView, webL10n, template) {
  return BaseView.extend({
    el: $("#screen-home"),
    render: function() {
      this.renderTemplate(template, { walls: this.collection.toJSON() });
      return this;
    }
  });
});
