/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Messages
 */

function MessageBox(screen)
{
  this.timeoutId    = null;
  this.screen       = screen instanceof HTMLElement
                    ? screen
                    : $('screen-' + screen) || $(screen);
  this.messageBlock = this.screen.querySelector('.message');
  this.textBlock    = this.messageBlock.querySelector('.messageText') ||
                      this.messageBlock;

  this.showError = function(key, args, timeout) {
    this._show(key, args, "error", timeout);
  };

  this.showInfo = function(key, args, timeout) {
    this._show(key, args, "info", timeout);
  };

  this.clear = function() {
    this.messageBlock.setAttribute('aria-hidden', 'true');
    this.messageBlock.classList.remove("error");
    this.messageBlock.classList.remove("info");
    this.textBlock.textContent = "";
    this._clearTimeout();
  };

  // Private helper functions

  this._show = function(key, args, className, timeout) {
    // Set message
    this.textBlock.textContent = this._translateKey(key, args);

    // Update classes
    this.messageBlock.classList.remove("error");
    this.messageBlock.classList.remove("info");
    this.messageBlock.classList.add(className);

    // Make visible
    this.messageBlock.setAttribute('aria-hidden', 'false');

    // Set timeout
    this._clearTimeout();
    if (timeout) {
      this.timeoutId =
        window.setTimeout(function() { this.clear() }.bind(this), timeout);
    }
  };

  this._translateKey = function(key, args) {
    // XXXl10n
    switch(key) {
      case 'timeout':
        return "接続できませんでした.";

      case 'duplicate-name':
        return "A wall with that title already exists.";

      case 'empty-name':
        // This can happen if for example the title is all whitespace.
        // The browser will consider the form to be filled in but the server
        // won't accept it.
        return "Name is empty";

      case 'parallel-change':
        return "Someone else has updated the session."
               + " Please confirm the updated session status.";

      case 'created-wall':
        return "Created wall '" + args + "'";

      case 'db-error':
      case 'design-not-found':
      case 'server-fail':
      case 'no-access':
      case 'send-fail':
      default:
        return "Something went wrong";
    }
  };

  this._clearTimeout = function() {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  };
};
