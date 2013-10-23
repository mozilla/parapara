/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

(function () {
  function init() {
      // Look for a current view
      var viewParam = getParam('view');
      if (viewParam)
        var currentView = document.querySelector('#' + viewParam);

      // If a current view is found, remove all other views
      if (currentView) {
        var views = document.querySelectorAll(".view");
        Array.prototype.forEach.call(views,
          function (view) {
            if (view !== currentView) {
              view.parentNode.removeChild(view);
            }
          });

        // Promote current view's viewBox / pAR to root
        var rootSVG = currentView.ownerSVGElement;
        rootSVG.appendChild(currentView);
        [ "viewBox", "preserveAspectRatio" ].forEach(
          function(attrName) {
            if (currentView.hasAttribute(attrName)) {
              rootSVG.setAttribute(attrName,
                                   currentView.getAttribute(attrName));
            }
          });
      } else {
        // Selection view -- remove all templates
        removeAllMatchingSelector("template");
      }

      // Update links so that they append to the parent
      if (parent) {
        var links = document.querySelectorAll("a");
        Array.prototype.forEach.call(links,
          function (link) {
            link.href.baseVal =
              parent.document.location.pathname + link.href.baseVal;
          });
      }
  }

  function getParam(name) {
      name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
      var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
          results = regex.exec(location.search);
      return results == null
             ? null
             : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  function removeAllMatchingSelector(selector) {
    var matches = document.querySelectorAll(selector);
    Array.prototype.forEach.call(matches,
      function (match) {
          match.parentNode.removeChild(match);
        });
  }

  window.addEventListener("load", init);
})();
