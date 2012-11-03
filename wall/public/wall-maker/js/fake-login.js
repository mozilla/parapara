/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var ParaPara = ParaPara || {};

ParaPara.Login = function(sessionName, loggedIn, loggedOut, loginError,
                          usePersistentLogin) {
  this.sessionName        = sessionName;
  this.loggedIn           = loggedIn;
  this.loggedOut          = loggedOut;
  this.loginError         = loginError;
  this.usePersistentLogin = !!usePersistentLogin;
}

ParaPara.Login.prototype.login = function() {
  ParaPara.postRequest('api/fake-login', { },
                       this.loginSuccess.bind(this),
                       function(reason, detail) {
                         return this.loginFail(reason, detail, silent);
                       }.bind(this));
}

ParaPara.Login.prototype.logout = function() {
  this.clearSessionCookie();
  navigator.id.logout();
  this.loggedOut();
}

ParaPara.Login.prototype.relogin = function() {
  // See if we still have a valid session, otherwise try a silent login
  if (this.haveSessionCookie()) {
    ParaPara.postRequest('api/whoami', null, this.loginSuccess.bind(this),
                         this.reloginFailed.bind(this));
  } else {
    this.reloginFailed();
  }
}

ParaPara.Login.prototype.reloginFailed = function() {
  if (this.usePersistentLogin) {
    navigator.id.get(
      function(assertion) {
        return this.gotAssertion(assertion, /*silent=*/ true);
      }.bind(this),
      { silent: true }
    );
  } else {
    this.loggedOut();
  }
}

ParaPara.Login.prototype.gotAssertion = function(assertion, silent) {
  if (assertion !== null) {
    ParaPara.postRequest('api/fake-login', { assertion: assertion },
                         this.loginSuccess.bind(this),
                         function(reason, detail) {
                           return this.loginFail(reason, detail, silent);
                         }.bind(this));
  } else {
    logout();
  }
}

ParaPara.Login.prototype.loginSuccess = function(response) {
  this.loggedIn(response.email);
}

ParaPara.Login.prototype.loginFail = function(reason, detail, silent) {
  // Known reasons (roughly in order of when they might happen):
  //
  //   send-fail :      something went wrong with sending the request
  //   no-access :      couldn't access the server
  //   timeout :        timed out waiting for response
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

  if (!silent && this.loginError) {
    this.loginError(reason, detail);
  }
  this.logout();
}

ParaPara.Login.prototype.clearSessionCookie = function() {
  var expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate()-1);
  document.cookie =
    this.sessionName + "=; expires=" + expiryDate.toGMTString() + "; path=/";
}

ParaPara.Login.prototype.haveSessionCookie = function() {
  var cookieEq = this.sessionName + "=";
  var cookies = document.cookie.split(';');
  for(var i=0; i < cookies.length; i++) {
    var cookie = cookies[i].trim();
    if (cookie.substring(0, cookieEq.length) == cookieEq)
      return true;
  }
  return false;
}
