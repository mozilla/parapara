/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/soma-view',
         'text!templates/pathly-editable-url.html' ],
function(_, Backbone, webL10n, SomaView, templateString) {
  return SomaView.extend({
    initialize: function() {
      // Initial state
      this.editing = false;

      // Register for changes
      this.listenTo(this.model, "change", this.change);

      // Add some convenience accessors
      Object.defineProperty(this, "textbox",
        { get: function() { return this.$('.editable-path')[0]; } });
      Object.defineProperty(this, "wrapper",
        { get: function() { return this.$('.editable-path-wrapper')[0]; } });
    },
    events: {
      "click .editUrl": "startEditing",
      "click .cancelSaveUrl": "stopEditing",
      "click .saveUrl": "save",
      "keydown .editable-path": function(evt) {
        if (evt.which == 10 || evt.which == 13) {
          evt.preventDefault();
          this.save();
        }
      }
    },
    render: function() {
      // Set up template data
      var data = {};

      // Define dynamic field values
      var view  = this;
      var model = this.model;
      Object.defineProperties(data, {
        "fullPath":
          { get: function() { return model.get(view.options.field); },
            enumerable: true },
        "_splitPoint":
          { get: function() { return this.fullPath.lastIndexOf('/') + 1; },
            enumerable: true },
        "basePath":
          { get: function() { return this.fullPath.slice(0, this._splitPoint);},
            enumerable: true },
        "editablePath":
          { get: function() { return this.fullPath.slice(this._splitPoint); },
            enumerable: true },
        "editablePathFieldSize":
          { get: function() {
              return Math.max(decodeURIComponent(this.editablePath).length, 10);
            },
            enumerable: true },
        "editing":
          { get: function() { return view.editing; },
            enumerable: true }
        });

      // Render template
      this.renderTemplate(templateString, data);

      // Set form field ID
      if (this.options.formFieldId) {
        this.textbox.id = this.options.formFieldId;
      }
    },
    change: function(model) {
      if (this.options.field in model.changed) {
        this.update();
      }
    },
    update: function() {
      this.template.render();
    },
    startEditing: function() {
      this.editing = true;
      this.update();
      this.textbox.focus();
      this.textbox.select();
    },
    stopEditing: function() {
      this.editing = false;
      this.resetState();
      this.update();
    },
    resetState: function() {
      var classList = this.wrapper.classList;
      classList.remove("withIcon");
      classList.remove("error");
      classList.remove("sending");
      this.textbox.disabled = false;
    },
    save: function() {
      // Set style
      this.resetState();
      this.wrapper.classList.add("withIcon");
      this.wrapper.classList.add("sending");
      this.textbox.disabled = true;

      // Save change
      var view = this;
      var patch = {};
      patch[this.options.saveField] = this.textbox.value;
      this.model.save(patch, { patch: true })
          .then(function() { view.stopEditing(); })
          .fail(function() {
            view.resetState();
            view.wrapper.classList.add("withIcon");
            view.wrapper.classList.add("error");
            view.textbox.focus();
            view.textbox.select();
          });
    }
  });
});
