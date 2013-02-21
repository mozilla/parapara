/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var ManageWallController =
{
  init: function() {
    // Manage tab changing
    var tablinks = document.querySelectorAll("a[aria-role=tab]");
    for (var i = 0; i < tablinks.length; i++) {
      tablinks[i].addEventListener("click",
        function(e) {
          // Select the tab
          var tabName = e.target.getAttribute("href").substr(1);
          ManageWallController.selectTab(tabName);

          // Update URL
          history.replaceState({}, null, "#" + tabName);

          // Don't follow the link
          e.preventDefault();
        },
        false
      );
    }

    // Create graphical radio buttons
    new WallMaker.GraphicalRadioGroup(
      document.forms["manage-designId"], "manage-designId");

    // Watch for changes to fields so we can update immediately
    // XXX Rewrite this
    this.installObserver("manage-eventName");
    this.installObserver("manage-eventDescr");
    this.installObserver("manage-eventLocation");
    this.installObserver("manage-duration");
    this.installObserver("manage-passcode");
    this.installObserver("manage-galleryDisplay");
    this.installObserver("manage-designId");

    this.installClickObserver("manage-startSession",
      this.clickOnStartSession.bind(this));
    this.installClickObserver("manage-closeSession",
      this.clickOnCloseSession.bind(this));
  },

  show: function(wallId, tabName) {
    this.wallId = wallId;

    // Show loading screen
    $("wall-info").setAttribute("aria-hidden", "true");
    $("wall-loading").setAttribute("aria-hidden", "false");

    // ここで ajax アクセスして、基本情報をとる
    var payload = { wallId: wallId };
    ParaPara.postRequest(WallMaker.rootUrl + '/api/getWall', payload,
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

  clickOnStartSession: function(e) {
    this.sendCommand(WallMaker.rootUrl + '/api/startSession',
      {wallId: this.wallId},
      $("manage-startSession-message"));
  },

  clickOnCloseSession: function(e) {
    this.sendCommand(WallMaker.rootUrl + '/api/closeSession',
      {wallId: this.wallId},
      $("manage-closeSession-message"));
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
    ParaPara.postRequest(url, payload,
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
    $("manage-eventName").value = response.eventName;
    $("manage-eventDescr").value = response.eventDescr;
    $("manage-eventLocation").value = response.eventLocation;
    $("manage-duration").value = response.duration == null ? "" : response.duration/1000;
    var dummypasscode = "";
    for (var i = 0; i < response.passcode; i++) {
      dummypasscode += "x";
    }
    $("manage-passcode").value = dummypasscode;
    $("manage-urlPath").textContent = response.urlPath;
    $("manage-shortUrl").textContent = response.shortUrl;
    $("manage-editorShortUrl").textContent = response.editorShortUrl;
    $("manage-defaultDuration").textContent = response.defaultDuration/1000;
    var radios = document.getElementsByName("manage-galleryDisplay");
    if (response.galleryDisplay == 0) {
      radios[0].checked = false;
      radios[1].checked = true;
    } else {
      radios[0].checked = true;
      radios[1].checked = false;
    }

    // Switch to appropriate tab
    if (tabName) {
      this.selectTab(tabName);
    }

    // Hide loading and show page
    $("wall-loading").setAttribute("aria-hidden", "true");
    $("wall-info").setAttribute("aria-hidden", "false");
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
  }
};

window.addEventListener('load',
  ManageWallController.init.bind(ManageWallController), false);
