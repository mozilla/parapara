/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'soma',
         'webL10n',
         'views/base-view' ],
function(_, Backbone, soma, webL10n, BaseView) {

  return BaseView.extend({
    renderTemplate: function (templateString, data) {
      // Export common functions
      soma.template.helpers({
        decodeURIComponent: decodeURIComponent
      });

      // Load template string into DOM
      this.$el.html(templateString);

      // Set up template
      var template = soma.template.create(this.el);
      this.superExtend(template.scope, data,
                       { appRoot: Backbone.View.appRoot } );

      // Run and store template
      template.render();
      this.template = template;

      // Localization
      webL10n.translate(this.el);

      return this;
    },
    // Based on _.extend but also copies getters, setters etc.
    // Unfortunately it uses methods that mean it won't work in IE < 8 or
    // Opera < 12
    // Also, such properties need to be marked as enumerable in order to be
    // copied
    superExtend: function(obj) {
      _.each(Array.prototype.slice.call(arguments, 1), function(source) {
        if (source) {
          for (var prop in source) {
            Object.defineProperty(
              obj, prop, Object.getOwnPropertyDescriptor(source, prop));
          }
        }
      });
      return obj;
    }
  });
});
