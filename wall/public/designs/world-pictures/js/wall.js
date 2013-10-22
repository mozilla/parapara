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
        console.log($('template', doc));
        $('template', doc).remove();
      }

      // Update links to append to parent URL
      // (This allows us to reload the page and have the selection stick)
      if (parent) {
        var links = doc.querySelectorAll("a");
        var parentPath = parent.document.location.pathname;
        Array.prototype.forEach.call(links,
          function(link) {
            if (link.href.baseVal && link.href.baseVal[0] == '#') {
              link.href.baseVal = parentPath + link.href.baseVal;
            }
          });
      }

      // If there are changes to the hash, reload since we will probably have
      // discarded the bit of the document we're supposed to be showing
      window.addEventListener("hashchange",
        function() { window.location.reload(); });

      this._super(doc, wallData);
    }
  });

  return WorldPictureWall;
}

document.initialize = initialize;
