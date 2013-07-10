/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'backbone' ],
function(Backbone) {
  return Backbone.View.extend({
    renderSubview: function (selector, view) {
      // Make sure delegateEvents is called to rebind events on subviews
      // See: http://ianstormtaylor.com/rendering-views-in-backbonejs-isnt-always-simple/
      view.setElement(this.$(selector)).render();
    }
  });
});
