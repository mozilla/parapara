/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var LoginController =
{
  Login: null,

  init: function() {
    this.Login = new ParaPara.Login('WMSESSID',
                                    this.loggedIn.bind(this),
                                    this.loggedOut.bind(this),
                                    this.loginError.bind(this),
                                    { siteName: 'パラパラアニメーション' });
  },

  relogin: function() {
    this.Login.relogin();
  },

  login: function() {
    $('loginError').setAttribute('aria-hidden', 'true');
    this.Login.login();
  },

  logout: function() {
    this.Login.logout();
    // Clear all state so that even if the user goes back through the history
    // they won't be able to see the contents of the forms etc. of the previous
    // user.
    //
    // We do this here and not in loggedOut since we can arrive at loggedOut due
    // to a timeout and not a deliberate request to clear everything.
    //
    // XXX Clear list of walls
    $('loginMail').textContent = '';
    CreateWallController.clearAll();
    sessionStorage.clear();
  },

  // This is a quick check if we are logged in based on if we have a session
  // cookie. It doesn't query the server to see if the cookie is valid--we do
  // that on page load when we call relogin.
  isLoggedIn: function() {
    return this.Login.haveSessionCookie();
  },

  loggedIn: function(email) {
    $('loginMail').textContent = email;
    $('loginStatus').setAttribute('aria-hidden', 'false');
    Navigation.goToCurrentScreen();
    updateWalls();
  },

  loggedOut: function() {
    $('loginStatus').setAttribute('aria-hidden', 'true');
    Navigation.showScreen('loggedOut');
  },

  loginError: function() {
    var errorBlock = $('loginError');
    errorBlock.textContent = "Login failed. Please try again.";
    errorBlock.setAttribute('aria-hidden', 'false');
  },
};
LoginController.init();
