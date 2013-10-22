/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function initialize(Wall, wallData, design, $) {

  var WorldPictureWall = Wall.extend({
    init: function(doc, wallData) {
      // If a current view is selected, only show that part
      if (document.location.hash) {
        var currentView = document.querySelector(document.location.hash);
      }
      if (currentView) {
        // Remove all other views
        var views = document.querySelectorAll(".view");
        Array.prototype.forEach.call(views,
          function (view) {
            if (view !== currentView) {
              view.parentNode.removeChild(view);
            }
          });

        // Promote current view
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
        $('template', doc).remove();
      }

      window.addEventListener("hashchange",
        function() {
          // Sync local hash ref with that of the parent
          // (This allows us to reload the parent page and have the hash
          //  reference stick which is really useful for debugging but also if
          //  there are any problems)
          if (parent)
            parent.document.location.hash = document.location.hash;

          // If there are changes to the hash, reload since we will probably
          // have discarded the bit of the document we're supposed to be showing
          document.location.reload();
        });

      // Blink doesn't seem to update the document hash for local links in an
      // SVG file so we set a timeout to do it manually if it hasn't happened
      // already
      $("a", doc).on("click", function(evt) {
        var hash = evt.currentTarget.href.baseVal;
        window.setTimeout(function() {
          document.location.hash = hash;
        }, 500);
      });

      this._super(doc, wallData);
    }
  });

  return WorldPictureWall;
}

document.initialize = initialize;
