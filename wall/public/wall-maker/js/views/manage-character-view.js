/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/soma-view',
         'text!templates/manage-character.html' ],
function(_, Backbone, webL10n, SomaView, templateString) {

  return SomaView.extend({
    initialize: function() {
      // Register for changes to the model
      // (Although unlikely, this may happen if there was a pending async
      //  update in progress when the modal dialog was popped up.)
      this.listenTo(this.model, "change", this.render);
    },

    render: function() {
      var data = { character: this.model.toJSON() };
      if (!this.template) {
        this.renderTemplate(templateString, data);
        // Echo 'hidden' events so the containing view can update the URL
        // accordingly
        var self = this;
        this.$('.modal').on('hidden', function() {
          self.trigger('hidden');
        });
      } else {
        _.extend(this.template.scope, data);
        this.template.render();
        webL10n.translate(this.el);
      }
      this.$('.modal').modal();

      return this;
    },
  })
});
