/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'text!templates/pathly-editable-url.html' ],
function(_, Backbone, webL10n, templateString) {
  return Backbone.View.extend({
    initialize: function() {
      // Initial state
      this.editing = false;

      // Register for changes
      this.listenTo(this.model, "change", this.update);

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
      // Generate instance of template
      this.$el.html(templateString);

      // Fill in scope with extra values
      var template = soma.template.create(this.el);
      template.scope.appRoot = Backbone.View.appRoot;

      // Define dynamic field values
      var view  = this;
      var model = this.model;
      Object.defineProperties(template.scope, {
        "fullPath": { get: function() {
                        return model.get(view.options.field);
                    } },
        "_splitPoint": { get: function() {
                      return this.fullPath.lastIndexOf('/') + 1;
                    } },
        "basePath": { get: function() {
                        return this.fullPath.slice(0, this._splitPoint);
                    } },
        "editablePath": { get: function() {
                        return this.fullPath.slice(this._splitPoint);
                    } },
        "editablePathFieldSize": { get: function() {
                        return Math.max(this.editablePath.length, 10);
                    } },
        "editing": { get: function() { return view.editing; } }
        });
      template.render();
      this.template = template;

      // Set form field ID
      if (this.options.formFieldId) {
        this.textbox.id = this.options.formFieldId;
      }

      // Localization
      webL10n.translate(this.el);
    },
    // XXX For changes to the model check if the url changed and only then
    // re-render
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
