/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var ManageWallController =
{
  init: function() {
    // Automatically save changes to text fields
    var saveTextField = function(elem, saver) {
      this.saveValue(elem.name, elem.value,
        function (changedFields) {
          saver.showSaveSuccess(changedFields[elem.name]);
        },
        function (key, detail) {
          saver.showSaveError();
        }
      );
    }.bind(this);
    [ "manage-name" ].forEach(
      function(id) {
        var textBox = $(id);

        // Find container node
        var container = textBox;
        while (container && container.classList &&
               !container.classList.contains("withIcon"))
          container = container.parentNode;
        if (!container)
          container = textBox;

        // Create the saver wrapper
        textBox.saver = new TextBoxSaver(textBox, container, saveTextField);
      }
    );

    // Register handlers for different sections
    this.initWallLinks();
    this.initSessions();
    this.initDesigns();

    // Register additional clean-up handlers
    this.form.addEventListener('reset', function() {
      this.wallId = null;
      this.updateThumbnail();
      this.messageBox.clear();
    }.bind(this));

    // Catch submission attempts
    this.form.addEventListener("submit",
      function(evt) { evt.preventDefault(); });
  },

  clear: function() {
    this.form.reset();
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

    // Set default tab is none is provided
    tabName = tabName || "session";

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

  get designSelection() {
    return this.form.querySelector('.designSelection');
  },

  loadSuccess: function(response, tabName) {
    // It doesn't make sense to show errors when we change wall
    this.messageBox.clear();

    // Update form fields
    this.updateWallInfo(response);

    // Switch to appropriate tab
    this.selectTab(tabName);

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
    var nameField = $("manage-name");
    nameField.value = wall.name;
    nameField.saver.clearStatus();
    nameField.size = Math.max(20, wall.name.length);

    // Set thumbnail
    this.updateThumbnail(wall.thumbnail);

    // Make up links
    this.updateWallLinks(wall.wallUrl, wall.editorUrl, wall.editorUrlShort);
    this.setEditUrlFormState('view');

    // Sessions
    this.updateSessionInfo(wall.latestSession);

    // Design
    this.updateDesign(wall.designId, wall.defaultDuration);
    $("manage-duration").value = wall.duration == null
                               ? ""
                               : wall.duration/1000;

    // Gallery
    var radios = document.getElementsByName("manage-galleryDisplay");
    if (wall.galleryDisplay == 0) {
      radios[0].checked = false;
      radios[1].checked = true;
    } else {
      radios[0].checked = true;
      radios[1].checked = false;
    }
    $("manage-eventDescr").value = wall.eventDescr;

    // Location
    $("manage-eventLocation").value = wall.eventLocation;

    // Access
    var dummypasscode = "";
    for (var i = 0; i < wall.passcodeLen; i++) {
      dummypasscode += "x";
    }
    $("manage-passcode").value = dummypasscode;

    // Characters
  },

  updateThumbnail: function(url) {
    var container = $('wall-thumbnail');

    // Empty container
    while (container.hasChildNodes())
      container.removeChild(container.lastChild);

    if (!url)
      return;

    // Create image
    var img = document.createElement('img');
    img.setAttribute("src", url);
    container.appendChild(img);
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
   * Wall urls
   */
  initWallLinks: function() {
    // Set up form
    $('editWallUrl').addEventListener('click',
      function() { this.setEditUrlFormState('edit'); }.bind(this));
    $('cancelSaveWallUrl').addEventListener('click',
      function() { this.setEditUrlFormState('view'); }.bind(this));
    $('saveWallUrl').addEventListener('click',
      this.saveWallUrl.bind(this));
    $('wallPath').addEventListener('keydown',
      function(evt) {
        if (evt.which == 10 || evt.which == 13) {
          evt.preventDefault();
          this.saveWallUrl();
        }
      }.bind(this));
    $('showEditorUrlQrCode').addEventListener('click',
      this.showQrCode.bind(this));
    $('qrCode').querySelector('button').addEventListener('click',
        function() {
          document.querySelector('div.overlay').
            setAttribute('aria-hidden', 'true');
        }
      );

    // Clear on reset
    this.form.addEventListener('reset', function() {
      this.updateWallLinks('', '', null);
    }.bind(this));
  },

  updateWallLinks: function(wallUrl, editorUrl, editorShortUrl) {
    // Update wall link
    $('wallUrl').setAttribute('href', wallUrl);
    $('wallUrl').textContent = decodeURIComponent(wallUrl);

    // Update wall path fields
    var splitPoint = wallUrl.lastIndexOf('/') + 1;
    var basePath = wallUrl.slice(0, splitPoint);
    var wallPath = decodeURIComponent(wallUrl.slice(splitPoint));
    $('wallUrlBase').textContent = basePath;
    $('wallPath').value = wallPath;
    $('wallPath').size = Math.max(wallPath.length, 10);

    // Show appropriate controls for wall URL
    $('wallUrlViewControls').removeAttribute('aria-hidden');
    $('wallUrlSaveControls').setAttribute('aria-hidden', 'true');

    // Update main editor link
    $('editorUrl').setAttribute('href', editorUrl);
    $('editorUrl').textContent = decodeURIComponent(editorUrl);

    // Show short link if available
    var shortEditorLink = $('shortEditorUrl');
    if (editorShortUrl) {
      shortEditorLink.setAttribute('href', editorShortUrl);
      shortEditorLink.textContent = editorShortUrl;
      $('shortEditorUrlBlock').removeAttribute('aria-hidden');
    } else {''
      $('shortEditorUrlBlock').setAttribute('aria-hidden', 'true');
      shortEditorLink.removeAttribute('href');
      shortEditorLink.textContent = '';
    }
  },

  // States: view, edit, send, error
  setEditUrlFormState: function(state) {
    // Look up the pieces
    var link    = $('wallUrl');
    var form    = $('wallUrlEdit');
    var textbox = $('wallPath');

    // Show form vs link
    if (state === 'view') {
      form.setAttribute('aria-hidden', 'true');
      link.removeAttribute('aria-hidden');
    } else {
      link.setAttribute('aria-hidden', 'true');
      form.removeAttribute('aria-hidden');
    }

    // Update state of text box
    form.classList.remove('withIcon');
    form.classList.remove('sending');
    form.classList.remove('error');
    textbox.removeAttribute('disabled');
    if (state === 'send') {
      form.classList.add('withIcon');
      form.classList.add('sending');
      textbox.setAttribute('disabled', 'disabled');
    } else if (state === 'error') {
      form.classList.add('error');
    }

    // Update controls
    $('wallUrlViewControls').setAttribute('aria-hidden', 'true');
    $('wallUrlSaveControls').setAttribute('aria-hidden', 'true');
    if (state === 'view') {
      $('wallUrlViewControls').removeAttribute('aria-hidden');
    } else if (state === 'edit' || state === 'error') {
      $('wallUrlSaveControls').removeAttribute('aria-hidden');
    }

    // Focus
    if (state === 'edit' || state === 'error') {
      textbox.focus();
      textbox.select();
    }
  },

  saveWallUrl: function() {
    // Update form
    this.setEditUrlFormState('send');

    // Save
    this.saveValue('urlPath', $('wallPath').value,
      function(changedFields) {
        if (changedFields && changedFields.length !== 0) {
          this.updateWallLinks(changedFields['wallUrl'],
                               changedFields['editorUrl'],
                               changedFields['editorUrlShort']);
        } else {
          this.messageBox.clear();
        }
        this.setEditUrlFormState('view');
      }.bind(this),
      function (key, detail) {
        this.setEditUrlFormState('error');
      }.bind(this)
    );
  },

  showQrCode: function(url) {
    var url = $('shortEditorUrl').href;

    // Prepare QR code
    var qr = new QRCode(0, QRCode.QRErrorCorrectLevel.M);
    qr.addData(url);
    qr.make();
    var imageData = qr.getImage(8 /*cell size*/);

    // Update overlay
    var block = $('qrCode');
    var image = block.querySelector('img');
    image.src    = imageData.data;
    image.width  = imageData.width;
    image.height = imageData.height;
    image.alt    = url;
    block.querySelector('.link').textContent = url;

    // And show
    document.querySelector('div.overlay').removeAttribute('aria-hidden');
  },

  /*
   * Session management
   */
  initSessions: function() {
    // Watch session buttons
    $('manage-startSession').addEventListener('click',
      this.startSession.bind(this));
    $('manage-endSession').addEventListener('click',
      this.endSession.bind(this));

    // Restore on reset
    this.form.addEventListener('reset',
      function() { this.updateSessionInfo(); }.bind(this)
    );
  },

  startSession: function() {
    this.startUpdateSessionInfo();
    ParaPara.postUrl('/api/walls/' + this.wallId + '/sessions',
      {sessionId: this.sessionId},
      this.updateSessionInfo.bind(this),
      this.handleSessionError.bind(this)
    );
  },

  endSession: function() {
    this.startUpdateSessionInfo();
    ParaPara.putUrl('/api/walls/' + this.wallId + '/sessions/' + this.sessionId,
      null,
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
    } else if (key == 'logged-out') {
      LoginController.logout();
    } else {
      this.restoreSessionInfo();
    }
    this.messageBox.showError(key, detail, timeout);
  },

  startUpdateSessionInfo: function() {
    this.messageBox.clear();
    document.querySelector(".wallStatus").classList.add("updating");
    // Remember our state in case we need to restore it
    this.sessionStatus = $("manage-endSession").disabled
                       ? 'finished'
                       : 'running';
    // Disable buttons to avoid double-click
    $("manage-startSession").disabled = true;
    $("manage-endSession").disabled = true;
  },

  restoreSessionInfo: function() {
    // Restore button state
    $("manage-startSession").disabled = false;
    $("manage-endSession").disabled = this.sessionStatus == 'finished';
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
      $("manage-endSession").disabled = true;
      this.sessionId = session.id;
    } else if (session && session.start) {
      // Open session
      statusBlock.classList.remove('finished');
      time.textContent = ParaPara.toLocalDate(session.start) + ' 開始';
      currentStatus.textContent = '公開中';
      statusBlock.classList.add('running');
      $("manage-endSession").disabled = false;
      this.sessionId = session.id;
    } else {
      // No session
      statusBlock.classList.remove('finished');
      statusBlock.classList.remove('running');
      time.textContent = '--';
      currentStatus.textContent = '未発';
      $("manage-endSession").disabled = true;
      this.sessionId = null;
    }
    document.querySelector(".wallStatus").classList.remove("updating");
  },

  /*
   * Design management
   */
  initDesigns: function() {
    // Listen for changes--need to re-register every time the design selection
    // gets re-generated
    this.designSelection.addEventListener('create',
      function(evt) {
        var radios = evt.target.radios;
        for (var i = 0; i < radios.length; i++) {
          radios[i].addEventListener('change',
            this.saveDesign.bind(this), false);
        }
      }.bind(this)
    );

    // Clear default duration on form reset
    this.form.addEventListener('reset',
      function() {
        $("manage-defaultDuration").textContent = "";
      }
    );
  },

  updateDesign: function(designId, designDuration) {
    // Update radio button
    this.designSelection.value = designId;
    this.designSelection.oldValue = designId;

    // Update default duration
    $("manage-defaultDuration").textContent = designDuration / 1000;
  },

  saveDesign: function() {
    // Update UI
    var selection = this.designSelection;
    selection.classList.add('sending');

    // Save
    this.saveValue('designId', selection.value,
      function(changedFields) {
        this.updateDesign(changedFields.designId,
                          changedFields.defaultDuration);
        this.updateThumbnail(changedFields.thumbnail);
      }.bind(this),
      function (key, detail) {
        selection.value = selection.oldValue;
      },
      function () {
        selection.classList.remove('sending');
      }
    );
  },

  /*
   * Utility methods
   */

  // Common utility to save a value
  //   field    - the field name
  //   value    - the value to save
  //   success  - function to call on success
  //   error    - function to call on success (not called in the case of logout)
  //   _finally - function to call in either case
  saveValue: function(field, value, success, error, _finally) {
    // Check we have a wall--this can happen when, for example a save function
    // is triggered by a loss of focus when we are logging out
    if (this.wallId === null)
      return;

    // Clear any lingering error messages
    this.messageBox.clear();

    // Send change
    var payload = {};
    payload[field] = value;
    ParaPara.putUrl('/api/walls/' + this.wallId,
      payload,
      // Success
      function (changedFields) {
        this.messageBox.showInfo('updated-field', field, 1800);
        if (success)
          success(changedFields);
        if (_finally)
          _finally();
        if (field == 'name' || field == 'designId') {
          UserData.updateWalls();
        }
      }.bind(this),
      // Error
      function (key, detail) {
        if (key === 'logged-out') {
          LoginController.logout();
        } else {
          this.messageBox.showError(key, detail);
          if (error)
            error(key, detail);
        }
        if (_finally)
          _finally();
      }.bind(this)
    );
  }
};

// A wrapper for a text input that tells you when the contents have changed for
// things like auto-saving.
//
// Features:
//  - It batches notifications so it won't notify on every keystroke but only
//    after the user has stopped typing for a while
//  - It doesn't notify about changes when the user is doing an IME composition
//    since that's really temporary state, not something you want to save.
//  - If the field loses focus it sends the change immediately
//  - It tells you when editing starts (so you update the display to tell the
//    user, "I'm waiting for you to stop typing so I can save")
//  - It catches Enter presses and triggers a change (rather than submitting the
//    form) which is normally what you want for the sort of application where
//    you're saving automatically.
function TextBoxObserver(element, onchange, onstartediting)
{
  this.timeoutId      = null;
  this.composing      = false;
  this.firstEdit      = true;
  this.element        = element;
  this.onchange       = onchange;
  this.onstartediting = onstartediting;

  // Store current value so we can tell when the field actually changed
  // (Especially when using an IME, the input event alone does not actually
  //  indicate a change to the field's value)
  this.value = element.value;

  // Wait 1.2s
  this.TIMEOUT = 1200;

  // Event handlers

  this.onInput = function(evt) {
    if (this.composing)
      return;
    if (this._hasChanged()) {
      this._resetTimeout();
      this._maybeDispatchStartEditing();
    }
  };

  this.onCompositionStart = function(evt) {
    // Wait until the composition ends before indicating a change
    this._clearTimeout();
    this.composing = true;
    this._maybeDispatchStartEditing();
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

  this.onKeyDown = function(evt) {
    if (evt.which == 10 || evt.which == 13) {
      evt.preventDefault();
      // Basically, behave the same as blur here, i.e. send the change
      // notification immediately
      this.onBlur(evt);
    }
  }

  // Register for events
  this.element.addEventListener('input', this.onInput.bind(this));
  this.element.addEventListener('compositionstart',
    this.onCompositionStart.bind(this));
  this.element.addEventListener('compositionend',
    this.onCompositionEnd.bind(this));
  this.element.addEventListener('blur', this.onBlur.bind(this));
  this.element.addEventListener('keydown', this.onKeyDown.bind(this));

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
    this.onchange(this.element);
    // Update stored value
    this.value = this.element.value;
    this.firstEdit = true;
  };

  this._maybeDispatchStartEditing = function() {
    if (this.firstEdit) {
      this.onstartediting(this.element);
    }
    this.firstEdit = false;
  };
}

function TextBoxSaver(element, container, saveCallback) {
  this.element      = element;
  this.container    = container;
  this.saveCallback = saveCallback;
  this.savedValue   = null;

  this.onchange = function(elem) {
    // Update container styles
    this.clearStatus();
    this.container.classList.add("sending");

    // Store saved value so we know if we can safely update it later
    this.savedValue = this.element.value;

    // Call
    this.saveCallback(this.element, this);
  };

  this.onstartediting = function(elem) {
    // Update container styles
    this.clearStatus();
    this.container.classList.add("editing");

    // Clear the saved value
    // (This will prevent us from overwriting the value, if, for example we're
    // in the middle of an IME composition)
    this.savedValue = null;
  };

  this.showSaveSuccess = function(setValue) {
    // Sometimes the setValue will be different to the value we passed to
    // saveCallback. This can happen, for example, if the server trimmed the
    // string and passed back the trimmed result.
    //
    // Here we overwrite the field value if the set values differs from the one
    // we saved but only if it hasn't changed in the meantime.
    if (typeof setValue !== "undefined" &&
        setValue !== this.savedValue &&
        this.savedValue === this.element.value) {
      this.element.value = setValue;
    }
    this.savedValue = null;

    // Update container styles (but only if we haven't already started editing
    // again)
    if (!this.container.classList.contains("editing")) {
      this.clearStatus();
      this.container.classList.add("saved");
    }
  };

  this.showSaveError = function() {
    // Update container style (but only if we haven't already started editing
    // again)
    if (!this.container.classList.contains("editing")) {
      this.clearStatus();
      this.container.classList.add("error");
    }
  };

  this.clearStatus = function() {
    this.container.classList.remove("saved");
    this.container.classList.remove("sending");
    this.container.classList.remove("editing");
    this.container.classList.remove("error");
  };

  // Observe the text field
  new TextBoxObserver(this.element,
                      this.onchange.bind(this),
                      this.onstartediting.bind(this));
}

window.addEventListener('load',
  ManageWallController.init.bind(ManageWallController), false);
