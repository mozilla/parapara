/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/base-view',
         'views/design-selection-view',
         'views/message-box-view',
         'text!templates/new-wall-screen.html' ],
function(_, Backbone, webL10n, BaseView, DesignSelectionView, MessageBoxView,
         template) {
  return BaseView.extend({
    el: $("#screen-new"),
    events: {
      "submit form": "create",
      "click button.cancel": "cancel"
    },
    initialize: function() {
      // Create subviews
      this.designSelectionView =
        new DesignSelectionView({ collection: this.options.designs });
      this.messageBoxView = new MessageBoxView();

      // Add a 'form' property to this view
      Object.defineProperty(this, "form",
        { get: function() { return this.$("form")[0]; }, enumerable: true });
    },
    render: function() {
      // There are no variables in the template for this view so far so we can
      // just pass the template directly.
      this.$el.html(template);
      webL10n.translate(this.el);

      // Render subviews
      this.renderSubview('.designSelection', this.designSelectionView);
      this.renderSubview('.message', this.messageBoxView);

      return this;
    },
    create: function(evt) {
      // Don't actually submit the form
      evt.preventDefault ? evt.preventDefault() : evt.returnValue = false;

      // Get values
      name = this.form.name.value;
      design = parseInt($("input[name=design]:checked", this.form).val());

      // Clear message box
      this.messageBoxView.clearMessage();

      // Disable form and show loading indication
      this.$("input,button").attr("disabled", "disabled");
      // XXX Loading indication

      // Create wall
      var view = this;
      this.options.walls.create({ name: name, design: design },
        { wait: true,
          at: 0,
          success: function(wall) {
            Backbone.history.navigate('/wall/' + wall.get('wallId'),
                                      { trigger: true });
            view.form.reset();
          },
          error: function(wall, resp) {
            var error = resp.responseJSON ? resp.responseJSON.error_key
                                          : resp.statusText;
            view.messageBoxView.setMessage(error, "create-failed");
          },
          complete: function() {
            // Re-enable form controls
            view.$("input,button").removeAttr("disabled");
            // XXX Clear loading indication
          }
        });
    },
    cancel: function() {
      Backbone.history.navigate('./', { trigger: true });
      this.form.reset();
      this.messageBoxView.clearMessage();
    }
  });
});
