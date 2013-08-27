/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/soma-view',
         'views/manage-character-view',
         'text!templates/manage-sessions.html' ],
function(_, Backbone, webL10n, SomaView, ManageCharacterView, templateString) {

  return SomaView.extend({
    initialize: function() {
      // Alias message box view
      this.messageBoxView = this.options.messageBoxView;

      // Register for updates to the list of characters
      this.listenTo(this.model.sessions, "sync", this.sync);
      this.listenTo(this.model.sessions, "error", this.error);
      this.listenTo(this.model.sessions, "request", this.request);

      // Manage currently selected session
      // A value of null for _selectedSessionId means "Use the latest session"
      this._selectedSessionId = null;
      Object.defineProperty(this, "latestSessionId",
        { get: function() {
            return this.model.get("latestSession")
                 ? this.model.get("latestSession").sessionId
                 : null;
          }
        });
      Object.defineProperty(this, "selectedSessionId",
        { get: function() {
            return this._selectedSessionId || this.latestSessionId;
          }
        });

      // Re-render on localize (there are one or two strings we set by code)
      var self = this;
      $(window).on("localized", null, function() { self.render(); });
    },

    events: {
      "click .refresh": "refresh",
      "click #new-session": "startSession",
      "click .end-session": "endSession",
      "click .restart-session": "restartSession",
      "click .thumbnails .delete-character": "onConfirmDelete"
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

      // Make sure the right accordion is visible
      this.expandSubsection();

      return this;
    },

    getData: function() {
      var data = {
        sessionsLoaded: this.model.sessionsLoaded,
        haveSessions: this.model.sessionsLoaded &&
                      this.model.sessions.length > 0,
        noSessions: this.model.sessionsLoaded &&
                    this.model.sessions.length == 0,
        wall: this.model.toJSON(),
        sessions: []
      };

      if (this.model.sessionsLoaded) {
        data.sessions =
          _.chain(this.model.sessions.models)
           .map(prepareSession)
           .reverse() // Reverse the list of sessions so newer ones appear first
           .value();
        // Update 'canrestart' on latest session
        if (data.sessions.length && !data.sessions[0].running) {
          data.sessions[0].canrestart = true;
        }
      }

      function prepareSession(session) {
        var result = session.toJSON();
        result.running = result.end === null;
        // We set all sessions as not being able to restart and then we update
        // the latest session later
        result.canrestart = false;
        result.characters = session.characters.map(prepareCharacter);

        return localizeSessionDates(result);
      }

      function prepareCharacter(character) {
        var result = character.toJSON();
        result.title = result.title ||
                       webL10n.get('untitled-id', { id: result.charId });
        result.classes = result.active ? "" : "inactive";
        return result;
      }

      return data;
    },

    sync: function() {
      // Detect if the session we are currently pointing to still exists, and,
      // if not update
      if (this.model.sessionsLoaded &&
          this._selectedSession &&
          !this.model.sessions.get(this._selectedSession)) {
        // XXX Test this
        this.changeSelectedSession(null);
      }

      this.render();
    },

    refresh: function() {
      this.model.fetchCharacters();
    },

    showSession: function(session, characterId) {
      // Expand appropriate session
      this._selectedSessionId = parseInt(session);
      this.expandSubsection();

      // If a character is specified, generate the appropriate view
      if (characterId) {
        var self = this;
        this.model.sessionsPromise.done(function (sessions) {
          // Look up character
          var session, character;
          if (!(session = sessions.get(self.selectedSessionId)) ||
              !(character = session.characters.get(parseInt(characterId)))) {
            self.messageBoxView.setMessage("character-not-found",
              { dismiss: true });
            return;
          }

          // Create new character view
          self.characterView =
            new ManageCharacterView( { model: character, parentView: self });

          // When the modal is hidden, trigger changed-session
          // This will ensure the URL gets updated to no longer reflect the
          // character ID
          self.characterView.on('hidden', function() {
            self.trigger('changed-session', self.selectedSessionId);
          });

          // Render the character view
          self.$el.append(self.characterView.render().el);
        });
      }
    },

    expandSubsection: function() {
      // We don't bother expanding the session area if this is not visible.
      // This is because it uses a transition and if the content is in
      // a display:none subtree the transition won't run and bootstrap will get
      // confused.
      if (!this.$el.is(':visible'))
        return;

      // Select session based on the first matching session ID
      [ this.selectedSessionId, this.latestSessionId ]
        .every(function(candidateId) {
          var elem = $('#session-' + candidateId);
          if (elem.is(':visible')) {
            elem.collapse('show');
          }
          // If the item was NOT found, continue
          return elem.length == 0;
        });
    },

    // Generally the selected session is changed by clicking a URL or navigating
    // and we get told from the outside about it (via showSession).
    //
    // However, for some changes such as creating a new session, deleting
    // a session, or doing a sync that results in some sessions disappearing we
    // change the selected session from within and tell anyone who cares.
    changeSelectedSession: function(newSessionId) {
      this._selectedSessionId = newSessionId;
      this.trigger('changed-session', newSessionId);
    },

    startSession: function() {
      this.disableSessionControls();

      var view = this;
      this.model.startSession({
        success: function(session) {
          // If we are currently bound to a specific session then update to the
          // newly created event
          if (view._selectedSessionId !== null) {
            view.changeSelectedSession(session.id);
          }
        },
        complete: function() { view.enableSessionControls(); },
      });
    },

    endSession: function() {
      this.disableSessionControls();
      this.model.endSession(
        { complete: this.enableSessionControls.bind(this) }
      );
    },

    restartSession: function() {
      this.disableSessionControls();
      this.model.restartSession(
        { complete: this.enableSessionControls.bind(this) }
      );
    },

    disableSessionControls: function() {
      this.$("#new-session, .end-session .restart-session")
        .attr('disabled', 'disabled');
    },

    enableSessionControls: function() {
      this.$("#new-session, .end-session .restart-session")
        .removeAttr('disabled');
    },

    error: function(sessions, resp, xhr) {
      this.messageBoxView.setMessage(resp,
        { keyPrefix: "session-save-failed", dismiss: true });
    },

    request: function(sessions, xhr, options) {
      this.messageBoxView.clearMessage();
    },

    onConfirmDelete: function(evt) {
      this.confirmDelete(parseInt(evt.target.getAttribute("data-char-id")));
    },

    confirmDelete: function(deleteId) {
      // Set up dialog with character ID to delete
      var confirmDialog = this.$('#confirm-delete-character-modal');
      $('input[name=deleteId]', confirmDialog).val(deleteId);

      // Show confirm dialog
      confirmDialog.modal();
    },

    deleteCharacter: function() {
    }
  });

  function localizeSessionDates(session) {
    // Prepare date strings.
    // e.g. for 'start'
    //   - start: '2013-08-03 08:36:21' => '2013-08-03T08:36:21+00:00'(RFC 3339)
    //   - startDatetime
    //   - startDate
    //   - startTime
    _.each([ "start", "end" ], function(part) {
      // Skip missing values (e.g. when session is running)
      if (!session[part])
        return;

      // Try to convert string to RFC 3339 and parse
      var str = session[part].replace(" ", "T") + "+00:00";
      var date = new Date(str);
      if (isNaN(date.getTime()))
        return;

      // Fill in strings
      session[part] = str;
      session[part + "Datetime"] = date.toLocaleString(webL10n.getLanguage());
      session[part + "Date"] = date.toLocaleDateString(webL10n.getLanguage());
      session[part + "Time"] = date.toLocaleTimeString(webL10n.getLanguage());
    });

    // Choose appropriate date string
    var key;
    if (!session.end) {
      var startDate = new Date(session.start);
      if (isToday(startDate)) {
        key = "session-started-today";
      } else if (isYesterday(startDate)) {
        key = "session-started-yesterday";
      } else {
        key = "session-started";
      }
    } else {
      var startDate = new Date(session.start);
      var endDate   = new Date(session.end);
      if (isSameDay(startDate, endDate)) {
        if (isToday(startDate)) {
          key = "session-range-same-date-today";
        } else if (isYesterday(startDate)) {
          key = "session-range-same-date-yesterday";
        } else {
          key = "session-range-same-date";
        }
      } else {
        key = "session-range";
      }
    }
    session.timeRangeL10nId = key;

    // Is it today in *this* timezone
    function isToday(date) {
      return date.getDate() == (new Date()).getDate();
    }
    // Is it yesterday in *this* timezone
    function isYesterday(date) {
      return date.getDate() == (new Date()).getDate() - 1;
    }
    // Are the dates on the same day in *this* timezone
    function isSameDay(dateA, dateB) {
      return dateA.getDate() == dateB.getDate();
    }

    return session;
  }
});
