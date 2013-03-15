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
    this.installObserver("manage-eventName");
    this.installObserver("manage-eventDescr");
    this.installObserver("manage-eventLocation");
    this.installObserver("manage-duration");
    this.installObserver("manage-passcode");
    this.installObserver("manage-galleryDisplay");
    this.installObserver("manage-designId");
    */

    /*
    this.installClickObserver("manage-startSession",
      this.clickOnStartSession.bind(this));
    this.installClickObserver("manage-closeSession",
      this.clickOnCloseSession.bind(this));
      */
  },

  show: function(wallId, tabName) {
    // If we're already showing the correct page, just switch tab
    if (wallId == this.wallId) {
      this.selectTab(tabName);
      return;
    }

    // Load the wall
    this.wallId = wallId;

    // Show loading screen
    $("wall-info").setAttribute("aria-hidden", "true");
    $("wall-loading").setAttribute("aria-hidden", "false");
    this.clearError();

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

  installClickObserver: function(name, callbackFunction) {
    var element = $(name);
    element.removeEventListener("click", callbackFunction, false);
    element.addEventListener("click", callbackFunction, false);
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
    // Basic data
    $("manage-eventName").value = response.name;

    // Make up links
    this.updateShortenableLink($('manage-wallUrl'), response.wallUrl,
                               response.wallUrlShort);
    this.updateShortenableLink($('manage-editorUrl'), response.editorUrl,
                               response.editorUrlShort);

    // Event data
    $("manage-eventLocation").value = response.eventLocation;
    $("manage-eventDescr").value = response.eventDescr;

    // Sessions
    this.updateSessionInfo(response.session);

    // Design
    var designRadios =
      this.form.querySelectorAll("input[type=radio][name=design]");
    for (var i = 0; i < designRadios.length; i++) {
      var radio = designRadios[i];
      var origValue = radio.checked;
      radio.checked = (radio.value == response.designId);
      if (radio.checked != origValue) {
        // Unfortunately, just changing checked does not trigger a change event
        // in most browsers so we trigger an event specifically fire the event
        var evt = document.createEvent('HTMLEvents');
        evt.initEvent('change', true, true);
        radio.dispatchEvent(evt);
      }
    }
    $("manage-duration").value = response.duration == null
                               ? ""
                               : response.duration/1000;
    $("manage-defaultDuration").textContent = response.defaultDuration/1000;

    // Privacy
    var dummypasscode = "";
    for (var i = 0; i < response.passcode; i++) {
      dummypasscode += "x";
    }
    $("manage-passcode").value = dummypasscode;
    var radios = document.getElementsByName("manage-galleryDisplay");
    if (response.galleryDisplay == 0) {
      radios[0].checked = false;
      radios[1].checked = true;
    } else {
      radios[0].checked = true;
      radios[1].checked = false;
    }

    // Collaboration
    // Characters

    // Switch to appropriate tab
    if (tabName) {
      this.selectTab(tabName);
    }

    // Hide loading and show page
    $("wall-loading").setAttribute("aria-hidden", "true");
    $("wall-info").setAttribute("aria-hidden", "false");
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
   * Error handling
   */
  showError: function(key) {
    // XXXl10n Hook this up to our localization
    switch(key) {
      case 'timeout':
        msg = "接続できませんでした.";
        break;

      case 'parallel-change':
        msg = "Someone else has updated the session."
            + " Please confirm the updated session status.";
        break;

      default:
        msg = "Something went wrong";
        break;
    }

    var messageBlock = this.errorBlock.querySelector('.errorMessage');
    messageBlock.textContent = msg;

    this.errorBlock.setAttribute('aria-hidden', 'false');
  },

  clearError: function(key) {
    this.errorBlock.setAttribute('aria-hidden', 'true');
    this.errorBlock.querySelector('.errorMessage').textContent = '';
  },

  get errorBlock() {
    return document.querySelector('#wall-info .error');
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
    // (In this case we really should set a timeout on the error message but
    // that seems like a bit too much work for something that won't happen
    // often.)
    if (key == 'parallel-change') {
      this.updateSessionInfo(detail);
    } else {
      this.restoreSessionInfo();
    }
    this.showError(key);
  },

  startUpdateSessionInfo: function() {
    this.clearError();
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
