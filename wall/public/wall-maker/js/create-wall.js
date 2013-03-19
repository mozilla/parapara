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

  cancel: function() {
    Navigation.goToScreen("./");
    this.clearAll();
  },

  create: function() {
    // Clear error messages
    this.clearError();

    // Show loading screen
    Navigation.showScreen("screen-loading");

    // Send request
    var payload = CreateWallForm.getFormValues();
    ParaPara.postUrl('/api/walls', payload,
                     this.createSuccess.bind(this),
                     this.createError.bind(this));
  },

  createSuccess: function(response) {
    if (typeof response.wallId !== "number") {
      console.debug("Got non-numerical wall id: " + response.wallId);
    }

    // Clear create wall form
    this.clearAll();

    // Trigger update to wall summary screen
    UserData.updateWalls();

    // Fill in fields of manage wall form using response
    ManageWallController.updateWallInfo(response);

    // Update the screen
    Navigation.goToScreen("wall/" + response.wallId + "#event");
  },

  createError: function(key, detail) {
    Navigation.showScreen("screen-new");

    // XXXl10n: hook this up to our localization
    switch(key) {
      case 'duplicate-name':
        msg = "A wall with that title already exists.";
        break;

      case 'timeout':
        msg = "接続できませんでした.";
        break;

      case 'empty-name':
        // This can happen if for example the title is all whitespace.
        // The browser will consider the form to be filled in but the server
        // won't accept it.
        msg = "Name is empty";
        break;

      case 'db-error':
      case 'design-not-found':
      case 'server-fail':
      case 'no-access':
      case 'send-fail':
      default:
        msg = "Something went wrong";
        break;
    }
    this.showError(msg);
  },

  clearAll: function() {
    this.clearError();
    CreateWallForm.clearAll();
  },

  showError: function(msg) {
    var errorBlock = $('create-error');
    errorBlock.innerHTML = msg;
    errorBlock.setAttribute('aria-hidden', 'false');
  },

  clearError: function() {
    var errorBlock = $('create-error');
    errorBlock.setAttribute('aria-hidden', 'true');
    errorBlock.innerHTML = '';
  },
};

var CreateWallForm =
{
  _form: null,

  clearAll: function() {
    this.form.reset();
  },

  getFormValues: function() {
    var result = {};
    result.name = this.form.eventName.value;
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
