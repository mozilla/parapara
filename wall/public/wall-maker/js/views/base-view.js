/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore', 'backbone', 'webL10n' ],
function(_, Backbone, webL10n) {
  return Backbone.View.extend({
    // Utility method to perform common actions associated with evaluating
    // a template. Specifically
    //  - Pass the appRoot as a parameter
    //  - Update the target element
    //  - Run the result through webL10n
    renderTemplate: function (template, data) {
      this.$el.html(
        _.template(template,
                   _.extend(data, { appRoot: Backbone.View.appRoot })
      ));
      webL10n.translate(this.el);
      return this;
    },
    // Utility method to render a subview whilst retaining event bindings
    renderSubview: function (selector, view) {
      // Make sure delegateEvents is called to rebind events on subviews
      // See: http://ianstormtaylor.com/rendering-views-in-backbonejs-isnt-always-simple/
      view.setElement(this.$(selector)).render();
    }
  });
});
