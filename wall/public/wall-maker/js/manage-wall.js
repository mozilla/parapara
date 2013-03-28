/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var ManageWallController =
{
  init: function() {
    // Session buttons
    $('manage-startSession').addEventListener('click',
      this.startSession.bind(this));
    $('manage-closeSession').addEventListener('click',
      this.closeSession.bind(this));

    // Watch for changes to fields so we can update immediately
    // XXX Rewrite this
    /*
    this.installObserver("manage-name");
    this.installObserver("manage-eventDescr");
    this.installObserver("manage-eventLocation");
    this.installObserver("manage-duration");
    this.installObserver("manage-passcode");
    this.installObserver("manage-galleryDisplay");
    this.installObserver("manage-designId");
    */
  },

  clear: function() {
    this.form.reset();
    this.messageBox.clear();
    this.wallId = null;
  },

  show: function(wallId, tabName) {
    // If we're already showing the correct page, just switch tab
    if (wallId == this.wallId) {
      this.selectTab(tabName);
      return;
    }

    // Show loading screen
    $("wall-info").setAttribute("aria-hidden", "true");
    $("wall-loading").setAttribute("aria-hidden", "false");

    // Clear current state
    this.clear();

    // Fetch wall information
    ParaPara.getUrl('/api/walls/' + wallId,
                    function(response) {
                    this.loadSuccess(response, tabName);
                    }.bind(this),
                    this.loadError.bind(this));
  },

  selectTab: function(tabName) {
    var selectedTabPage = null;

    // Update tabs
    var tabs = document.querySelectorAll("a[aria-role=tab]");
    for (var j = 0; j < tabs.length; j++) {
      var tab = tabs[j];

      // Check if the target of the tab matches tabName
      var matches = tab.getAttribute("href").substr(1) === tabName;
      tab.setAttribute("aria-selected", matches ? "true" : "false");

      // If the tab matches, record what it controls
      if (matches) {
        selectedTabPage = tab.getAttribute("aria-controls");
      }
    }

    // Update panels
    var panels = document.querySelectorAll("section[aria-role=tabpanel]");
    for (var j = 0; j < panels.length; j++) {
      var panel = panels[j];
      panel.setAttribute("aria-hidden",
                         panel.id === selectedTabPage ? "false" : "true");
    }
  },

  saveCurrentTab: function() {
    // XXX This will get called if the user presses enter in a field
  },

  get form() {
    if (!this._form) {
      this._form = document.forms['manageWall'];
    }
    return this._form;
  },

  get messageBox() {
    if (!this._messageBox) {
      this._messageBox = new MessageBox('manage');
    }
    return this._messageBox;
  },

  installObserver: function(name) {
    var element = $(name);
    element.removeEventListener("change", this.valueChanged.bind(this), false);
    element.addEventListener("change", this.valueChanged.bind(this), false);
  },

  valueChanged: function(e) {
    var target = e.target;
    var id = target.getAttribute("id");
    id = id != null ? id : target.getAttribute("name"); //when name is used, it is from radio.
    var name = id.substring(7);//removes "manage-"
    var value = target.value;
    var payload = {wallId: this.wallId, name: name, value: value};
    var messageElement = $(id+"-message");
    this.sendCommand(WallMaker.rootUrl + '/api/updateWall', payload,
                     messageElement);
  },

  sendCommand: function(url, payload, messageElement) {
    // XXX Display the error somewhere now that I've removed the message labels
    ParaPara.postUrl(url, payload,
       function(response) {
          messageElement.classList.remove("error");
          messageElement.textContent = response;
       },
       function(key, detail) {
          messageElement.classList.add("error");
          if (key) {
            messageElement.textContent = key;
          } else {
            messageElement.textContent = "something error";
          }
       }
     );
  },

  loadSuccess: function(response, tabName) {
    // It doesn't make sense to show errors when we change wall
    this.messageBox.clear();

    // Update form fields
    this.updateWallInfo(response);

    // Switch to appropriate tab
    if (tabName) {
      this.selectTab(tabName);
    }

    // Hide loading and show page
    $("wall-loading").setAttribute("aria-hidden", "true");
    $("wall-info").setAttribute("aria-hidden", "false");
  },

  showNewWall: function(wall) {
    this.updateWallInfo(wall);

    $("wall-loading").setAttribute("aria-hidden", "true");
    $("wall-info").setAttribute("aria-hidden", "false");

    this.messageBox.showInfo('created-wall', wall.name, 5000);
  },

  updateWallInfo: function(wall) {
    // Set the ID
    this.wallId = wall.wallId;

    // Basic data
    $("manage-name").value = wall.name;

    // Make up links
    this.updateShortenableLink($('manage-wallUrl'), wall.wallUrl,
                               wall.wallUrlShort);
    this.updateShortenableLink($('manage-editorUrl'), wall.editorUrl,
                               wall.editorUrlShort);

    // Event data
    $("manage-eventLocation").value = wall.eventLocation;
    $("manage-eventDescr").value = wall.eventDescr;

    // Sessions
    this.updateSessionInfo(wall.latestSession);

    // Design
    var designRadios =
      this.form.querySelectorAll("input[type=radio][name=design]");
    for (var i = 0; i < designRadios.length; i++) {
      var radio = designRadios[i];
      var origValue = radio.checked;
      radio.checked = (radio.value == wall.designId);
      if (radio.checked != origValue) {
        // Unfortunately, just changing checked does not trigger a change event
        // in most browsers so we trigger an event specifically fire the event
        var evt = document.createEvent('HTMLEvents');
        evt.initEvent('change', true, true);
        radio.dispatchEvent(evt);
      }
    }
    $("manage-duration").value = wall.duration == null
                               ? ""
                               : wall.duration/1000;
    $("manage-defaultDuration").textContent = wall.defaultDuration/1000;

    // Privacy
    var dummypasscode = "";
    for (var i = 0; i < wall.passcodeLen; i++) {
      dummypasscode += "x";
    }
    $("manage-passcode").value = dummypasscode;
    var radios = document.getElementsByName("manage-galleryDisplay");
    if (wall.galleryDisplay == 0) {
      radios[0].checked = false;
      radios[1].checked = true;
    } else {
      radios[0].checked = true;
      radios[1].checked = false;
    }

    // Collaboration
    // Characters
  },

  updateShortenableLink: function(linkContainer, url, shortUrl) {
    // Empty container
    while (linkContainer.hasChildNodes()) {
      linkContainer.removeChild(linkContainer.lastChild);
    }

    // Add main link
    var mainLink = document.createElement("a");
    mainLink.setAttribute("href", url);
    mainLink.textContent = url;
    linkContainer.appendChild(mainLink);

    // Add short link (if available) in braces
    if (shortUrl) {
      var shortLink = document.createElement("a");
      shortLink.setAttribute("href", shortUrl);
      shortLink.textContent = shortUrl;
      linkContainer.appendChild(document.createTextNode(" ("));
      linkContainer.appendChild(shortLink);
      linkContainer.appendChild(document.createTextNode(")"));
    }
  },

  loadError: function(key, detail) {
    // XXX Need to translate errors here
    var msg = "エラー";
    switch (key) {
      case 'access-denied':
        msg = "アクセスできません。";
        break;
      case 'not-found':
        msg = "壁が見つかりませんでした。";
        break;
    }
    Navigation.showErrorPage(msg);
  },

  /*
   * Session management
   */
  startSession: function() {
    this.startUpdateSessionInfo();
    ParaPara.postUrl(WallMaker.rootUrl + '/api/startSession',
      {wallId: this.wallId, sessionId: this.sessionId},
      this.updateSessionInfo.bind(this),
      this.handleSessionError.bind(this)
    );
  },

  closeSession: function() {
    this.startUpdateSessionInfo();
    ParaPara.postUrl(WallMaker.rootUrl + '/api/closeSession',
      {wallId: this.wallId, sessionId: this.sessionId},
      this.updateSessionInfo.bind(this),
      this.handleSessionError.bind(this)
    );
  },

  handleSessionError: function(key, detail) {
    // In the case where we detect parallel changes, we use the updated
    // information rather than restoring the old information
    // We also set a timeout on the message.
    var timeout = null;
    if (key == 'parallel-change') {
      this.updateSessionInfo(detail);
      timeout = 8000;
    } else {
      this.restoreSessionInfo();
    }
    this.messageBox.showError(key, detail, timeout);
  },

  startUpdateSessionInfo: function() {
    this.messageBox.clear();
    document.querySelector(".wallStatus").classList.add("updating");
    // Remember our state in case we need to restore it
    this.sessionStatus = $("manage-closeSession").disabled
                       ? 'finished'
                       : 'running';
    // Disable buttons to avoid double-click
    $("manage-startSession").disabled = true;
    $("manage-closeSession").disabled = true;
  },

  restoreSessionInfo: function() {
    // Restore button state
    $("manage-startSession").disabled = false;
    $("manage-closeSession").disabled = this.sessionStatus == 'finished';
    document.querySelector(".wallStatus").classList.remove("updating");
  },

  updateSessionInfo: function(session) {
    $("manage-startSession").disabled = false;
    var statusBlock   = document.querySelector('.wallStatus');
    var time          = document.querySelector('.latestSessionTime');
    var currentStatus = document.querySelector('.currentWallStatus');
    if (session && session.end) {
      // Finished session
      statusBlock.classList.remove('running');
      time.textContent = ParaPara.toLocalDate(session.end) + ' 終了';
      currentStatus.textContent = '終了';
      statusBlock.classList.add('finished');
      $("manage-closeSession").disabled = true;
      this.sessionId = session.id;
    } else if (session && session.start) {
      // Open session
      statusBlock.classList.remove('finished');
      time.textContent = ParaPara.toLocalDate(session.start) + ' 開始';
      currentStatus.textContent = '公開中';
      statusBlock.classList.add('running');
      $("manage-closeSession").disabled = false;
      this.sessionId = session.id;
    } else {
      // No session
      statusBlock.classList.remove('finished');
      statusBlock.classList.remove('running');
      time.textContent = '--';
      currentStatus.textContent = '未発';
      $("manage-closeSession").disabled = true;
      this.sessionId = null;
    }
    document.querySelector(".wallStatus").classList.remove("updating");
  },
};

window.addEventListener('load',
  ManageWallController.init.bind(ManageWallController), false);
