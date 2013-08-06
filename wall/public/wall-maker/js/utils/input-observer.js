/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// A generic input observer for form controls that have a lot of change events
// (This is needed in part because Gecko and Blink seem to treat input and
//  change events in almost the opposite way, at least for input type=range so
//  we can't easily tell when the user has finished making a change)
define([ ],
function () {
  return function (oninput, onchange)
  {
    // The element to observe
    var element = null;

    // Store current value so we can tell when the field actually changed
    var storedValue;

    // Fallback timeout
    // We have this in case there's some input method other than a keyboard or
    // mouse being used and we fail to notice the change.
    var timeoutId = null;
    var TIMEOUT = 3000;

    // This object
    var observer = this;

    // Public API
    this.resetStoredValue = function() {
      storedValue = element.value;
    };

    this.observeElement = function(newElement) {
      if (element === newElement)
        return;

      // Unregister from old element
      if (element) {
        clearTimeout();
        element.observer = null;
        element.removeEventListener('input', onSomething);
        element.removeEventListener('change', onSomething);
        element.removeEventListener('blur', onFinish);
        element.removeEventListener('keyup', onFinish);
        element.removeEventListener('mouseup', onFinish);
        element = null;
      }

      // Register with new element
      if (newElement) {
        element = newElement;
        element.observer = this;
        element.addEventListener('input', onSomething);
        element.addEventListener('change', onSomething);
        element.addEventListener('blur', onFinish);
        element.addEventListener('keyup', onFinish);
        element.addEventListener('mouseup', onFinish);
        this.resetStoredValue();
      }
    };

    // Event handlers
    function onSomething(evt) {
      if (oninput) {
        oninput();
      }
      if (hasChanged()) {
        resetTimeout();
      }
    };

    function onFinish(evt) {
      clearTimeout();
      if (hasChanged()) {
        dispatchChange();
      }
    };

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
      if (onchange) {
        onchange(element);
      }
      observer.resetStoredValue();
    };
  };
});
