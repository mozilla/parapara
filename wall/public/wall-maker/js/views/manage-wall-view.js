/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/base-view',
         'views/auto-save-textbox-view',
         'views/message-box-view',
         'text!templates/manage-wall-screen.html' ],
function(_, Backbone, webL10n, BaseView, AutoSaveTextboxView, MessageBoxView,
         template) {
  return BaseView.extend({
    tagName: 'div',
    className: 'screen',
    attributes: { 'hidden': 'hidden' },
    id: 'screen-manage',
    initialize: function() {
      // XXX Trigger async load of characters

      // Create subviews
      var wall = this.model;
      this.autoSaveNameView =
        new AutoSaveTextboxView( { model: this.model, field: 'name' } );
      this.messageBoxView = new MessageBoxView();

      // Register for changes
      var view = this;
      this.listenTo(this.model, "change", function() {
        // XXX Update design etc.
      });

      // Trigger async refresh of wall data
      this.model.fetch();

      // Common error handling
      this.listenTo(this.model, "error",
        function(wall, resp, xhr) {
          var error = resp.responseJSON.error_key;
          var commonError =
            [ 'bad-request', 'readonly-field', 'no-auth', 'server-error',
              'database-error', 'timeout' ].indexOf(error) != -1;
          var fieldName  = _.keys(xhr.attrs)[0];
          var field      = document.getElementById('manage-' + fieldName);
          var messageKey = 'wall-save-failed-' + error;
          var specificErrorExists = !!webL10n.getData()[messageKey];
          if (commonError || !field || !specificErrorExists) {
            view.messageBoxView.setMessage(resp.responseJSON.error_key,
              { keyPrefix: "wall-save-failed", dismiss: true });
          } else {
            var message = webL10n.get(messageKey);
            $(field).popover({ placement: 'right', animation: true,
                               content: message, trigger: 'focus' })
                    .popover('show')
                    .attr('data-popover-enabled', 'data-popover-enabled');
          }
        });
      // Clear pop-ups when we go to save changes
      this.listenTo(this.model, "request",
        function() {
          view.messageBoxView.clearMessage();
          this.$('[data-popover-enabled]').popover('destroy');
        });
    },
    render: function() {
      // One of the biggest problems with using a string-base templating
      // approach is that re-rendering clobbers form state.
      //
      // That means if we blindly call render we'll cause what the user is
      // typing (but which has yet to be saved) to be lost, videos to restart,
      // text selection to disappear etc.
      //
      // The best solution is to use a DOM-based templating system like Web
      // Components, Angular, or possible transparency or distal or something of
      // the sort.
      //
      // For now what we do is:
      // 1. Only call render once on this view
      // 2. Pass the model to subviews and make them responsible for watching
      //    for changes and doing minimal updates.
      // 3. Moving any complex logic out of the underscore templates and putting
      //    them in the views (so we don't end up duplicating it--or more
      //    likely, forgetting it--when we do the minimal update).
      //
      // Some subviews which don't have such state associated with them may
      // implement minimal updates by just re-rendering but that's up to them.
      this.renderTemplate(template, { wall: this.model.toJSON() });

      // Render subviews
      this.renderSubview('#manage-name', this.autoSaveNameView);
      this.renderSubview('.alert', this.messageBoxView);

      return this;
    }
  });
});
