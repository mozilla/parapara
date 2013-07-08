/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define(["underscore",
        "backbone" ], function(_, Backbone) {

  return function(options) {

    // Check required parameters
    console.assert(!!options.sessionName, "No session name specified");

    // Private state
    var watching = false;
    var silent   = false;

    // Public members
    this.email   = null;

    // Event dispatching
    _.extend(this, Backbone.Events);

    // This pointer
    var Login = this;

    // This tries to re-establish the previous session if there was one and must
    // be called first.
    this.init = function() {
      // Check this was only called once
      console.assert(!watching, "Already called init?");

      // Clear email
      Login.email = null;

      // Don't fire a 'loginerror' event if this causes problems
      silent = true;

      // See if we still have a valid session
      if (haveSessionCookie()) {
        Backbone.$.get('/api/whoami')
          // Got a cookie and the server recognises the session
          .done( function(response) { startWatching(response.email); } )
          // Server error, probably session has expired
          .fail( function() { startWatching(null); } );
      } else {
        startWatching(null);
      }
    };

    // This must be called in a trusted context, e.g. a click handler
    this.login = function() {
      // Clear email
      Login.email = null;

      // Check watch() has been called
      console.assert(watching, "Forgot to call init");

      // Report errors since this is an explicit login request (not
      // a relogin)
      silent = false;

      // Do login
      navigator.id.request(_.omit(options, 'sessionName'));
    };

    // This must be called in a trusted context, e.g. a click handler
    this.logout = function() {
      // Clear email
      Login.email = null;

      // Check watch() has been called
      console.assert(watching, "Forgot to call init");

      navigator.id.logout();
    }

    // ----------------------------
    // Internal helpers
    // ----------------------------

    // Register with Persona for login/logout calls
    function startWatching(email) {
      // Make sure we dispatch either a login or logout event on initial match
      // There seems to be a bug in Persona where when we pass loggedInUser:null
      // and the server agrees the user is not logged in, we don't get a call to
      // onmatch. However, we *do* get a call to onready so we hook in there and
      // call onPersonalLogout if necessary.
      var onmatch = null,
          onready = null;
      if (email) {
        onmatch = function() { onPersonaLoginSuccess( { email: email }); };
      } else {
        var calledOnMatch = false;
        onmatch = function() {
          calledOnMatch = true;
          onPersonaLogout();
        };
        onready = function() {
          if (!calledOnMatch) {
            onPersonaLogout();
          }
        };
        email = null;
      }

      // Start watching
      watching = true;
      navigator.id.watch({
        loggedInUser: email,
        onlogin: onPersonaLogin,
        onlogout: onPersonaLogout,
        onmatch: onmatch,
        onready: onready
      });
    }

    // Verify an assertion and if it's ok, finish logging in
    function onPersonaLogin(assertion) {
      Backbone.$.post('/api/login',
                      { assertion: assertion })
        // Success, finish logging in
        .done(onPersonaLoginSuccess)
        // Couldn't verify
        .fail(onPersonaLoginFail);
    }

    function onPersonaLoginSuccess(response) {
      Login.email = response.email;
      Login.trigger("login", response.email);
    }

    function onPersonaLoginFail(xhr, reason, detail) {
      // Known reasons (roughly in order of when they might happen):
      //
      //   error :          something went wrong with sending the request
      //                    (e.g. 404 etc.)
      //   timeout :        timed out waiting for response
      //   parsererror :    failed to parse the response?
      //   abort :          send request aborted
      //   no-assertion :   didn't send an assertion to verify
      //   server-fail :    something went wrong on our server
      //   browserid-fail : something went wrong with browserid
      //   login-fail :     browser id says status == failure
      //
      var debugMsg = "Login failed [" + reason + "]";
      if (detail) {
        debugMsg += ": " + detail;
      }
      console.debug(debugMsg);

      Login.email = null;
      if (!silent) {
        Login.trigger("loginerror", reason, detail);
      } else {
        Login.trigger("logout");
      }
    }

    // Clear login state (but DON'T call Persona since this is called in
    // situations where Persona already knows we're logged out)
    function onPersonaLogout() {
      Login.email = null;
      clearSessionCookie();
      Login.trigger("logout");
    }

    function clearSessionCookie() {
      var expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate()-1);
      document.cookie =
        options.sessionName + "=; expires=" +
        expiryDate.toGMTString() + "; path=/";
    }

    function haveSessionCookie() {
      var cookieEq = options.sessionName + "=";
      var cookies = document.cookie.split(';');
      for(var i=0; i < cookies.length; i++) {
        var cookie = cookies[i].trim();
        if (cookie.substring(0, cookieEq.length) == cookieEq)
          return true;
      }
      return false;
    }
  }
});
