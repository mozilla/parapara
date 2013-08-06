/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

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
define([ ],
function () {
  return function (onchange, onstartediting)
  {
    var timeoutId = null,
        composing = false,
        firstEdit = true,
        element   = null,

        // Store current value so we can tell when the field actually changed
        // (Especially when using an IME, the input event alone does not
        //  actually indicate a change to the field's value)
        storedValue;

    // Wait 1.2s
    var TIMEOUT = 1200;

    // Public API
    this.observeElement = function(newElement) {
      if (element === newElement)
        return;

      // Unregister from old element
      if (element) {
        element.removeEventListener('input', onInput);
        element.removeEventListener('compositionstart', onCompositionStart);
        element.removeEventListener('compositionend', onCompositionEnd);
        element.removeEventListener('blur', onBlur);
        element.removeEventListener('keydown', onKeyDown);

        clearTimeout();
        storedValue = null;
        element = null;
      }

      // Register with new element
      if (newElement) {
        element     = newElement;
        storedValue = element.value;
        composing   = false;
        firstEdit   = true;

        // Register for events
        element.addEventListener('input', onInput);
        element.addEventListener('compositionstart', onCompositionStart);
        element.addEventListener('compositionend', onCompositionEnd);
        element.addEventListener('blur', onBlur);
        element.addEventListener('keydown', onKeyDown);
      }
    };

    // Event handlers
    function onInput(evt) {
      if (composing)
        return;
      if (hasChanged()) {
        resetTimeout();
        maybeDispatchStartEditing();
      }
    };

    function onCompositionStart(evt) {
      // Wait until the composition ends before indicating a change
      clearTimeout();
      composing = true;
      maybeDispatchStartEditing();
    };

    function onCompositionEnd(evt) {
      composing = false;
      if (hasChanged()) {
        resetTimeout();
      }
    };

    function onBlur(evt) {
      clearTimeout();
      if (hasChanged()) {
        dispatchChange();
      }
    };

    function onKeyDown(evt) {
      if (evt.which == 10 || evt.which == 13) {
        evt.preventDefault();
        // Basically, behave the same as blur here, i.e. send the change
        // notification immediately
        onBlur(evt);
      }
    }

    function onTimeout(evt) {
      timeoutId = null;
      dispatchChange();
    };

    function hasChanged() {
      return storedValue !== element.value;
    };

    function resetTimeout() {
      clearTimeout();
      timeoutId = window.setTimeout(onTimeout, TIMEOUT);
    };

    function clearTimeout() {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = null;
    };

    function dispatchChange() {
      console.assert(timeoutId === null,
        "Dispatching a change while there are still timeouts waiting");
      onchange(element);
      // Update stored value
      storedValue = element.value;
      firstEdit = true;
    };

    function maybeDispatchStartEditing() {
      if (firstEdit) {
        onstartediting(element);
      }
      firstEdit = false;
    };
  };
});
