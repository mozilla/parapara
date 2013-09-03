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
    },

    // Common modal dialog handling.
    //
    // Given a modal dialog it:
    // - disables form controls in the dialog
    // - performs some asynchronous action
    // - shows error messages from the asynchronous action
    // - closes the dialog
    // - re-enables the form controls
    //
    // Arguments:
    //  - confirmDialog - the dialog to close
    //  - action - a callback that takes the dialog and performs some request
    //             that returns a Promise
    //  - errorMessageKeyPrefix - the key to use as a prefix when looking up
    //                            error strings
    //
    executeConfirmDialog: function(confirmDialog, action,
                                   errorMessageKeyPrefix) {
      // Disable form controls
      var formControls = $('button', confirmDialog);
      formControls.attr('disabled', 'disabled');

      // Clear any existing error message
      this.messageBoxView.clearMessage();

      // Perform action
      var view = this;
      action(confirmDialog)
        .then(function() {
          confirmDialog.modal('hide');
        })
        .fail(function(resp) {
          // This is pretty horrible, but currently the message box will display
          // behind the modal background and you won't notice it.
          //
          // Ideally we should either make it display on top or do something
          // different in this case such adding a line of text to the confirm
          // dialog.
          //
          // As a temporary measure we just hide the dialog and re-use the
          // existing message box view.
          confirmDialog.modal('hide');
          view.messageBoxView.setMessage(resp,
            { keyPrefix: errorMessageKeyPrefix, dismiss: true });
        })
        .always(function() {
          formControls.removeAttr('disabled');
        });
    }
  });
});
