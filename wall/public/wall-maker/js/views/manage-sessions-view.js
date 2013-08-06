/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/soma-view',
         'text!templates/manage-sessions-view.html' ],
function(_, Backbone, webL10n, SomaView, templateString) {

  return SomaView.extend({
    initialize: function() {
      // Initial state
      this.sessionsLoaded = false;

      // Trigger async load of sessions
      var self = this;
      console.log(this.model);
      this.model.fetchSessionsAndCharacters()
      .then(function() {
        self.sessionsLoaded = true;
        self.update();
      });
    },

    render: function() {
      // Set up template data
      var self = this;
      var data =
      {
        wall: this.model.toJSON(),
        sessions: function() {
          return self.sessionsLoaded ? self.model.sessions.toJSON() : [];
        },
        sessionsLoaded: function() { return self.sessionsLoaded; }
      };

      // XXX Set a value depending on whether the characters have loaded or not
      // that will determine if we show the spinner or the accordion

      // Render template
      this.renderTemplate(templateString, data);

      return this;
    },

    update: function() {
      if (this.template) {
        this.template.render();
      }
    },
  });
});
