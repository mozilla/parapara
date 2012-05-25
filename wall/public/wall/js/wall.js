/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function init() {
  loginInit();
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
}

function login() {
  document.getElementById('loginError').style.display = 'none';
  navigator.id.get(gotAssertion);
}

function logout() {
  var expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate()-1);
  document.cookie =
    "PHPSESSID=; expires=" + expiryDate.toGMTString() + "; path=/";
  showLoggedOut();
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
  //                    (user cancelled sign-in?)
  //   (Following relate to verifying the assertion)
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

  switch (reason) {
    case 'login-abort':
      // Do nothing, not an error.
      break;
    default:
      {
        var errorBlock = document.getElementById('loginError');
        errorBlock.textContent = "Login failed. Please try again.";
        errorBlock.style.display = 'block';
      }
      break;
  }
  showLoggedOut();
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

window.addEventListener("load", init, false);
