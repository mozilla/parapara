/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'underscore',
         'backbone',
         'webL10n',
         'views/soma-view',
         'text!templates/manage-sessions.html' ],
function(_, Backbone, webL10n, SomaView, templateString) {

  return SomaView.extend({
    initialize: function() {
      // Register for updates to the list of characters
      this.listenTo(this.model.sessions, "sync", this.render);

      // Manage currently selected session
      this._selectedSessionId = null;
      Object.defineProperty(this, "selectedSessionId",
        { get: function() {
            return this._selectedSessionId ||
                   this.model.get("latestSession").sessionId; }
        }
      );
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

      // Select session
      [ this.selectedSessionId, this.model.get("latestSession").sessionId ]
        .every(function(candidateId) {
          var elem = $('#session-' + candidateId);
          elem.collapse('show');
          // If the item was NOT found, continue
          return elem.length == 0;
        });

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
           // Fill in date properties
           .map(localizeSessionDates)
           // Reverse the list of sessions so newer ones appear first
           .reverse()
           .value();
        ;
      }
      return data;
    },

    showSubsection: function(subsection) {
      this._selectedSessionId = parseInt(subsection);
    },
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
