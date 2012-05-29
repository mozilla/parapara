/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function init() {
  loginInit();
  document.getElementById('loading').style.display = 'none';
}

/*
 * Navigation
 */

function updateWalls() {
  // XXX
}

/*
 * Login
 */

function loginInit() {
  document.getElementById("browserid").addEventListener('click', login, false);
  document.getElementById("logout").addEventListener('click', logout, false);

  // See if we still have a valid session
  if (haveSessionCookie()) {
    ParaPara.postRequest('api/whoami', null, loginSuccess, silentLogin);
  } else {
    silentLogin();
  }
}

function silentLogin() {
  navigator.id.get(
    function(assertion) {
      return gotAssertion(assertion, /*silent=*/ true);
    },
    { silent: true }
  );
}

function login() {
  document.getElementById('loginError').style.display = 'none';
  navigator.id.get(gotAssertion, { allowPersistent: true });
}

function logout() {
  clearSessionCookie();
  showLoggedOut();
  navigator.id.logout();
}

function gotAssertion(assertion, silent) {
  if (assertion !== null) {
    ParaPara.postRequest('api/login', { assertion: assertion },
                         loginSuccess,
                         function(reason, detail) {
                           return loginFail(reason, detail, silent);
                         });
  } else {
    logout();
  }
}

function loginSuccess(response) {
  showLoggedIn(response.email);
  updateWalls();
}

function loginFail(reason, detail, silent) {
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

  if (!silent) {
    var errorBlock = document.getElementById('loginError');
    errorBlock.textContent = "Login failed. Please try again.";
    errorBlock.style.display = 'block';
  }

  logout();
}

function showLoggedIn(email) {
  document.getElementById('loginMail').textContent = email;
  document.getElementById('loginStatusYes').style.display = 'block';
  document.getElementById('loginStatusNo').style.display = 'none';
}

function showLoggedOut() {
  document.getElementById('loginStatusYes').style.display = 'none';
  document.getElementById('loginStatusNo').style.display = 'block';
}

function clearSessionCookie() {
  var expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate()-1);
  document.cookie =
    "PHPSESSID=; expires=" + expiryDate.toGMTString() + "; path=/";
}

function haveSessionCookie() {
  var cookies = document.cookie.split(';');
  for(var i=0; i < cookies.length; i++) {
    var cookie = cookies[i].trim();
    if (cookie.substring(0, "PHPSESSID=".length) == "PHPSESSID=")
      return true;
  }
  return false;
}

window.addEventListener("load", init, false);
