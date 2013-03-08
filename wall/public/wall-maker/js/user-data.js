/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Fetches critical data needed for the application to run such as:
 *
 * - the list of available designs
 * - the user's walls
 * - user preferences (TODO)
 *
 * This class is complicated by the fact that when we want to *only* update the
 * list of walls (e.g. because we created a new one), we use the same API and
 * same class and just set a flag to say, "only update the walls" and just
 * ignore the rest of the data.
 *
 * These cases behave quite differently. In the case where we're updating
 * everything, failure means nothing works. Hence we blank out the whole screen
 * during loading and error. Other actions may block on this happenning.
 *
 * When we're just updating the walls no-one really cares.
 */
var UserData =
{
  connectionMaxRetries: 2,
  connectionTimeout: 6000,
  onupdate: null,

  update: function (onupdate) {
    // When we're fetching user data we blank out the whole interface since it
    // doesn't make sense to allow the user to do things while we're missing
    // critical data.
    //
    // onupdate should restore the screen
    Navigation.showScreen('screen-loading');

    // This is the action to perform on success
    if (onupdate) {
      UserData.onupdate = onupdate;
    }

    ParaPara.postRequest(WallMaker.rootUrl + '/mysummary', null,
                         UserData._gotUserData,
                         UserData._gotUserDataFailed,
                         UserData.connectionMaxRetries,
                         UserData.connectionTimeout);
  },

  _gotUserData: function (response, wallsOnly) {
    WallSummaryController.update(response['walls']);
    if (!wallsOnly) {
      UserData._updateDesigns(response['designs']);
      if (UserData.onupdate) {
        UserData.onupdate();
      } else {
        Navigation.goToCurrentScreen();
      }
    }
  },

  _gotUserDataFailed: function (reason, detail, wallsOnly) {
    if (wallsOnly) {
      WallSummaryController._showError();
    } else {
      Navigation.showErrorPage("接続できませんでした",
        { 'retry': function() {
            Navigation.showScreen('screen-loading');
            UserData.update();
          }
        });
    }
    console.debug("Failed to get user data: " + reason + ", " + detail);
  },

  updateWalls: function () {
    WallSummaryController.showLoading();
    var wallsOnly = true;
    ParaPara.postRequest(
      WallMaker.rootUrl + '/mysummary', null,
      function (response) {
        UserData._gotUserData(response, wallsOnly);
      },
      function (reason, detail) {
        UserData._gotUserDataFailed(reason, detail, wallsOnly);
      },
      UserData.connectionMaxRetries,
      UserData.connectionTimeout
    );
  },

  _updateDesigns: function (designs) {
    var containers = document.querySelectorAll(".designSelection");
    for (var i = 0; i < containers.length; i++) {
      var container = containers[i];

      // Empty container
      while (container.hasChildNodes()) {
        container.removeChild(container.lastChild);
      }

      // Create content
      var selector = new DesignSelection(container, designs);
    }
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
  },

  clear: function() {
    var listContainer = $('wallSummary');
    while (listContainer.hasChildNodes()) {
      listContainer.removeChild(listContainer.lastChild);
    }
    WallSummaryController._togglePage('firstTimeHome');
  }
};

var DesignSelection = function(container, designs) {

  this.container = null;

  this.init = function(container, designs) {
    this.container = container;
    this._addDesigns(designs);
  };

  this._addDesigns = function(designs) {
    for (var i = 0; i < designs.length; i++) {
      var design = designs[i];

      // We build up content according to the following template:
      //
      //  <label>
      //    <input type="radio" name="design" value="1" required>
      //    <img class="designPreview" src="thumbnail">
      //    -or-
      //    <video class="designPreview" loop src="video">
      //    -or-
      //    <video class="designPreview" loop>
      //      <source src="video1">
      //      <source src="video2">
      //    </video>
      //  </label>

      var label = document.createElement('label');

      // Radio button
      var radio = document.createElement('input');
      radio.setAttribute("type", "radio");
      radio.setAttribute("name", "design");
      radio.setAttribute("value", design['id']);
      radio.setAttribute("required", "required");
      label.appendChild(radio);

      // Add handler
      radio.addEventListener('change', this._radioChange.bind(this), false);

      // Preview
      this._addPreview(label, design['video'], design['thumbnail']);

      // Add design
      this.container.appendChild(label);
    }
  };

  this._addPreview = function(container, videos, thumbnail) {

    // If possible add video
    if (videos && videos.length) {
      var video = document.createElement('video');
      video.setAttribute("class", "designPreview");
      video.setAttribute("loop", "loop");

      if (thumbnail) {
        video.setAttribute("poster", thumbnail);
      }
      if (videos.length == 1) {
        video.setAttribute("src", videos[0]);
      } else {
        for (var i = 0; i < videos.length; i++) {
          var source = document.createElement('source');
          source.setAttribute("src", videos[i]);
          video.appendChild(source);
        }
      }
      container.appendChild(video);

    // Otherwise try a thumbnail
    } else if (thumbnail) {
      var thumb = document.createElement('img');
      thumb.setAttribute("class", "designPreview");
      thumb.setAttribute("src", thumbnail);
      container.appendChild(thumb);
    }
  };

  this._radioChange = function(evt) {
    var radios =
      this.container.querySelectorAll("input[type=radio][name=design]");
    for (var i = 0; i < radios.length; i++) {
      var radio = radios[i];

      // Set selected class on parent label
      var label = this._getLabelForRadio(radio);
      if (!label)
        continue;
      if (radio.checked) {
        label.classList.add("selected");
      } else {
        label.classList.remove("selected");
      }

      // Update play state of video
      var videos = label.getElementsByTagName("VIDEO");
      if (videos.length) {
        if (radio.checked) {
          videos[0].play();
        } else {
          videos[0].pause();
          videos[0].currentTime = 0;
        }
      }
    }
  };

  this._getLabelForRadio = function(radio) {
    var node = radio;
    while (node && node.tagName !== "LABEL")
      node = node.parentNode;
    return node;
  };

  this._getVideoForLabel = function(label) {
  };

  this.init(container, designs);
};
