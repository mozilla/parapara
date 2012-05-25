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

/*
 * Login
 */

function loginInit() {
  document.getElementById("browserid").addEventListener('click',
    login, false);
  document.getElementById("logout").addEventListener('click', logout, false);

  // Re-login
  // XXX We should try doing an XHR request to the server first to get back the
  // needed info. It will provide the required info if we still have a valid
  // session cookie. If it returns null, we can do the following.
  // (It seems to be a bit buggy---we end up getting two calls to gotAssertion,
  // one where the assertion is null and one where it's filled in meaning the
  // display will flicker.)
  navigator.id.get(gotAssertion, { silent: true });
}

function login() {
  document.getElementById('loginError').style.display = 'none';
  navigator.id.get(gotAssertion, { allowPersistent: true });
}

function logout() {
  clearSessionCookie();
  showLoggedOut();
  window.navigator.id.logout();
}

function gotAssertion(assertion) {
  if (assertion !== null) {
    ParaPara.postRequest('api/login', { assertion: assertion },
                         requestSuccess, loginFail);
  } else {
    loginFail('login-abort');
  }
}

function requestSuccess(response) {
  // The request to the server returned successfully, but we still need to check
  // the response
  if (response.error_key) {
    loginFail(response.error_key, response.error_detail);
    return;
  }
  loginSuccess(response.email);
}

function loginSuccess(email) {
  showLoggedIn(email);
}

function loginFail(reason, detail) {
  // Known reasons (roughly in order of when they might happen):
  //
  //   login-abort :    didn't get an assertion from BrowserID to begin with
  //                    (e.g. user cancelled sign-in, didn't opt-in to
  //                    persistent login, the certificate for the persistent
  //                    login has expired etc.)
  //   (Following relate to verifying the assertion)
  //   send-fail :      something went wrong with sending the request
  //   no-access :      couldn't access the server
  //   timeout :        timed out waiting for response
  //   no-assertion :   didn't send an assertion to verify
  //   server-fail :    something went wrong on our server
  //   browserid-fail : something went wrong with browserid
  //   login-fail :     browser id says status == failure
  //

  switch (reason) {
    case 'login-abort':
      // Do nothing, not an error.
      break;
    default:
      {
        var debugMsg = "Login failed [" + reason + "]";
        if (detail) {
          debugMsg += ": " + detail;
        }
        console.debug(debugMsg);

        var errorBlock = document.getElementById('loginError');
        errorBlock.textContent = "Login failed. Please try again.";
        errorBlock.style.display = 'block';
      }
      break;
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

window.addEventListener("load", init, false);
