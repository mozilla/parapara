/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Common utility stuff
 *
 * Move this to a utils.js?
 */
var $ = function(id) { return document.getElementById(id); };

/*
 * Navigation
 */


function updateWalls() {
  // XXX Display spinner while loading
  ParaPara.postRequest(WallMaker.rootUrl + '/api/mywalls', null,
                       refreshWallList, getWallsFailed);
}

function refreshWallList(wallList) {
  var listContainer = document.getElementById('wallList');
  // Reset list
  // XXX Factor this into a utility function somewhere
  while (listContainer.hasChildNodes()) {
    listContainer.removeChild(listContainer.lastChild);
  }
  if (wallList.length) {
    var list = document.createElement('ul');
    listContainer.appendChild(list);
    for (var i = 0; i < wallList.length; ++i) {
      var wall = wallList[i];
      var li = document.createElement('li');
      var container = document.createElement('div');

      var a = document.createElement('a');
      var thumbnailContainer = document.createElement('div');
      thumbnailContainer.setAttribute('class', 'thumbnail');
      var thumbnailImg = document.createElement('img');
      // temporary: have to use 'thumb'
      thumbnailImg.setAttribute('src',
        WallMaker.rootUrl + '/img/design-'+wall['designId']+'-preview.svg');
      thumbnailContainer.appendChild(thumbnailImg);
      var href = WallMaker.rootUrl + '/wall/'+wall['wallId'];
      a.setAttribute('href', href);
      a.appendChild(thumbnailContainer);
      container.appendChild(a);
      
      var eventLabel = document.createElement('div');
      eventLabel.setAttribute('class', 'label');
      eventLabel.textContent = wall['eventName'];
      container.appendChild(eventLabel);
      
      li.appendChild(container);
      list.appendChild(li);
      // Manage
      Navigation.registerLinkHandler('wall/' + wall['wallId'], function(e) { 
        Navigation.goToScreen(e.currentTarget.getAttribute('href'));
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
