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

    // Observe changes to text fields
    [ "manage-name" ].forEach(
      function(id) {
        new ObservedTextBox($(id), function() { console.log("> changed <"); } );
      }
    );
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

function ObservedTextBox(element, onchange)
{
  this.timeoutId = null;
  this.composing = false;
  this.element   = element;
  this.onchange  = onchange;

  // Store current value so we can tell when the field actually changed
  // (Especially when using an IME, the input event alone does not actually
  //  indicate a change to the field's value)
  this.value     = element.value;

  // Wait 1.5s
  this.TIMEOUT   = 1200;

  // Event handlers

  this.onInput = function(evt) {
    if (this.composing)
      return;
    if (this._hasChanged()) {
      this._resetTimeout();
    }
  };

  this.onCompositionStart = function(evt) {
    // Wait until the composition ends before indicating a change
    this._clearTimeout();
    this.composing = true;
  };

  this.onCompositionEnd = function(evt) {
    this.composing = false;
    if (this._hasChanged()) {
      this._resetTimeout();
    }
  };

  this.onBlur = function(evt) {
    this._clearTimeout();
    if (this._hasChanged()) {
      this._dispatchChange();
    }
  };

  // Register for events
  this.element.addEventListener('input', this.onInput.bind(this));
  this.element.addEventListener('compositionstart',
    this.onCompositionStart.bind(this));
  this.element.addEventListener('compositionend',
    this.onCompositionEnd.bind(this));
  this.element.addEventListener('blur', this.onBlur.bind(this));

  this.onTimeout = function(evt) {
    this.timeoutId = null;
    this._dispatchChange();
  };

  this._hasChanged = function() {
    return this.value !== element.value;
  };

  this._resetTimeout = function() {
    this._clearTimeout();
    this.timeoutId =
      window.setTimeout(this.onTimeout.bind(this), this.TIMEOUT);
  };

  this._clearTimeout = function() {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }
    this.timeoutId = null;
  };

  this._dispatchChange = function() {
    console.assert(this.timeoutId === null,
      "Dispatching a change while there are still timeouts waiting");
    this.onchange();
    // Update stored value
    this.value = element.value;
  };
}

// Changed handler
//   Send request
// On success
//   Store value passed and compare value passed with current value
//     If they are different AND return value and current value differ, set it

window.addEventListener('load',
  ManageWallController.init.bind(ManageWallController), false);
