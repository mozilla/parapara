/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'views/textbox-observer' ],
function(_, Backbone, TextBoxObserver) {
  return Backbone.View.extend({
    initialize: function() {
      this.observer =
        new TextBoxObserver(this.onchange.bind(this),
                            this.onstartediting.bind(this));

      // Add a 'textbox' property to this view
      Object.defineProperty(this, "textbox",
        { get: function() { return this.$('input[type="text"]')[0]; },
          enumerable: true });
    },
    render: function() {
      this.observer.observeElement(this.textbox);
    },
    onchange: function() {
      // Update container styles
      this.clearStatus();
      this.el.classList.add("sending");

      // Store saved value so we know if we can safely update it later
      this.savedValue = this.textbox.value;

      // Trigger event
      this.trigger("save", this.textbox, this);
    },
    onstartediting: function() {
      // Update container styles
      this.clearStatus();
      this.el.classList.add("editing");

      // Clear the saved value
      // (This will prevent us from overwriting the value, if, for example we're
      // in the middle of an IME composition)
      this.savedValue = null;
    },
    showSaveSuccess: function(setValue) {
      // Sometimes the setValue will be different to the value we passed to
      // saveCallback. This can happen, for example, if the server trimmed the
      // string and passed back the trimmed result.
      //
      // Here we overwrite the field value if the set values differs from the
      // one we saved but only if it hasn't changed in the meantime.
      if (typeof setValue !== "undefined" &&
          setValue !== this.savedValue &&
          this.savedValue === this.textbox.value) {
        this.textbox.value = setValue;
      }
      this.savedValue = null;

      // Update container styles (but only if we haven't already started editing
      // again)
      if (!this.el.classList.contains("editing")) {
        this.clearStatus();
        this.el.classList.add("saved");
      }
    },
    showSaveError: function() {
      // Update container style (but only if we haven't already started editing
      // again)
      if (!this.el.classList.contains("editing")) {
        this.clearStatus();
        this.el.classList.add("error");
      }
    },
    clearStatus: function() {
      this.el.classList.remove("saved");
      this.el.classList.remove("sending");
      this.el.classList.remove("editing");
      this.el.classList.remove("error");
    }
  });
});
