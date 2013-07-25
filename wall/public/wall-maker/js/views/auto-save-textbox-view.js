/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'views/textbox-observer' ],
function(_, Backbone, TextBoxObserver) {
  return Backbone.View.extend({
    initialize: function() {
      // Watch the text box
      this.observer =
        new TextBoxObserver(this.onchange.bind(this),
                            this.onstartediting.bind(this));
      // Watch the model
      this.listenTo(this.model, "change", this.update);
    },
    render: function() {
      // Wrap textbox in a <div> for applying icon styles to
      if (this.el.tagName == "INPUT") {
        this.$el.wrap('<div class="withIcon" />');
        this.container = this.el.parentNode;
      }

      // Observe changes to the textbox
      this.observer.observeElement(this.el);
      this.savedValue = this.el.value;

      // Update the form
      this.update();
    },
    onchange: function() {
      // Update container styles
      this.clearStatus();
      this.container.classList.add("sending");

      // Store saved value so we know if we can safely update it later
      this.savedValue = this.el.value;

      // Trigger event
      this.trigger("save", this.el, this);
      var view = this;
      var patch = {};
      patch[this.options.field] = this.el.value;
      this.model.save(patch, { patch: true, wait: true })
          .then(function() {
            // Update container styles (but only if we haven't already started
            // editing again)
            if (!view.container.classList.contains("editing")) {
              view.clearStatus();
              view.container.classList.add("saved");
            }
          })
          .fail(function() {
            // Update container styles
            if (!view.container.classList.contains("editing")) {
              view.clearStatus();
              view.container.classList.add("error");
            }
          });
    },
    onstartediting: function() {
      // Update container styles
      this.clearStatus();
      this.container.classList.add("editing");
    },
    update: function() {
      // Update the form value but ONLY if:
      // - the value in the model changed, AND
      // - the value in the model differs from the one we tried to save, AND
      // - we haven't updated the form since saving
      var setValue = this.model.changed[this.options.field];
      if (typeof setValue !== "undefined" &&
          setValue !== this.savedValue &&
          this.savedValue === this.el.value) {
        this.el.value = this.savedValue = setValue;
      }

      // Update field (this really belongs in the template... but then it won't
      // get updated on changes to the model)
      var modelValue = this.model.attributes[this.options.field];
      this.el.size = Math.max(modelValue.length, 20);
    },
    clearStatus: function() {
      this.container.classList.remove("saved");
      this.container.classList.remove("sending");
      this.container.classList.remove("editing");
      this.container.classList.remove("error");
    }
  });
});
