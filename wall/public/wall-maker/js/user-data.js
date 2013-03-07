/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var UserData =
{
  update: function (path) {
    WallSummaryController.showLoading();
    ParaPara.postRequest(WallMaker.rootUrl + '/mysummary', null,
                         UserData._gotUserData,
                         UserData._gotUserDataFailed);
  },

  _gotUserData: function (response, updateWallsOnly) {
    WallSummaryController.update(response['walls']);
    if (!updateWallsOnly) {
      UserData._updateDesigns(response['designs']);
    }
  },

  _gotUserDataFailed: function (reason, detail) {
    // XXX
    console.log("XXX Failed: " + reason + ", " + detail);
  },

  updateWalls: function (path) {
    WallSummaryController.showLoading();
    ParaPara.postRequest(WallMaker.rootUrl + '/mysummary', null,
                         function (response) {
                           UserData._gotUserData(response,
                             true /* update walls only */);
                         },
                         UserData._gotUserDataFailed);
  },

  _updateDesigns: function (designs) {
    // XXX
    console.log("XXX _updateDesigns");
    console.log(designs);
  }
};

var WallSummaryController =
{
  update: function(walls) {
    WallSummaryController.clear(); // XXX Probably should add a flag to say
                                   // 'don't show the home screen' to avoid
                                   // flicker

    if (!walls.length) {
      WallSummaryController._togglePage('firstTimeHome');
      return;
    }

    // We build up content according to the following template:
    //
    //   <ul>
    //     <li>
    //       <a href="/wall-maker/wall/ID" title="event name">
    //         <img src="thumbnail">
    //       </a>
    //       <div class="label">event name</div>
    //     </li>
    //   </ul>

    var list = document.createElement('ul');
    // XXX Move this after the loop once we have the new link management stuff
    // in place
    $('wallSummary').appendChild(list);

    for (var i = 0; i < walls.length; ++i) {
      var wall = walls[i];

      // Create list item
      var li = document.createElement('li');

      // Thumbnail link
      var a = document.createElement('a');
      a.setAttribute('class', 'thumbnail');
      a.setAttribute('title', wall['eventName']);
      var href = WallMaker.rootUrl + '/wall/' + wall['wallId'];
      a.setAttribute('href', href);

      // Thumbnail image
      var thumbnailImg = document.createElement('img');
      thumbnailImg.setAttribute('src', wall['thumbnail']);
      a.appendChild(thumbnailImg);

      // Add to list
      li.appendChild(a);

      // Add event name
      var eventLabel = document.createElement('div');
      eventLabel.setAttribute('class', 'label');
      eventLabel.textContent = wall['eventName'];
      li.appendChild(eventLabel);

      // Add to list
      list.appendChild(li);

      // Assign link handler
      // XXX Remove
      Navigation.registerLinkHandler('wall/' + wall['wallId'], function(e) {
        Navigation.goToScreen(e.currentTarget.getAttribute('href'));
      });
    }
    WallSummaryController._togglePage('wallSummary');
  },

  showLoading: function() {
    WallSummaryController._togglePage('wallSummaryLoading');
  },

  _showFirstTime: function() {
    WallSummaryController._togglePage('firstTimeHome');
  },

  _togglePage: function(page) {
    // Structure:
    //   wallSummaryHome
    //     wallSummary
    //     wallSummaryLoading
    //     wallSummaryError
    //   firstTimeHome

    // First time page
    if (page == 'firstTimeHome') {
      $('wallSummaryHome').setAttribute('aria-hidden', 'true');
      $('firstTimeHome').setAttribute('aria-hidden', 'false');
      return;
    }

    // Summary sub-page
    $('firstTimeHome').setAttribute('aria-hidden', 'true');
    var subpages = [ $('wallSummary'),
                     $('wallSummaryLoading'),
                     $('wallSummaryError') ];
    for (var i = 0; i < subpages.length; i++) {
      subpages[i].setAttribute('aria-hidden',
          subpages[i].id == page ? 'false' : 'true');
    }
    $('wallSummaryHome').setAttribute('aria-hidden', 'false');
  },

  _showError: function() {
    WallSummaryController._togglePage('wallSummaryError');
    // XXX Set error message
  },

  clear: function() {
    var listContainer = $('wallSummary');
    while (listContainer.hasChildNodes()) {
      listContainer.removeChild(listContainer.lastChild);
    }
    WallSummaryController._togglePage('firstTimeHome');
  }
};
