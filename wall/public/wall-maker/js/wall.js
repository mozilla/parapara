/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
function init() {
  LoginController.relogin();
}
*/

/*
 * Navigation
 */

function updateWalls() {
  // XXX Display spinner while loading
  ParaPara.postRequest('api/mywalls', null, refreshWallList, getWallsFailed);
}

function refreshWallList(wallList) {
  var listContainer = document.getElementById('wallList');
  // Reset list
  // XXX Factor this into a utility function somewhere
  while (listContainer.hasChildNodes()) {
    listContainer.removeChild(listContainer.lastChild);
  }
  if (wallList.length) {
    var list = document.createElement("ul");
    listContainer.appendChild(list);
    for (var i = 0; i < wallList.length; ++i) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.textContent = wallList[i]['eventName'];
      var href = "manage/"+wallList[i]['wallId'];
      a.setAttribute("href", href);
      li.appendChild(a);
      list.appendChild(li);
      //manage
      registerLinkHandler(href, function(e) { 
        goToScreen(e.target.getAttribute("href"));
      });
    }
    document.getElementById('prevWalls').style.display = 'block';
  } else {
    document.getElementById('prevWalls').style.display = 'none';
  }
}

function getWallsFailed(reason, detail) {
  // XXX Automatically try again
  // XXX Finally give a link saying what happenned
  // XXX If the error is that we're logged out, do login stuff
  console.log(reason, detail);
}

//window.addEventListener("load", init, false);
