/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'soma',
         'webL10n',
         'views/base-view',
         'views/auto-save-textbox-view',
         'views/message-box-view',
         'text!templates/manage-wall-screen.html' ],
function(_, Backbone, soma, webL10n,
         BaseView, AutoSaveTextboxView, MessageBoxView,
         templateString) {

  return BaseView.extend({
    tagName: 'div',
    className: 'screen',
    attributes: { 'hidden': 'hidden' },
    id: 'screen-manage',
    initialize: function() {
      // XXX Trigger async load of characters

      // Create subviews
      this.autoSaveNameView =
        new AutoSaveTextboxView( { model: this.model, field: 'name' } );
      this.messageBoxView = new MessageBoxView();

      // Export common functions
      // (This should be moved to BaseView if we switch over to soma
      // templates everywhere)
      soma.template.helpers({
        decodeURIComponent: decodeURIComponent,
        min: Math.min,
        max: Math.max
      });

      // Common handling of requests
      this.listenTo(this.model, "change", this.change);
      this.listenTo(this.model, "error", this.error);
      this.listenTo(this.model, "request", this.request);

      // Trigger async refresh of wall data
      this.model.fetch();
    },
    render: function() {
      // Load template string into DOM
      this.$el.html(templateString);

      // Set up template and run
      var template = soma.template.create(this.el);
      template.scope.appRoot = Backbone.View.appRoot;
      template.scope.wall = this.model.toJSON();
      template.render();
      this.template = template;

      // Render subviews
      this.renderSubview('#manage-name', this.autoSaveNameView);
      this.renderSubview('.alert', this.messageBoxView);

      // Localization
      webL10n.translate(this.el);

      return this;
    },
    request: function(wall, xhr, options) {
      // Clear pop-ups when we go to save changes
      this.messageBoxView.clearMessage();
      this.$('[data-popover-enabled]').popover('destroy');

      // Store the values of all input fields so that when we get a response we
      // know if any the fields have changed in the meantime and don't clobber
      // them.
      options.preSendFormValues = this.$("form").serializeArray();

      // If we haven't get rendered the form then fill in the pre-send values
      // using the values of the model.
      if (options.preSendFormValues.length == 0) {
        // Convert from an object into an array of objects with 'name' and
        // 'value' properties just like the format returned by serializeArray.
        options.preSendFormValues =
          _.map(_.pairs(wall.attributes),
                  function(pair) { return { name: pair[0], value: pair[1] }; }
               );
      }
    },
    change: function(wall, options) {
      // Fill out template scope with latest wall fields
      var templateWall = this.template.scope.wall;
      _.extend(templateWall, wall.toJSON());

      // Check if any of the input fields have changed since this request was
      // set and if so, don't clobber the corresponding wall field
      if (options.preSendFormValues) {
        // Work out which fields have changed value
        var currentFormValues = this.$("form").serializeArray();
        var updatedFields = [];
        _.each(options.preSendFormValues, function(pre) {
            var entry = _.find(currentFormValues, function(curr)
              { return pre.name == curr.name && pre.value != curr.value; } );
            if (entry) updatedFields.push(entry);
        });

        // Update the template scope to use the form value not the model value
        _.each(updatedFields, function(field) {
          templateWall[field.name] = field.value;
        });
      }

      // Refresh
      this.template.render();
    },
    error: function(wall, resp, xhr) {
      if (resp['responseJSON'] === undefined) {
        console.log("Unexpected error");
        console.log(arguments);
        return;
      }
      // Determine which errors to show in the common error field and which ones
      // to try and make a field-specific pop-up for.
      var error = resp.responseJSON.error_key;
      var commonError =
        [ 'bad-request', 'readonly-field', 'no-auth', 'server-error',
          'database-error', 'timeout' ].indexOf(error) != -1;
      var fieldName  = _.keys(xhr.attrs)[0];
      var field      = document.getElementById('manage-' + fieldName);
      var messageKey = 'wall-save-failed-' + error;
      var specificErrorExists = !!webL10n.getData()[messageKey];

      // Generic errors
      if (commonError || !field || !specificErrorExists) {
        this.messageBoxView.setMessage(resp.responseJSON.error_key,
          { keyPrefix: "wall-save-failed", dismiss: true });
      // Field-specific pop-ups
      } else {
        var message = webL10n.get(messageKey);
        $(field).popover({ placement: 'right', animation: true,
                           content: message, trigger: 'focus' })
                .popover('show')
                .attr('data-popover-enabled', 'data-popover-enabled');
      }
    }
  });
});