/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/soma-view',
         'views/message-box-view',
         'text!templates/manage-character.html' ],
function(_, Backbone, webL10n, SomaView, MessageBoxView, templateString) {

  return SomaView.extend({
    initialize: function() {
      // Create subviews
      this.messageBoxView = new MessageBoxView();

      // Register for changes to the model
      // (Although unlikely, this may happen if there was a pending async
      //  update in progress when the modal dialog was popped up.)
      this.listenTo(this.model, "change", this.render);
    },

    render: function() {
      var data = { character: this.model.toJSON(), metadata: this.metadata() };
      if (!this.template) {
        this.renderTemplate(templateString, data);
        // Echo 'hidden' events so the containing view can update the URL
        // accordingly
        var self = this;
        this.$('.modal').on('hidden', function() {
          self.trigger('hidden');
        });
        this.renderSubview('.alert', this.messageBoxView);
      } else {
        _.extend(this.template.scope, data);
        this.template.render();
        webL10n.translate(this.el);
      }

      return this;
    },

    show: function() {
      this.render();
      this.$('.modal').modal();
      return this;
    },

    metadata: function() {
      var title  = this.model.get("title");
      var author = this.model.get("author");
      if (!title && !author)
        return { id: "" };

      var id = title && author
             ? "title-and-author" : (title ? "title-only" : "author-only");
      return { id: id, title: title, author: author };
    },

    events: {
      "click .hide-character": "hideCharacter",
      "click .show-character": "showCharacter",
      "click .delete-character": "deleteCharacter"
    },

    hideCharacter: function() {
      this.hideOrShowCharacter("hide");
    },

    showCharacter: function() {
      this.hideOrShowCharacter("show");
    },

    hideOrShowCharacter: function(which) {
      // Clear error messages
      this.messageBoxView.clearMessage();

      // Replace button with spinner
      var buttonImage = which == "hide"
                       ? $('.hide-character img') : $('.show-character img');
      var originalUrl = buttonImage.attr('src');
      $(buttonImage).attr('src', Backbone.View.appRoot + '/img/loading.svg');

      // Send request
      var view = this;
      var active = which != "hide";
      var keyPrefix = which == "hide"
                    ? "hide-character-failed" : "show-character-failed";
      this.model.save({ active: active }, { patch: true })
          .then(function() {
            view.$('.modal').modal('hide');
          })
          .fail(function(resp) {
            view.messageBoxView.setMessage(resp,
              { keyPrefix: keyPrefix, dismiss: true });
          })
          .always(function() { buttonImage.attr('src', originalUrl); });
    },

    deleteCharacter: function() {
      this.$('.modal').modal('hide');
      this.options.parentView.confirmDelete(this.model.get("sessionId"),
                                            this.model.id);
    }
  })
});
