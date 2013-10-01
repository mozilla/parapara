/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define([ 'jquery', 'wall/wall' ],
function ($, Wall) {
  return function (wallName, view)
  {
    this.initialize = function() {
      // Check for support
      if (!window.SVGAnimateElement) {
        showError("This browser does not support SVG animation.");
        return;
      }
      if (!window.EventSource) {
        showError("This browser does not support event streaming.");
        return;
      }

      // Look up wall
      if (!wallName) {
        showError("No wall specified");
        return;
      }
      var url = '/api/walls/byname/' + wallName;
      var wall, design;
      $.get(url)
        .then(function(data) {
          if (data.error_key || !data.designId) {
            showError("Couldn't load wall");
            console.log(data);
            return;
          }
          wall = data;

          // Fetch designs
          return $.get('/api/designs');
        })
        .then(function(designs) {
          if (designs.error_key) {
            showError("Couldn't load wall");
            console.log(designs);
            return;
          }
          // Find the design for this wall
          var result =
            $.grep(designs, function(d) { return d.designId == wall.designId;});
          if (result.length !== 1) {
            showError("Couldn't load wall");
            console.log(designs);
            return;
          }
          design = result[0];
          if (!design.wall) {
            showError("Couldn't load wall");
            console.log(design);
            return;
          }

          // Update window title
          document.title = wall.name;

          // Start loading wall design
          var iframe = $("iframe");
          iframe.attr('src', design.wall);
          iframe[0].addEventListener("load", function() {
            initWall(wall, design, iframe[0]);
          });
        })
        .fail(function() {
          showError("Couldn't find wall");
        });
    }

    // XXX i10n
    function showError(msg) {
      $("div.error").text(msg).show();
    }

    function initWall(wallData, designData, iframe) {
      // We have a default implementation of a Wall controller but specific
      // walls can override this by defining an initialize method on the
      // document to which we pass the default implementation so that they can
      // selectively override the methods they care about
      wallProto = Wall;
      if (iframe.contentDocument.initialize) {
        wallProto =
          iframe.contentDocument.initialize(Wall, wallData, designData, $) ||
          Wall;
      }
      var wall = new wallProto(iframe.contentDocument, wallData);

      // Set up data
      // XXX Test 'view' and call the appropriate API endpoint
      var wallStream =
        new EventSource('/api/walls/byname/' + wallName + '/live');
      wallStream.onerror = function(e) {
        console.log("Dropped connection?");
      };

      // Map to wall callbacks
      wallStream.addEventListener("sync-progress", function(e) {
        wall.syncProgress(parseFloat(e.data));
      });
      wallStream.addEventListener("start-session",
        wall.startSession.bind(wall));
      wallStream.addEventListener("add-character", function(e) {
        wall.addCharacter(JSON.parse(e.data));
      });
      wallStream.addEventListener("remove-character", function(e) {
        wall.removeCharacter(parseInt(e.data));
      });
      wallStream.addEventListener("change-duration", function(e) {
        wall.changeDuration(parseFloat(e.data));
      });
      wallStream.addEventListener("change-design", function(e) {
        window.location.reload(true);
      });
      // XXX Fill out the rest of the methods
    }
  };
});
