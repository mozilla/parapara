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
  // XXX Display spinner while loading
  ParaPara.postRequest('api/mywalls', null, refreshWallList, getWallsFailed);
}

function refreshWallList(wallList) {
  var listContainer = document.getElementById('wallList');
  // XXX Factor this into a utility function somewhere
  while (listContainer.hasChildNodes()) {
    listContainer.removeChild(listContainer.lastChild);
  }
  var list = document.createElement("ul");
  for (var i = 0; i < wallList.length; ++i) {
    var li = document.createElement("li");
    li.textContent = wallList[i]['eventName'];
    list.appendChild(li);
  }
  listContainer.appendChild(list);
}

function getWallsFailed(reason, detail) {
  // XXX
  console.log(reason, detail);
}

/*
 * Login
 */

function loginInit() {
  document.getElementById("browserid").addEventListener('click', login, false);
  document.getElementById("logout").addEventListener('click', logout, false);

  login = new ParaPara.Login('WMSESSID', loggedIn, loggedOut, loginError);
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
  document.getElementById('homeScreen').style.display = 'block';
  updateWalls();
}

function loggedOut() {
  document.getElementById('loginStatusYes').style.display = 'none';
  document.getElementById('loginStatusNo').style.display = 'block';
  document.getElementById('homeScreen').style.display = 'none';
}

function loginError(reason, detail) {
  var errorBlock = document.getElementById('loginError');
  errorBlock.textContent = "Login failed. Please try again.";
  errorBlock.style.display = 'block';
}

window.addEventListener("load", init, false);
