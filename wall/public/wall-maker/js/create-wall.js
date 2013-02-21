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

var CreateWallController =
{
  start: function() {
    this.clearAll();
  },

  show: function() {
    this.showErrors();
  },

  cancel: function() {
    Navigation.goToScreen("./");
    this.clearAll();
  },

  create: function() {
    this.clearError();
    // XXX Show loading screen
    // Send request
    var payload = CreateWallForm.getFormValues();
    ParaPara.postRequest(WallMaker.rootUrl + '/api/createWall', payload,
                         this.createSuccess.bind(this),
                         this.createError.bind(this));
  },

  createSuccess: function(response) {
    // XXX Error handling
    if (typeof response.wallId !== "number") {
      this.setError("Made the wall but hey...");
    }

    var id = response.wallId;
    this.clearAll();
    updateWalls();
    sessionStorage.setItem("messageKey", "create-wall-success");
    Navigation.goToScreen("wall/" + id + "#event");
  },

  createError: function(key, detail) {
    // XXX Translate error messages
    this.setError("Something went wrong.");
  },

  clearAll: function() {
    this.clearError();
    CreateWallForm.clearAll();
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

var CreateWallForm =
{
  _form: null,

  init: function() {
    this.designSelector =
      new WallMaker.GraphicalRadioGroup(this.form, 'design');
  },

  clearAll: function() {
    this.form.reset();
  },

  verify: function(page) {
    // XXX
    return true;
  },

  getFormValues: function() {
    var result = {};
    result.title = this.form.eventName.value;
    result.design = this.getRadioValue('design');
    return result;
  },

  getRadioValue: function(name) {
    var radio = this.form[name];
    for (var i = 0; i < radio.length; i++) {
      if (radio[i].checked)
        return radio[i].value;
    }
    return null;
  },

  get form() {
    if (!this._form) {
      this._form = document.forms['createWall'];
    }
    return this._form;
  },
};

window.addEventListener('load',
  CreateWallForm.init.bind(CreateWallForm), false);
