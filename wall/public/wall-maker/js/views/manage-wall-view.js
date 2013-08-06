/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'soma',
         'qrcode',
         'webL10n',
         'views/base-view',
         'views/auto-save-textbox-view',
         'views/design-selection-view',
         'views/input-observer',
         'views/pathly-editable-url-view',
         'views/message-box-view',
         'text!templates/manage-wall-screen.html' ],
function(_, Backbone, soma, QRCode, webL10n,
         BaseView, AutoSaveTextboxView, DesignSelectionView,
         InputObserver, PathlyEditableUrlView, MessageBoxView,
         templateString) {

  return BaseView.extend({
    tagName: 'div',
    className: 'screen',
    attributes: { 'hidden': 'hidden' },
    id: 'screen-manage',
    events: {
      "click #showEditorUrlQrCode": "showEditorUrlQrCode",
      "change .designSelection": "saveDesign",
      "click #reset-duration": "resetDuration"
    },
    initialize: function() {
      // XXX Trigger async load of characters

      // Create subviews
      this.messageBoxView = new MessageBoxView();
      this.autoSaveNameView =
        new AutoSaveTextboxView( { model: this.model, field: 'name' } );
      this.wallUrlView =
        new PathlyEditableUrlView( { model: this.model,
                                     field: 'wallUrl',
                                     saveField: 'urlPath',
                                     formFieldId: 'manage-urlPath' } );
      this.designSelectionView =
        new DesignSelectionView({ collection: this.options.designs });

      // Watch the design slider
      this.designObserver =
        new InputObserver(this.onDurationChange.bind(this),
                          this.onDurationSave.bind(this));

      // Export common functions
      // (This should be moved to BaseView if we switch over to soma
      // templates everywhere)
      soma.template.helpers({
        decodeURIComponent: decodeURIComponent
      });

      // Common handling of requests
      this.listenTo(this.model, "change", this.change);
      this.listenTo(this.model, "error", this.error);
      this.listenTo(this.model, "request", this.request);

      // Some parts of the form (notably the duration label) do their
      // localization inside functions called from the template so when the
      // language switches we should re-render.
      $(window).on("localized", null, function() {
        this.template.render();
      }.bind(this));

      // Trigger async refresh of wall data
      this.refreshData();
    },
    refreshData: function() {
      this.model.fetch();
    },
    render: function() {
      // Load template string into DOM
      this.$el.html(templateString);

      // Set up template
      var template = soma.template.create(this.el);
      template.scope.appRoot = Backbone.View.appRoot;
      template.scope.wall = this.model.toJSON();

      // We want to define this in the template but soma templates are a bit too
      // limited for this--and too limited to even do as a 'maxLength' helper
      // function since all arguments are passed as strings
      Object.defineProperty(template.scope, "wallNameFieldSize",
        { get: function() { return Math.max(20, this.wall.name.length+3); } });
      template.scope.getDuration      = getDuration;
      template.scope.getDurationLabel = getDurationLabel;

      // Run and store template
      template.render();
      this.template = template;

      // Render subviews
      this.renderSubview('#manage-name', this.autoSaveNameView);
      this.renderSubview('#manage-wallUrl', this.wallUrlView);
      this.renderSubview('.designSelection', this.designSelectionView);
      this.renderSubview('.alert', this.messageBoxView);

      // Set initial state of design selection
      this.$('.designSelection')[0].value = this.model.get("designId");

      // Watch the design slider
      this.designObserver.observeElement(this.$('#manage-duration')[0]);

      // Localization
      if (webL10n.readyState == 'complete') {
        webL10n.translate(this.el);
      }

      return this;
    },
    showSection: function(section, subsection) {
      // Set default tab is none is provided
      section = section || "sessions";

      // Update tabs
      this.$("a[aria-role=tab]").attr("aria-selected", "false");
      var selectedTab =
        $("a[aria-role=tab][aria-controls=manage-" + section + "]") ||
        $("a[aria-role=tab][aria-controls=manage-sessions]");
      selectedTab.attr("aria-selected", "true");

      // Update panels
      this.$("section[aria-role=tabpanel]").attr("aria-hidden", "true");
      selectedPanel = this.$("#" + selectedTab.attr("aria-controls"));
      selectedPanel.removeAttr("aria-hidden");
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

      // Updates to the design selection are handled separately
      if ("designId" in wall.changed) {
        this.$('.designSelection')[0].value = wall.changed.designId;
      }
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
        var placement = $(field).attr('data-placement') || 'right';
        $(field).popover({ placement: placement, animation: true,
                           content: message, trigger: 'focus' })
                .popover('show')
                .attr('data-popover-enabled', 'data-popover-enabled');
      }
    },
    showEditorUrlQrCode: function(evt) {
      // Prepare QR code
      var qr = new QRCode(0, QRCode.QRErrorCorrectLevel.M);
      qr.addData(this.model.get("editorUrlShort"));
      qr.make();
      var imageData = qr.getImage(8 /*cell size*/);

      // Update modal contents
      var modal    = $(evt.currentTarget.dataset['target']);
      var image    = modal[0].querySelector('img');
      image.src    = imageData.data;
      image.width  = imageData.width;
      image.height = imageData.height;
      image.alt    = this.model.get("editorUrlShort");

      // Show
      modal.modal();
    },
    saveDesign: function(evt) {
      // Set sending state
      var selection = this.$('.designSelection')[0];
      selection.classList.add('sending');

      // Save
      var prevValue = evt.prevValue;
      this.model.save({ designId: selection.value }, { patch: true })
          .fail(function() { selection.value = prevValue; })
          .always(function() { selection.classList.remove('sending') });
    },
    onDurationChange: function() {
      var span = this.template.getNode(this.$("#duration-units")[0]);
      this.template.scope.wall.duration =
        parseInt(this.$("#manage-duration").val());
      span.update();
      span.render();
    },
    onDurationSave: function(element) {
      this.saveDuration(parseInt(this.$('#manage-duration').val()));
    },
    saveDuration: function(duration) {
      // Set sending state
      var block = this.$('#durationControls')[0];
      block.classList.add('sending');

      // Save
      this.model.save({ duration: duration }, { patch: true })
          .always(function() { block.classList.remove('sending') });
    },
    resetDuration: function() {
      this.saveDuration(null);
    }
  });

  function getDuration(duration, defaultDuration) {
    return !duration ? defaultDuration : duration;
  }

  function getDurationLabel(duration, defaultDuration) {
    var str =
      getDurationString(getDuration(duration, defaultDuration));
    if (!duration)
      str += ' ' + webL10n.get('duration-default');
    return str;
  }

  function getDurationString(duration) {
    var durationSeconds = duration / 1000;
    var hours   = Math.floor(durationSeconds / (60 * 60));
    var minutes = Math.floor(durationSeconds / 60) % 60;
    var seconds = durationSeconds % 60;
    var pad = function(num) { return ('0' + num).substr(-2); }
    if (hours) {
      var str = webL10n.get('duration-hms',
        { hours: hours, minutes: pad(minutes), seconds: pad(seconds) });
    } else if (minutes) {
      var str = webL10n.get('duration-ms',
        { minutes: minutes, seconds: pad(seconds) });
    } else {
      var str = webL10n.get('duration-s', { seconds: seconds });
    }
    return str;
  }
});
