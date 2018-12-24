/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'utils/input-observer',
         'views/soma-view',
         'text!templates/duration-slider.html' ],
function(_, Backbone, webL10n, InputObserver, SomaView, templateString) {
  return SomaView.extend({
    initialize: function() {
      // Add some convenience accessors
      Object.defineProperty(this, "label",
        { get: function() { return this.$('.duration-label')[0]; } });
      Object.defineProperty(this, "slider",
        { get: function() { return this.$('input')[0]; } });
      Object.defineProperty(this, "sliderValue",
        { get: function() { return parseInt(this.$('input').val()); } });

      // Watch the design slider
      this.sliderObserver =
        new InputObserver(this.onSliderChange.bind(this),
                          this.onSliderSave.bind(this));

      // Register for changes to the model
      this.listenTo(this.model, "change", this.change);

      // Since we do some localization inside functions called from the
      // template, when the language switches we should re-render.
      $(window).on("localized", null, function() {
        this.template.render();
      }.bind(this));
    },

    events: {
      "click .reset-duration": "reset"
    },

    render: function() {
      // Set up template data
      var data = {
        duration: this.model.get("duration"),
        defaultDuration: this.model.get("defaultDuration"),
        getDuration: getDuration,
        getDurationLabel: getDurationLabel,
      };

      // Render template
      this.renderTemplate(templateString, data);

      // Watch the design slider
      this.sliderObserver.observeElement(this.slider);
    },

    change: function(model, options) {
      // Ignore irrelevant changes
      if (!'duration' in model.changed && !'defaultDuration' in model.changed)
        return;

      // Determine if the slider has changed since the request that generated
      // this change was sent. If it has changed, we should use the form value
      // and not the model value since it is more up-to-date.
      var currentValue = this.sliderValue;
      var hasChangedSinceSending =
        options.preSendFormValues &&
        _.find(options.preSendFormValues,
          function(entry) {
            return entry.name == 'duration' && entry.value != currentValue;
          }
        );

      // Set the template fields
      this.template.scope.duration =
        hasChangedSinceSending ? currentValue : model.get("duration");
      this.template.scope.defaultDuration = model.get("defaultDuration");

      // Re-render
      this.template.render();
    },

    onSliderChange: function() {
      var labelNode = this.template.getNode(this.label);
      this.template.scope.duration = this.sliderValue;
      labelNode.update();
      labelNode.render();
    },

    onSliderSave: function(element) {
      this.save(this.sliderValue);
    },

    save: function(duration) {
      // Set sending state
      var block = this.$el;
      block.addClass('sending');

      // Save
      this.model.save({ duration: duration }, { patch: true })
          .always(function() { block.removeClass('sending') });
    },

    reset: function() {
      this.save(null);
    }
  });

  /*
   * Static utility methods
   */
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
