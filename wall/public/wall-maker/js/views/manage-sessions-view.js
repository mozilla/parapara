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
      // Register for updates to the list of characters
      this.listenTo(this.model.sessions, "sync", this.render);
    },

    render: function() {
      // Render template
      if (!this.template) {
        this.renderTemplate(templateString, this.getData());
      } else {
        _.extend(this.template.scope, this.getData());
        this.template.render();
        webL10n.translate(this.el);
      }

      return this;
    },

    getData: function() {
      var data = {
        sessionsLoaded: this.model.sessionsLoaded,
        wall: this.model.toJSON(),
        sessions: []
      };

      if (this.model.sessionsLoaded) {
        data.sessions =
          _.chain(this.model.sessions.toJSON())
           // Annotate every sessions object with 'running' property
           .map(function(session) {
                  session.running = session.end === null;
                  return session;
                })
           // Reverse the list of sessions so newer ones appear first
           .reverse()
           .value();
        ;
      }
      return data;
    },
  });
});
