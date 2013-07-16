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
    events: {
      "click button[type=submit]": "create",
      "click button.cancel": "cancel"
    },
    initialize: function() {
      this.designSelectionView =
        new DesignSelectionView({ collection: this.options.designs });
      // Add a 'form' property
      Object.defineProperty(this, "form",
        { get: function() { return this.$("form")[0]; }, enumerable: true });
    },
    render: function() {
      // There are no variables in the template for this view so far so we can
      // just pass the template directly.
      this.$el.html(template);
      webL10n.translate(this.el);

      // Render design selection
      this.renderSubview('.designSelection', this.designSelectionView);

      return this;
    },
    create: function(evt) {
      // Don't actually submit the form
      evt.preventDefault ? evt.preventDefault() : evt.returnValue = false;

      // Get values
      name = this.form.name.value;
      design = parseInt($("input[name=design]:checked", this.form).val());

      // XXX Clear message box
      // XXX Show loading screen / indication

      // Create wall
      var newWallView = this;
      this.options.walls.create({ name: name, design: design },
        { wait: true,
          success: function(wall) {
            // XXX Redirect to manage wall page
            newWallView.form.reset();
          },
          error: function() {
            // XXX Display error message here
          }
        });
    },
    cancel: function() {
      Backbone.history.navigate('./', { trigger: true });
      this.form.reset();
      // XXX Reset the message box too
    }
  });
});
