/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var login;

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

  login = new ParaPara.Login('PHPSESSID', loggedIn, loggedOut, loginError);
  login.relogin();
}

function login() {
  document.getElementById('loginError').style.display = 'none';
  login.login();
}

function logout() {
  login.logout();
}

function loggedIn(email) {
  document.getElementById('loginMail').textContent = email;
  document.getElementById('loginStatusYes').style.display = 'block';
  document.getElementById('loginStatusNo').style.display = 'none';
  updateWalls();
}

function loggedOut() {
  document.getElementById('loginStatusYes').style.display = 'none';
  document.getElementById('loginStatusNo').style.display = 'block';
}

function loginError(reason, detail) {
  var errorBlock = document.getElementById('loginError');
  errorBlock.textContent = "Login failed. Please try again.";
  errorBlock.style.display = 'block';
}

window.addEventListener("load", init, false);
