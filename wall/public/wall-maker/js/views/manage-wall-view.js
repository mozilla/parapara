/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/base-view',
         'views/auto-save-textbox',
         'views/message-box-view',
         'text!templates/manage-wall-screen.html' ],
function(_, Backbone, webL10n, BaseView, AutoSaveTextBox, MessageBoxView,
         template) {
  return BaseView.extend({
    tagName: 'div',
    className: 'screen',
    attributes: { 'hidden': 'hidden' },
    id: 'screen-manage',
    initialize: function() {
      // XXX Trigger async refresh of wall data
      // XXX Trigger async load of characters

      // Create subviews
      var wall = this.model;
      this.autoSaveNameView = new AutoSaveTextBox();
      this.autoSaveNameView.on("save",
        function(textbox, saver) {
          wall.attributes.name = textbox.value;
          wall.save({ name: textbox.value }, { patch: true })
          .then(function(wall) { saver.showSaveSuccess(wall.name); })
          .fail(function() { saver.showSaveError(); });
        });
      this.messageBoxView = new MessageBoxView();

      // Register for changes
      var view = this;
      this.listenTo(this.model, "change", this.render);

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
      this.listenTo(this.model, "sync",
        function() {
          view.messageBoxView.clearMessage();
          this.$('[data-popover-enabled]').popover('destroy');
        });
    },
    render: function() {
      this.renderTemplate(template, { wall: this.model.toJSON() });

      // Render subviews
      this.renderSubview('#manage-name-wrapper', this.autoSaveNameView);
      this.renderSubview('.alert', this.messageBoxView);

      return this;
    }
  });
});
