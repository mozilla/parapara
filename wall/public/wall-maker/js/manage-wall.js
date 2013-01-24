/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Note that the create wall wizard operates quite differently to the manage
 * wall feature.
 *
 * With the wizard, we create a new history entry each time you go backwards or
 * forwards. Hence, you can use the back/forwards buttons to navigate the
 * wizard. This matches the linear flow of the wizard.
 *
 * However, the URL does not change. It is always wall-maker/new. This is
 * because it doesn't make sense to provide a link to mid-way through a wizard.
 * We remember the current page using session storage so that if the user
 * refreshes during the wizard, we return to the correct page.
 *
 * The manage wall feature on the other hand does not create history entries but
 * DOES update the URL because it makes sense to be able to point to an
 * individual tab in the interface with a URL but you don't want to generate
 * millions of history entries every time you change tab. Restoring the correct
 * tab when you refresh the browser is managed by using document.location.hash.
 */

var ManageWallController =
{
  show: function(wallId) {
    this.clearAllMessage();
    this.wallId = wallId;
    this.installObserver("manage-eventName");
    this.installObserver("manage-eventDescr");
    this.installObserver("manage-eventLocation");
    this.installObserver("manage-duration");
    this.installObserver("manage-passcode");
    this.installObserver("manage-galleryDisplay");
    this.installObserver("manage-designId");

    this.installClickObserver("manage-startSession", this.clickOnStartSession.bind(this));
    this.installClickObserver("manage-closeSession", this.clickOnCloseSession.bind(this));

    //ui
    new WallMaker.GraphicalRadioGroup(document.forms["manage-designId"], "manage-designId");

    //ここで ajax アクセスして、基本情報をとる
    var payload = {wallId: wallId};
    ParaPara.postRequest(WallMaker.rootUrl + '/api/getWall', payload,
                         this.loadSuccess.bind(this),
                         this.loadError.bind(this));
  },

  clearAllMessage: function() {
    var elements = document.getElementsByClassName("manage-message");
    for (var i = 0; i < elements.length; i++) {
      elements[i].textContent = "";
    }
  },
  
  clickOnStartSession: function(e) {
    this.sendCommand(WallMaker.rootUrl + '/api/startSession', {wallId: this.wallId}, document.getElementById("manage-startSession-message"));
  },
  
  clickOnCloseSession: function(e) {
    this.sendCommand(WallMaker.rootUrl + '/api/closeSession', {wallId: this.wallId}, document.getElementById("manage-closeSession-message"));
  },

  installClickObserver: function(name, callbackFunction) {
    var element = document.getElementById(name);
    element.removeEventListener("click", callbackFunction, false);
    element.addEventListener("click", callbackFunction, false);
  },

  installObserver: function(name) {
    var element = document.getElementById(name);
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
    var messageElement = document.getElementById(id+"-message");
    this.sendCommand(WallMaker.rootUrl + '/api/updateWall', payload,
                     messageElement);
  },
  
  sendCommand: function(url, payload, messageElement) {
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
  
  loadSuccess: function(response) {
    document.getElementById("manage-eventName").value = response.eventName;
    document.getElementById("manage-eventDescr").value = response.eventDescr;
    document.getElementById("manage-eventLocation").value = response.eventLocation;
    document.getElementById("manage-duration").value = response.duration == null ? "" : response.duration/1000;
    var dummypasscode = "";
    for (var i = 0; i < response.passcode; i++) {
      dummypasscode += "x";
    }
    document.getElementById("manage-passcode").value = dummypasscode;
    document.getElementById("manage-urlPath").textContent = response.urlPath;
    document.getElementById("manage-shortUrl").textContent = response.shortUrl;
    document.getElementById("manage-editorShortUrl").textContent = response.editorShortUrl;
    document.getElementById("manage-defaultDuration").textContent = response.defaultDuration/1000;
    var radios = document.getElementsByName("manage-galleryDisplay");
    if (response.galleryDisplay == 0) {
      radios[0].checked = false;
      radios[1].checked = true;
    } else {
      radios[0].checked = true;
      radios[1].checked = false;
    }
  },
  
  loadError: function(key, detail) {
    // XXX Translate error messages
    this.setError("Something went wrong.");
  },

  showErrors: function(msg) {
    var error = sessionStorage.getItem('create-error');
    var errorBlock = document.getElementById('create-error');
    if (error) {
      errorBlock.innerHTML = error;
      errorBlock.classList.remove("hidden");
    } else {
      errorBlock.classList.add("hidden");
    }
  },

  setError: function(msg) {
    sessionStorage.setItem('create-error', msg);
    this.showErrors();
  },

  clearError: function() {
    sessionStorage.removeItem('create-error');
    this.showErrors();
  },
};
